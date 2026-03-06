import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useDatasets } from './ImportPage';
import { movingAverage, exponentialSmoothing, holtSmoothing, growthRates, linearTrend } from '@/lib/statistics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmt = (n: number | null) => n !== null ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—';

const TimeSeriesPage = () => {
  const datasets = useDatasets();
  const [dsIdx, setDsIdx] = useState('0');
  const [varIdx, setVarIdx] = useState('0');
  const [timeIdx, setTimeIdx] = useState('0');
  const [maWindow, setMaWindow] = useState(3);
  const [alpha, setAlpha] = useState(0.3);
  const [beta, setBeta] = useState(0.1);

  const ds = datasets[Number(dsIdx)];

  const analysis = useMemo(() => {
    if (!ds) return null;
    const data = ds.data.map(row => row[Number(varIdx)] ?? 0);
    const timeLabels = ds.data.map(row => String(row[Number(timeIdx)] ?? 0));

    const ma = movingAverage(data, maWindow);
    const es = exponentialSmoothing(data, alpha);
    const holt = holtSmoothing(data, alpha, beta);
    const growth = growthRates(data);
    const trend = linearTrend(data);

    const chartData = data.map((v, i) => ({
      period: timeLabels[i],
      original: v,
      ma: ma[i],
      lissage: es[i],
      holt: holt.forecast[i],
      tendance: trend.trendLine[i],
      croissance: growth[i],
    }));

    return { chartData, trend, data, growth };
  }, [ds, varIdx, timeIdx, maWindow, alpha, beta]);

  if (datasets.length === 0) return (
    <div className="animate-fade-in p-8 text-center text-muted-foreground">
      <p className="text-lg font-medium">Aucune donnée disponible</p>
      <p className="mt-1">Importez un jeu de données CSV depuis <a href="/stats/import" className="text-primary underline">Import</a></p>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Séries temporelles</h1>
        <p className="text-muted-foreground mt-1">Tendance, lissage, moyenne mobile et taux de croissance</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Dataset</label>
            <Select value={dsIdx} onValueChange={v => { setDsIdx(v); setVarIdx('0'); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{datasets.map((d, i) => <SelectItem key={i} value={String(i)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Variable temps</label>
            <Select value={timeIdx} onValueChange={setTimeIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ds?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Variable à analyser</label>
            <Select value={varIdx} onValueChange={setVarIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ds?.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Fenêtre MA : {maWindow}</label>
            <Slider value={[maWindow]} onValueChange={v => setMaWindow(v[0])} min={2} max={10} step={1} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">α (lissage) : {alpha.toFixed(2)}</label>
            <Slider value={[alpha * 100]} onValueChange={v => setAlpha(v[0] / 100)} min={5} max={95} step={5} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">β (tendance Holt) : {beta.toFixed(2)}</label>
            <Slider value={[beta * 100]} onValueChange={v => setBeta(v[0] / 100)} min={5} max={95} step={5} />
          </div>
        </div>
      </Card>

      {analysis && (
        <>
          {/* Trend info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground">Pente tendance</div>
              <div className="text-lg font-bold font-mono text-foreground">{fmt(analysis.trend.slope)}</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground">Ordonnée origine</div>
              <div className="text-lg font-bold font-mono text-foreground">{fmt(analysis.trend.intercept)}</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground">Croissance moy.</div>
              <div className="text-lg font-bold font-mono text-foreground">
                {fmt(analysis.growth.filter(g => g !== null).reduce((s, g) => s! + g!, 0)! / (analysis.growth.filter(g => g !== null).length || 1))}%
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground">Observations</div>
              <div className="text-lg font-bold font-mono text-foreground">{analysis.data.length}</div>
            </Card>
          </div>

          {/* Main chart */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">Série originale, Lissages & Tendance</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analysis.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="original" stroke="hsl(var(--primary))" strokeWidth={2} name="Données" dot />
                <Line type="monotone" dataKey="ma" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" name={`MA(${maWindow})`} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="lissage" stroke="hsl(var(--warning))" strokeWidth={1.5} name={`Exp. (α=${alpha})`} dot={false} />
                <Line type="monotone" dataKey="holt" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="3 3" name="Holt" dot={false} />
                <Line type="monotone" dataKey="tendance" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="8 4" name="Tendance" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Growth rates chart */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-3">Taux de croissance (%)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analysis.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="croissance" stroke="hsl(var(--primary))" strokeWidth={2} name="Croissance (%)" dot />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Data table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Tableau de résultats</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left px-4 py-2">Période</th>
                    <th className="text-right px-4 py-2">Original</th>
                    <th className="text-right px-4 py-2">MA({maWindow})</th>
                    <th className="text-right px-4 py-2">Lissage exp.</th>
                    <th className="text-right px-4 py-2">Holt</th>
                    <th className="text-right px-4 py-2">Tendance</th>
                    <th className="text-right px-4 py-2">Croissance %</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.chartData.map((row, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                      <td className="px-4 py-1.5 font-medium">{row.period}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmt(row.original)}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmt(row.ma)}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmt(row.lissage)}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmt(row.holt)}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmt(row.tendance)}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmt(row.croissance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default TimeSeriesPage;
