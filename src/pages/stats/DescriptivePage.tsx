import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDatasets } from './ImportPage';
import { descriptiveStats, correlation, DescriptiveResult } from '@/lib/statistics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 4 });

const StatRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`flex justify-between py-1.5 px-3 text-sm ${highlight ? 'bg-primary/5 font-medium' : ''}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-mono tabular-nums text-foreground">{value}</span>
  </div>
);

const DescriptivePage = () => {
  const datasets = useDatasets();
  const [dsIdx, setDsIdx] = useState<string>('0');
  const [varIdx, setVarIdx] = useState<string>('0');
  const [var2Idx, setVar2Idx] = useState<string>('__none__');

  const ds = datasets[Number(dsIdx)];
  const colData = useMemo(() => {
    if (!ds) return [];
    return ds.data.map(row => row[Number(varIdx)] ?? 0);
  }, [ds, varIdx]);

  const stats: DescriptiveResult | null = useMemo(() => {
    if (colData.length < 2) return null;
    return descriptiveStats(colData);
  }, [colData]);

  const corr = useMemo(() => {
    if (!ds || var2Idx === '__none__' || var2Idx === varIdx) return null;
    const col2 = ds.data.map(row => row[Number(var2Idx)] ?? 0);
    return correlation(colData, col2);
  }, [ds, colData, varIdx, var2Idx]);

  // Histogram data
  const histData = useMemo(() => {
    if (!stats || colData.length < 2) return [];
    const bins = Math.min(Math.ceil(Math.sqrt(colData.length)), 20);
    const width = stats.range / bins || 1;
    const hist: { bin: string; count: number }[] = [];
    for (let i = 0; i < bins; i++) {
      const lo = stats.min + i * width;
      const hi = lo + width;
      const count = colData.filter(v => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length;
      hist.push({ bin: `${fmt(lo)}`, count });
    }
    return hist;
  }, [colData, stats]);

  if (datasets.length === 0) return (
    <div className="animate-fade-in p-8 text-center text-muted-foreground">
      <p className="text-lg font-medium">Aucune donnée disponible</p>
      <p className="mt-1">Importez un jeu de données CSV depuis la page <a href="/stats/import" className="text-primary underline">Import</a></p>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistiques descriptives</h1>
        <p className="text-muted-foreground mt-1">Mesures de tendance centrale, dispersion, forme et corrélation</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Dataset</label>
            <Select value={dsIdx} onValueChange={v => { setDsIdx(v); setVarIdx('0'); setVar2Idx('__none__'); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{datasets.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Variable principale</label>
            <Select value={varIdx} onValueChange={setVarIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ds?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Variable 2 (corrélation)</label>
            <Select value={var2Idx} onValueChange={setVar2Idx}>
              <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune</SelectItem>
                {ds?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Tendance centrale & Position</h2>
            </div>
            <div className="divide-y divide-border/40">
              <StatRow label="N (observations)" value={String(stats.n)} highlight />
              <StatRow label="Moyenne" value={fmt(stats.mean)} />
              <StatRow label="Médiane" value={fmt(stats.median)} />
              <StatRow label="Mode" value={stats.mode !== null ? fmt(stats.mode) : '—'} />
              <StatRow label="Minimum" value={fmt(stats.min)} />
              <StatRow label="Maximum" value={fmt(stats.max)} />
              <StatRow label="Étendue" value={fmt(stats.range)} />
              <StatRow label="Q1 (25%)" value={fmt(stats.q1)} />
              <StatRow label="Q3 (75%)" value={fmt(stats.q3)} />
              <StatRow label="IQR" value={fmt(stats.iqr)} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Dispersion & Forme</h2>
            </div>
            <div className="divide-y divide-border/40">
              <StatRow label="Variance" value={fmt(stats.variance)} />
              <StatRow label="Écart-type" value={fmt(stats.stdDev)} highlight />
              <StatRow label="Coefficient de variation (%)" value={fmt(stats.cv)} />
              <StatRow label="Skewness (asymétrie)" value={fmt(stats.skewness)} />
              <StatRow label="Kurtosis (excès)" value={fmt(stats.kurtosis)} />
              {corr !== null && (
                <>
                  <StatRow label="Corrélation (Pearson)" value={fmt(corr)} highlight />
                  <StatRow label="R²" value={fmt(corr * corr)} />
                </>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">Distribution (Histogramme)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={histData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bin" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Fréquence" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DescriptivePage;
