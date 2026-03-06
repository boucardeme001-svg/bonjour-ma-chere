import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDatasets } from './ImportPage';
import { linearRegression, multipleRegression } from '@/lib/statistics';
import { ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmt = (n: number, d = 4) => n.toLocaleString('fr-FR', { maximumFractionDigits: d });
const pSig = (p: number) => p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : p < 0.1 ? '.' : '';

const RegressionPage = () => {
  const datasets = useDatasets();
  const [dsIdx, setDsIdx] = useState('0');
  const [depVar, setDepVar] = useState('0');
  const [indepVars, setIndepVars] = useState<Set<number>>(new Set());

  const ds = datasets[Number(dsIdx)];

  const toggleVar = (idx: number) => {
    setIndepVars(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const result = useMemo(() => {
    if (!ds || indepVars.size === 0) return null;
    const y = ds.data.map(row => row[Number(depVar)] ?? 0);
    const xIdxs = Array.from(indepVars).sort();

    if (xIdxs.length === 1) {
      const x = ds.data.map(row => row[xIdxs[0]] ?? 0);
      const reg = linearRegression(x, y);
      return {
        type: 'simple' as const,
        reg,
        xLabels: [ds.headers[xIdxs[0]]],
        yLabel: ds.headers[Number(depVar)],
        xIdx: xIdxs[0],
        scatterData: ds.data.map((row, i) => ({ x: row[xIdxs[0]], y: row[Number(depVar)], predicted: reg.predicted[i] })),
      };
    }

    const X = ds.data.map(row => xIdxs.map(j => row[j] ?? 0));
    const reg = multipleRegression(X, y);
    return {
      type: 'multiple' as const,
      reg,
      xLabels: xIdxs.map(j => ds.headers[j]),
      yLabel: ds.headers[Number(depVar)],
      residualData: reg.residuals.map((r, i) => ({ obs: i + 1, residual: r, predicted: reg.predicted[i] })),
    };
  }, [ds, depVar, indepVars]);

  if (datasets.length === 0) return (
    <div className="animate-fade-in p-8 text-center text-muted-foreground">
      <p className="text-lg font-medium">Aucune donnée disponible</p>
      <p className="mt-1">Importez un jeu de données CSV depuis <a href="/stats/import" className="text-primary underline">Import</a></p>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Régression & Économétrie</h1>
        <p className="text-muted-foreground mt-1">Régression linéaire simple et multiple avec tests statistiques</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Dataset</label>
            <Select value={dsIdx} onValueChange={v => { setDsIdx(v); setDepVar('0'); setIndepVars(new Set()); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{datasets.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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

      {result && (
        <>
          {/* Model Summary */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Résumé du modèle</h2>
              <Badge variant="secondary">{result.type === 'simple' ? 'OLS Simple' : 'OLS Multiple'}</Badge>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'R²', value: fmt('reg' in result ? (result.type === 'simple' ? result.reg.rSquared : result.reg.rSquared) : 0) },
                { label: 'R² ajusté', value: fmt(result.type === 'simple' ? result.reg.adjustedR2 : result.reg.adjustedR2) },
                { label: 'F-stat', value: fmt(result.type === 'simple' ? result.reg.fStat : result.reg.fStat, 2) },
                { label: 'Durbin-Watson', value: fmt(result.type === 'simple' ? result.reg.durbinWatson : result.reg.durbinWatson, 3) },
                { label: 'Observations', value: String(result.type === 'simple' ? result.reg.n : result.reg.n) },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-lg font-bold font-mono text-foreground">{s.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Coefficients Table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Coefficients</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-2">Variable</th>
                    <th className="text-right px-4 py-2">Coefficient</th>
                    <th className="text-right px-4 py-2">Erreur std.</th>
                    <th className="text-right px-4 py-2">t-stat</th>
                    <th className="text-right px-4 py-2">p-value</th>
                    <th className="text-center px-4 py-2">Sig.</th>
                  </tr>
                </thead>
                <tbody>
                  {result.type === 'simple' ? (
                    <>
                      <tr className="border-b border-border/40">
                        <td className="px-4 py-2 text-muted-foreground">(Constante)</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.intercept)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.standardErrorIntercept)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.tStatIntercept, 3)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.pValueIntercept)}</td>
                        <td className="px-4 py-2 text-center">{pSig(result.reg.pValueIntercept)}</td>
                      </tr>
                      <tr className="border-b border-border/40 font-medium">
                        <td className="px-4 py-2">{result.xLabels[0]}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.slope)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.standardErrorSlope)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.tStatSlope, 3)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.pValueSlope)}</td>
                        <td className="px-4 py-2 text-center">{pSig(result.reg.pValueSlope)}</td>
                      </tr>
                    </>
                  ) : (
                    result.reg.coefficients.map((coef, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="px-4 py-2">{i === 0 ? '(Constante)' : result.xLabels[i - 1]}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(coef)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.standardErrors[i] ?? 0)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.tStats[i] ?? 0, 3)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(result.reg.pValues[i] ?? 1)}</td>
                        <td className="px-4 py-2 text-center">{pSig(result.reg.pValues[i] ?? 1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Signif. codes: *** 0.001 ** 0.01 * 0.05 . 0.1
            </div>
          </Card>

          {/* Charts */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">
              {result.type === 'simple' ? 'Nuage de points & Droite de régression' : 'Résidus vs Valeurs prédites'}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              {result.type === 'simple' ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="x" name={result.xLabels[0]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="y" name={result.yLabel} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Scatter data={result.scatterData} fill="hsl(var(--primary))" />
                  <Scatter data={result.scatterData.map(d => ({ x: d.x, y: d.predicted }))} fill="hsl(var(--destructive))" shape="cross" legendType="line" name="Droite" />
                </ScatterChart>
              ) : (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="predicted" name="Prédites" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="residual" name="Résidus" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Scatter data={result.residualData} fill="hsl(var(--primary))" />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
};

export default RegressionPage;
