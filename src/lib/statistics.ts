// ===== Statistiques descriptives =====

export interface DescriptiveResult {
  n: number;
  mean: number;
  median: number;
  mode: number | null;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  cv: number; // coefficient de variation
  skewness: number;
  kurtosis: number;
  q1: number;
  q3: number;
  iqr: number;
}

export function descriptiveStats(data: number[]): DescriptiveResult {
  const n = data.length;
  if (n === 0) return { n: 0, mean: 0, median: 0, mode: null, min: 0, max: 0, range: 0, variance: 0, stdDev: 0, cv: 0, skewness: 0, kurtosis: 0, q1: 0, q3: 0, iqr: 0 };

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

  // Mode
  const freq: Record<number, number> = {};
  data.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  const mode = maxFreq > 1 ? Number(Object.keys(freq).find(k => freq[Number(k)] === maxFreq)) : null;

  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);
  const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

  // Skewness (Fisher)
  const m3 = data.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n;
  const skewness = stdDev > 0 ? m3 : 0;

  // Kurtosis (excess)
  const m4 = data.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0) / n;
  const kurtosis = stdDev > 0 ? m4 - 3 : 0;

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  return { n, mean, median, mode, min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0], variance, stdDev, cv, skewness, kurtosis, q1, q3, iqr: q3 - q1 };
}

function quantile(sorted: number[], p: number): number {
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ===== Corrélation =====
export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom > 0 ? num / denom : 0;
}

// ===== Régression linéaire simple =====
export interface RegressionResult {
  intercept: number; // β0
  slope: number;     // β1
  rSquared: number;
  adjustedR2: number;
  standardErrorSlope: number;
  standardErrorIntercept: number;
  tStatSlope: number;
  tStatIntercept: number;
  pValueSlope: number;
  pValueIntercept: number;
  fStat: number;
  pValueF: number;
  residuals: number[];
  predicted: number[];
  n: number;
  sse: number; // sum squared errors
  ssr: number; // sum squared regression
  sst: number; // sum squared total
  durbinWatson: number;
}

export function linearRegression(x: number[], y: number[]): RegressionResult {
  const n = Math.min(x.length, y.length);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;

  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }

  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = my - slope * mx;

  const predicted = x.map(xi => intercept + slope * xi);
  const residuals = y.map((yi, i) => yi - predicted[i]);

  const ssr = predicted.reduce((s, p) => s + (p - my) ** 2, 0);
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const sst = syy;

  const rSquared = sst > 0 ? ssr / sst : 0;
  const adjustedR2 = n > 2 ? 1 - ((1 - rSquared) * (n - 1)) / (n - 2) : rSquared;

  const mse = sse / (n - 2 || 1);
  const standardErrorSlope = sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  const standardErrorIntercept = Math.sqrt(mse * (1 / n + mx ** 2 / sxx));

  const tStatSlope = standardErrorSlope > 0 ? slope / standardErrorSlope : 0;
  const tStatIntercept = standardErrorIntercept > 0 ? intercept / standardErrorIntercept : 0;

  // Approximate p-value using t-distribution (simplified)
  const pValueSlope = approxPValue(Math.abs(tStatSlope), n - 2);
  const pValueIntercept = approxPValue(Math.abs(tStatIntercept), n - 2);

  const msr = ssr / 1;
  const fStat = mse > 0 ? msr / mse : 0;
  const pValueF = approxPValueF(fStat, 1, n - 2);

  // Durbin-Watson
  let dwNum = 0;
  for (let i = 1; i < residuals.length; i++) {
    dwNum += (residuals[i] - residuals[i - 1]) ** 2;
  }
  const durbinWatson = sse > 0 ? dwNum / sse : 0;

  return { intercept, slope, rSquared, adjustedR2, standardErrorSlope, standardErrorIntercept, tStatSlope, tStatIntercept, pValueSlope, pValueIntercept, fStat, pValueF, residuals, predicted, n, sse, ssr, sst, durbinWatson };
}

// ===== Régression multiple =====
export interface MultipleRegressionResult {
  coefficients: number[];
  rSquared: number;
  adjustedR2: number;
  fStat: number;
  residuals: number[];
  predicted: number[];
  n: number;
  k: number;
  standardErrors: number[];
  tStats: number[];
  pValues: number[];
  durbinWatson: number;
}

export function multipleRegression(X: number[][], y: number[]): MultipleRegressionResult {
  const n = y.length;
  const k = X[0]?.length || 0;

  // Add intercept column
  const Xa = X.map(row => [1, ...row]);
  const p = k + 1;

  // Normal equations: (X'X)^-1 X'y
  const XtX = matMul(transpose(Xa), Xa);
  const Xty = matVecMul(transpose(Xa), y);
  const XtXinv = invertMatrix(XtX);

  if (!XtXinv) {
    return { coefficients: Array(p).fill(0), rSquared: 0, adjustedR2: 0, fStat: 0, residuals: y, predicted: Array(n).fill(0), n, k, standardErrors: [], tStats: [], pValues: [], durbinWatson: 0 };
  }

  const coefficients = matVecMul(XtXinv, Xty);
  const predicted = Xa.map(row => row.reduce((s, v, i) => s + v * coefficients[i], 0));
  const residuals = y.map((yi, i) => yi - predicted[i]);

  const my = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const ssr = sst - sse;

  const rSquared = sst > 0 ? ssr / sst : 0;
  const adjustedR2 = n > p ? 1 - ((1 - rSquared) * (n - 1)) / (n - p) : rSquared;

  const mse = sse / (n - p || 1);
  const fStat = k > 0 && mse > 0 ? (ssr / k) / mse : 0;

  // Standard errors of coefficients
  const standardErrors = XtXinv.map((row, i) => Math.sqrt(Math.abs(row[i]) * mse));
  const tStats = coefficients.map((b, i) => standardErrors[i] > 0 ? b / standardErrors[i] : 0);
  const pValues = tStats.map(t => approxPValue(Math.abs(t), n - p));

  let dwNum = 0;
  for (let i = 1; i < residuals.length; i++) dwNum += (residuals[i] - residuals[i - 1]) ** 2;
  const durbinWatson = sse > 0 ? dwNum / sse : 0;

  return { coefficients, rSquared, adjustedR2, fStat, residuals, predicted, n, k, standardErrors, tStats, pValues, durbinWatson };
}

// ===== Séries temporelles =====

// Moyenne mobile
export function movingAverage(data: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) { result.push(null); continue; }
    const slice = data.slice(i - window + 1, i + 1);
    result.push(slice.reduce((s, v) => s + v, 0) / window);
  }
  return result;
}

// Lissage exponentiel simple
export function exponentialSmoothing(data: number[], alpha: number): number[] {
  if (data.length === 0) return [];
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Lissage exponentiel double (Holt)
export function holtSmoothing(data: number[], alpha: number, beta: number): { level: number[]; trend: number[]; forecast: number[] } {
  if (data.length < 2) return { level: data, trend: [0], forecast: data };
  const level = [data[0]];
  const trend = [data[1] - data[0]];
  const forecast = [data[0]];

  for (let i = 1; i < data.length; i++) {
    level.push(alpha * data[i] + (1 - alpha) * (level[i - 1] + trend[i - 1]));
    trend.push(beta * (level[i] - level[i - 1]) + (1 - beta) * trend[i - 1]);
    forecast.push(level[i] + trend[i]);
  }
  return { level, trend, forecast };
}

// Taux de croissance
export function growthRates(data: number[]): (number | null)[] {
  return data.map((v, i) => i === 0 || data[i - 1] === 0 ? null : ((v - data[i - 1]) / Math.abs(data[i - 1])) * 100);
}

// Tendance linéaire
export function linearTrend(data: number[]): { slope: number; intercept: number; trendLine: number[] } {
  const x = data.map((_, i) => i);
  const reg = linearRegression(x, data);
  return { slope: reg.slope, intercept: reg.intercept, trendLine: reg.predicted };
}

// ===== Utilitaires matriciels =====
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

// Approximate p-value from t-distribution (rough, sufficient for display)
function approxPValue(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  return incompleteBeta(x, df / 2, 0.5);
}

function approxPValueF(f: number, d1: number, d2: number): number {
  if (d2 <= 0 || d1 <= 0) return 1;
  const x = d2 / (d2 + d1 * f);
  return incompleteBeta(x, d2 / 2, d1 / 2);
}

// Simplified incomplete beta (rough approximation)
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 1;
  if (x >= 1) return 0;
  // Use simple numerical approximation
  const steps = 200;
  let sum = 0;
  const dt = x / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * dt;
    sum += Math.pow(t, a - 1) * Math.pow(1 - t, b - 1) * dt;
  }
  const fullBeta = gamma(a) * gamma(b) / gamma(a + b);
  const p = sum / fullBeta;
  return Math.max(0, Math.min(1, 1 - p));
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

// Parse CSV data
export function parseCSV(text: string): { headers: string[]; data: number[][] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], data: [] };
  
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  const data: number[][] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(separator).map(v => {
      const cleaned = v.trim().replace(/^"|"$/g, '').replace(/\s/g, '').replace(',', '.');
      return Number(cleaned) || 0;
    });
    if (vals.some(v => !isNaN(v))) data.push(vals);
  }
  
  return { headers, data };
}
