import { linearRegression, descriptiveStats } from './statistics';

// ===== Jarque-Bera normality test =====
export interface JarqueBeraResult {
  statistic: number;
  pValue: number;
  skewness: number;
  kurtosis: number;
  n: number;
  isNormal: boolean; // at 5% level
}

export function jarqueBeraTest(residuals: number[]): JarqueBeraResult {
  const stats = descriptiveStats(residuals);
  const n = stats.n;
  const S = stats.skewness;
  const K = stats.kurtosis; // excess kurtosis (already -3)
  
  const jb = (n / 6) * (S * S + (K * K) / 4);
  // Chi-squared with 2 df approximation
  const pValue = Math.exp(-jb / 2); // simplified chi2(2) survival
  
  return {
    statistic: jb,
    pValue: Math.min(1, Math.max(0, pValue)),
    skewness: S,
    kurtosis: K,
    n,
    isNormal: pValue > 0.05,
  };
}

// ===== White heteroscedasticity test =====
export interface WhiteTestResult {
  statistic: number; // n * R²
  pValue: number;
  rSquaredAux: number;
  df: number;
  n: number;
  isHomoscedastic: boolean;
}

export function whiteTest(X: number[][], residuals: number[]): WhiteTestResult {
  const n = residuals.length;
  const k = X[0]?.length || 0;
  
  // Squared residuals as dependent variable
  const e2 = residuals.map(r => r * r);
  
  // Build auxiliary regressors: original X, X², and cross-products
  const auxX: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    // Original variables
    for (let j = 0; j < k; j++) row.push(X[i][j]);
    // Squared terms
    for (let j = 0; j < k; j++) row.push(X[i][j] ** 2);
    // Cross products
    for (let j = 0; j < k; j++) {
      for (let l = j + 1; l < k; l++) {
        row.push(X[i][j] * X[i][l]);
      }
    }
    auxX.push(row);
  }
  
  const df = auxX[0]?.length || 1;
  
  // Simple R² of auxiliary regression using normal equations
  const rSquaredAux = computeR2(auxX, e2);
  const stat = n * rSquaredAux;
  
  // Chi-squared approximation
  const pValue = chiSquaredSurvival(stat, df);
  
  return {
    statistic: stat,
    pValue,
    rSquaredAux,
    df,
    n,
    isHomoscedastic: pValue > 0.05,
  };
}

// For simple regression convenience
export function whiteTestSimple(x: number[], residuals: number[]): WhiteTestResult {
  const X = x.map(v => [v]);
  return whiteTest(X, residuals);
}

// ===== Augmented Dickey-Fuller (ADF) test =====
export interface ADFResult {
  statistic: number;
  criticalValues: { '1%': number; '5%': number; '10%': number };
  lags: number;
  n: number;
  isStationary: boolean; // at 5% level
  interpretation: string;
}

export function adfTest(series: number[], maxLags?: number): ADFResult {
  const n = series.length;
  const lags = maxLags ?? Math.min(Math.floor(Math.pow(n - 1, 1 / 3)), 12);
  
  // First differences
  const dy: number[] = [];
  for (let i = 1; i < n; i++) dy.push(series[i] - series[i - 1]);
  
  // Lagged differences
  const effectiveN = dy.length - lags - 1;
  if (effectiveN < 5) {
    return {
      statistic: 0,
      criticalValues: { '1%': -3.43, '5%': -2.86, '10%': -2.57 },
      lags,
      n,
      isStationary: false,
      interpretation: 'Pas assez d\'observations pour le test ADF',
    };
  }
  
  const yDep: number[] = [];
  const xReg: number[][] = [];
  
  for (let t = lags + 1; t < dy.length; t++) {
    yDep.push(dy[t]);
    const row: number[] = [series[t]]; // lagged level y_{t-1}
    // Add lagged differences
    for (let j = 1; j <= lags; j++) {
      row.push(dy[t - j]);
    }
    xReg.push(row);
  }
  
  // Run OLS: Δy_t = α + γ*y_{t-1} + Σ β_j*Δy_{t-j} + ε_t
  // We need the t-stat on γ (first coefficient after intercept)
  const result = olsWithIntercept(xReg, yDep);
  const tStat = result.tStats[0] || 0; // t-stat on γ
  
  // MacKinnon critical values (approximate for constant, no trend)
  const criticalValues = { '1%': -3.43, '5%': -2.86, '10%': -2.57 };
  const isStationary = tStat < criticalValues['5%'];
  
  let interpretation: string;
  if (tStat < criticalValues['1%']) {
    interpretation = 'Série stationnaire (rejet H₀ à 1%)';
  } else if (tStat < criticalValues['5%']) {
    interpretation = 'Série stationnaire (rejet H₀ à 5%)';
  } else if (tStat < criticalValues['10%']) {
    interpretation = 'Faiblement stationnaire (rejet H₀ à 10%)';
  } else {
    interpretation = 'Série non-stationnaire (racine unitaire présente)';
  }
  
  return { statistic: tStat, criticalValues, lags, n, isStationary, interpretation };
}

// ===== Helper: OLS with intercept =====
function olsWithIntercept(X: number[][], y: number[]): { coefficients: number[]; tStats: number[] } {
  const n = y.length;
  const p = (X[0]?.length || 0) + 1;
  const Xa = X.map(row => [1, ...row]);
  
  const XtX = matMul(transpose(Xa), Xa);
  const Xty = matVecMul(transpose(Xa), y);
  const XtXinv = invertMatrix(XtX);
  
  if (!XtXinv) return { coefficients: Array(p).fill(0), tStats: Array(p).fill(0) };
  
  const coefficients = matVecMul(XtXinv, Xty);
  const predicted = Xa.map(row => row.reduce((s, v, i) => s + v * coefficients[i], 0));
  const residuals = y.map((yi, i) => yi - predicted[i]);
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const mse = sse / (n - p || 1);
  
  const standardErrors = XtXinv.map((row, i) => Math.sqrt(Math.abs(row[i]) * mse));
  const tStats = coefficients.map((b, i) => standardErrors[i] > 0 ? b / standardErrors[i] : 0);
  
  // Return t-stats excluding intercept (index 0 is intercept, index 1+ are X vars)
  return { coefficients: coefficients.slice(1), tStats: tStats.slice(1) };
}

// ===== Helper: compute R² =====
function computeR2(X: number[][], y: number[]): number {
  const n = y.length;
  const p = (X[0]?.length || 0) + 1;
  const Xa = X.map(row => [1, ...row]);
  
  const XtX = matMul(transpose(Xa), Xa);
  const Xty = matVecMul(transpose(Xa), y);
  const XtXinv = invertMatrix(XtX);
  
  if (!XtXinv) return 0;
  
  const coefficients = matVecMul(XtXinv, Xty);
  const predicted = Xa.map(row => row.reduce((s, v, i) => s + v * coefficients[i], 0));
  const residuals = y.map((yi, i) => yi - predicted[i]);
  
  const my = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  
  return sst > 0 ? 1 - sse / sst : 0;
}

// ===== Chi-squared survival function (approximate) =====
function chiSquaredSurvival(x: number, df: number): number {
  if (x <= 0) return 1;
  // Use incomplete gamma function approximation
  // P(X > x) = 1 - gammaIncomplete(df/2, x/2) / gamma(df/2)
  const a = df / 2;
  const z = x / 2;
  
  // Series expansion for lower incomplete gamma
  let sum = 0;
  let term = 1 / a;
  sum = term;
  for (let k = 1; k < 200; k++) {
    term *= z / (a + k);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  const lowerGamma = Math.pow(z, a) * Math.exp(-z) * sum;
  const fullGamma = gamma(a);
  const p = fullGamma > 0 ? lowerGamma / fullGamma : 0;
  return Math.max(0, Math.min(1, 1 - p));
}

// ===== Matrix utilities (duplicated to keep module independent) =====
function transpose(m: number[][]): number[][] {
  return m[0].map((_, i) => m.map(row => row[i]));
}

function matMul(a: number[][], b: number[][]): number[][] {
  return a.map(row => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
}

function matVecMul(m: number[][], v: number[]): number[] {
  return m.map(row => row.reduce((s, val, i) => s + val * v[i], 0));
}

function invertMatrix(m: number[][]): number[][] | null {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    if (Math.abs(aug[i][i]) < 1e-12) return null;
    const pivot = aug[i][i];
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = aug[k][i];
      for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
    }
  }
  return aug.map(row => row.slice(n));
}

function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
