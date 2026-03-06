import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BookOpen, BarChart3, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ comptes: 0, ecritures: 0, journaux: 0, exercices: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [comptes, ecritures, journaux, exercices] = await Promise.all([
        supabase.from('comptes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('ecritures').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('journaux').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('exercices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setStats({
        comptes: comptes.count || 0,
        ecritures: ecritures.count || 0,
        journaux: journaux.count || 0,
        exercices: exercices.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const cards = [
    { label: 'Comptes', value: stats.comptes, icon: BookOpen, desc: 'Plan comptable SYSCOHADA' },
    { label: 'Écritures', value: stats.ecritures, icon: FileText, desc: 'Écritures saisies' },
    { label: 'Journaux', value: stats.journaux, icon: BarChart3, desc: 'Journaux actifs' },
    { label: 'Exercices', value: stats.exercices, icon: AlertCircle, desc: 'Exercices comptables' },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="page-header mb-6">Tableau de bord</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="stat-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bienvenue sur SysCompta</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Votre logiciel de comptabilité conforme au plan SYSCOHADA révisé, adapté au Sénégal.</p>
          <p>Commencez par :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Créer un <strong>exercice comptable</strong></li>
            <li>Initialiser votre <strong>plan comptable</strong> SYSCOHADA</li>
            <li>Configurer vos <strong>journaux</strong> (achats, ventes, banque, caisse...)</li>
            <li>Saisir vos <strong>écritures comptables</strong></li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
