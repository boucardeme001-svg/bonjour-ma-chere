import { Card } from '@/components/ui/card';
import { NavLink } from 'react-router-dom';
import { Calculator, ScatterChart, TrendingUp, Upload } from 'lucide-react';

const sections = [
  {
    to: '/stats/descriptive',
    icon: Calculator,
    title: 'Statistiques descriptives',
    description: 'Moyenne, médiane, écart-type, variance, skewness, kurtosis, quartiles, corrélation',
  },
  {
    to: '/stats/regression',
    icon: ScatterChart,
    title: 'Régression & Économétrie',
    description: 'Régression linéaire simple et multiple, R², tests t, F-stat, Durbin-Watson, p-values',
  },
  {
    to: '/stats/series',
    icon: TrendingUp,
    title: 'Séries temporelles',
    description: 'Tendance, moyenne mobile, lissage exponentiel simple et double (Holt), taux de croissance',
  },
  {
    to: '/stats/import',
    icon: Upload,
    title: 'Importer des données',
    description: 'Chargez un fichier CSV pour alimenter les analyses descriptives, régressions et séries',
  },
];

const StatsHome = () => (
  <div className="animate-fade-in space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-foreground">Module Statistiques</h1>
      <p className="text-muted-foreground mt-1">Analyse descriptive, inférentielle et économétrique de vos données</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(s => (
        <NavLink key={s.to} to={s.to}>
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-border hover:border-primary/30">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{s.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
              </div>
            </div>
          </Card>
        </NavLink>
      ))}
    </div>
  </div>
);

export default StatsHome;
