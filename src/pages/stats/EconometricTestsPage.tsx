import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDatasets } from './ImportPage';
import { linearRegression, multipleRegression } from '@/lib/statistics';
import { jarqueBeraTest, whiteTestSimple, whiteTest, adfTest } from '@/lib/econometric-tests';
import type { JarqueBeraResult, WhiteTestResult, ADFResult } from '@/lib/econometric-tests';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const fmt = (n: number, d = 4) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });

const StatusIcon = ({ ok }: { ok: boolean }) =>
  ok ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-destructive" />;

const EconometricTestsPage = () => {
  const datasets = useDatasets();
  const [dsIdx, setDsIdx] = useState('0');
  const [depVar, setDepVar] = useState('0');
  const [indepVars, setIndepVars] = useState<Set<number>>(new Set());
  const [adfVarIdx, setAdfVarIdx] = useState('0');

  const ds = datasets[Number(dsIdx)];

  const toggleVar = (idx: number) => {
    setIndepVars(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // Regression-based tests (JB + White)
  const regressionTests = useMemo(() => {
    if (!ds || indepVars.size === 0) return null;
    const y = ds.data.map(row => row[Number(depVar)] ?? 0);
    const xIdxs = Array.from(indepVars).sort();

    let residuals: number[];
    let X: number[][];

    if (xIdxs.length === 1) {
      const x = ds.data.map(row => row[xIdxs[0]] ?? 0);
      const reg = linearRegression(x, y);
      residuals = reg.residuals;
      X = x.map(v => [v]);
    } else {
      X = ds.data.map(row => xIdxs.map(j => row[j] ?? 0));
      const reg = multipleRegression(X, y);
      residuals = reg.residuals;
    }

    const jb = jarqueBeraTest(residuals);
    const white = xIdxs.length === 1
      ? whiteTestSimple(ds.data.map(row => row[xIdxs[0]] ?? 0), residuals)
      : whiteTest(X, residuals);

    return { jb, white, xLabels: xIdxs.map(j => ds.headers[j]) };
  }, [ds, depVar, indepVars]);

  // ADF test
  const adfResult = useMemo<ADFResult | null>(() => {
    if (!ds) return null;
    const series = ds.data.map(row => row[Number(adfVarIdx)] ?? 0);
    if (series.length < 10) return null;
    return adfTest(series);
  }, [ds, adfVarIdx]);

  if (datasets.length === 0) return (
    <div className="animate-fade-in p-8 text-center text-muted-foreground">
      <p className="text-lg font-medium">Aucune donnée disponible</p>
      <p className="mt-1">Importez un jeu de données depuis <a href="/stats/import" className="text-primary underline">Import</a></p>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tests Économétriques Avancés</h1>
        <p className="text-muted-foreground mt-1">Jarque-Bera, White, Dickey-Fuller augmenté</p>
      </div>

      {/* Dataset selection */}
      <Card className="p-4">
        <div className="min-w-[200px] max-w-xs">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Dataset</label>
          <Select value={dsIdx} onValueChange={v => { setDsIdx(v); setDepVar('0'); setIndepVars(new Set()); setAdfVarIdx('0'); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{datasets.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      {/* ===== ADF Section ===== */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Test de stationnarité — Dickey-Fuller Augmenté (ADF)</h2>
          <Badge variant="outline">Séries temporelles</Badge>
        </div>
        <div className="p-4 space-y-4">
          <div className="max-w-xs">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Variable à tester</label>
            <Select value={adfVarIdx} onValueChange={setAdfVarIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ds?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {adfResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StatusIcon ok={adfResult.isStationary} />
                <span className="font-medium text-foreground">{adfResult.interpretation}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Statistique ADF" value={fmt(adfResult.statistic, 3)} />
                <StatBox label="Valeur critique 1%" value={fmt(adfResult.criticalValues['1%'], 2)} />
                <StatBox label="Valeur critique 5%" value={fmt(adfResult.criticalValues['5%'], 2)} />
                <StatBox label="Valeur critique 10%" value={fmt(adfResult.criticalValues['10%'], 2)} />
                <StatBox label="Retards (lags)" value={String(adfResult.lags)} />
                <StatBox label="Observations" value={String(adfResult.n)} />
              </div>
              <p className="text-xs text-muted-foreground">
                H₀ : La série possède une racine unitaire (non-stationnaire). Rejet si stat ADF &lt; valeur critique.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Minimum 10 observations requises
            </p>
          )}
        </div>
      </Card>

      {/* ===== Regression tests config ===== */}
      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Configuration de la régression (pour tests JB & White)</h3>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Variable dépendante (Y)</label>
            <Select value={depVar} onValueChange={setDepVar}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ds?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {ds && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Variables indépendantes (X)</label>
            <div className="flex flex-wrap gap-3">
              {ds.headers.map((h, i) => i !== Number(depVar) && (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={indepVars.has(i)} onCheckedChange={() => toggleVar(i)} />
                  {h}
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      {regressionTests && (
        <>
          {/* Jarque-Bera */}
          <TestCard
            title="Test de normalité des résidus — Jarque-Bera"
            badge="Normalité"
            ok={regressionTests.jb.isNormal}
            okLabel="Résidus normaux"
            koLabel="Résidus non-normaux"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Statistique JB" value={fmt(regressionTests.jb.statistic, 3)} />
              <StatBox label="p-value" value={fmt(regressionTests.jb.pValue)} />
              <StatBox label="Skewness" value={fmt(regressionTests.jb.skewness, 3)} />
              <StatBox label="Kurtosis (excess)" value={fmt(regressionTests.jb.kurtosis, 3)} />
              <StatBox label="Observations" value={String(regressionTests.jb.n)} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              H₀ : Les résidus suivent une distribution normale. Rejet si p-value &lt; 0.05.
            </p>
          </TestCard>

          {/* White */}
          <TestCard
            title="Test d'hétéroscédasticité — White"
            badge="Homoscédasticité"
            ok={regressionTests.white.isHomoscedastic}
            okLabel="Homoscédasticité (variance constante)"
            koLabel="Hétéroscédasticité détectée"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox label="Statistique (nR²)" value={fmt(regressionTests.white.statistic, 3)} />
              <StatBox label="p-value" value={fmt(regressionTests.white.pValue)} />
              <StatBox label="R² auxiliaire" value={fmt(regressionTests.white.rSquaredAux)} />
              <StatBox label="Degrés de liberté" value={String(regressionTests.white.df)} />
              <StatBox label="Observations" value={String(regressionTests.white.n)} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              H₀ : Homoscédasticité (variance constante des résidus). Rejet si p-value &lt; 0.05.
            </p>
          </TestCard>
        </>
      )}

      {!regressionTests && indepVars.size === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>Sélectionnez au moins une variable indépendante pour exécuter les tests Jarque-Bera et White.</p>
        </Card>
      )}
    </div>
  );
};

// ===== Reusable sub-components =====

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-bold font-mono text-foreground">{value}</div>
  </div>
);

const TestCard = ({ title, badge, ok, okLabel, koLabel, children }: {
  title: string; badge: string; ok: boolean; okLabel: string; koLabel: string; children: React.ReactNode;
}) => (
  <Card className="overflow-hidden">
    <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h2>
      <Badge variant="outline">{badge}</Badge>
    </div>
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <StatusIcon ok={ok} />
        <span className="font-medium text-foreground">{ok ? okLabel : koLabel}</span>
      </div>
      {children}
    </div>
  </Card>
);

export default EconometricTestsPage;
