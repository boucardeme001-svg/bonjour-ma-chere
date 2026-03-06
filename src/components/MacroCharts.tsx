import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Indicateur, evalFormule } from '@/lib/macro-indicators';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const COLORS = [
  'hsl(210, 70%, 45%)',   // primary blue
  'hsl(165, 50%, 40%)',   // accent green
  'hsl(38, 90%, 50%)',    // warning orange
  'hsl(0, 65%, 50%)',     // destructive red
  'hsl(270, 50%, 55%)',   // purple
  'hsl(195, 80%, 45%)',   // cyan
];

interface MacroChartsProps {
  indicateurs: Indicateur[];
  annees: number[];
  getDisplayVal: (ind: Indicateur, annee: number) => number;
}

const MacroCharts = ({ indicateurs, annees, getDisplayVal }: MacroChartsProps) => {
  const categories = useMemo(() => [...new Set(indicateurs.map(i => i.categorie))], [indicateurs]);

  // For each category, build chart data
  const charts = useMemo(() => {
    return categories.map(cat => {
      const catIndicateurs = indicateurs.filter(i => i.categorie === cat);
      // Only chart key indicators (skip sub-items starting with spaces)
      const chartInds = catIndicateurs.filter(i => !i.libelle.startsWith('  '));

      if (chartInds.length === 0) return null;

      const hasPercentage = chartInds.some(i => i.unite === 'pourcentage');
      const hasMilliards = chartInds.some(i => i.unite === 'milliards');
      const allPercentage = chartInds.every(i => i.unite === 'pourcentage');

      const data = annees.map(annee => {
        const point: Record<string, any> = { annee: annee.toString() };
        chartInds.forEach(ind => {
          point[ind.code] = getDisplayVal(ind, annee);
        });
        return point;
      });

      // Check if there's any non-zero data
      const hasData = data.some(d => chartInds.some(ind => d[ind.code] !== 0));
      if (!hasData) return null;

      // Use bar chart for milliards values, line chart for percentages/indices
      const useBarChart = hasMilliards && !allPercentage;

      return { cat, chartInds, data, useBarChart, allPercentage };
    }).filter(Boolean);
  }, [categories, indicateurs, annees, getDisplayVal]);

  if (charts.length === 0) return null;

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider px-1">
        📊 Projections graphiques
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map((chart) => {
          if (!chart) return null;
          const { cat, chartInds, data, useBarChart, allPercentage } = chart;

          return (
            <Card key={cat} className="p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">{cat}</h3>
              <ResponsiveContainer width="100%" height={260}>
                {useBarChart ? (
                  <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="annee" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmt} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        const ind = chartInds.find(i => i.code === name);
                        const suffix = ind?.unite === 'pourcentage' ? '%' : ind?.unite === 'milliards' ? ' Mds' : '';
                        return [`${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${suffix}`, ind?.libelle || name];
                      }}
                    />
                    <Legend
                      formatter={(value: string) => chartInds.find(i => i.code === value)?.libelle || value}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                    {chartInds.map((ind, idx) => (
                      <Bar
                        key={ind.code}
                        dataKey={ind.code}
                        fill={COLORS[idx % COLORS.length]}
                        radius={[4, 4, 0, 0]}
                        opacity={ind.type === 'calcul' ? 0.9 : 0.7}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="annee" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}${allPercentage ? '%' : ''}`} />
                    {allPercentage && <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        const ind = chartInds.find(i => i.code === name);
                        const suffix = ind?.unite === 'pourcentage' ? '%' : ind?.unite === 'milliards' ? ' Mds' : '';
                        return [`${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${suffix}`, ind?.libelle || name];
                      }}
                    />
                    <Legend
                      formatter={(value: string) => chartInds.find(i => i.code === value)?.libelle || value}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                    {chartInds.map((ind, idx) => (
                      <Line
                        key={ind.code}
                        dataKey={ind.code}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={ind.type === 'calcul' ? 3 : 2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        strokeDasharray={ind.type === 'calcul' ? undefined : '5 5'}
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MacroCharts;
