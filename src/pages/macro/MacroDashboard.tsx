import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, TrendingUp, Landmark, Globe, Banknote, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MacroDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [anneeBase, setAnneeBase] = useState(2024);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('simulations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSimulations(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleCreate = async () => {
    if (!user || !nom.trim()) { toast.error('Veuillez saisir un nom'); return; }
    const { error } = await supabase.from('simulations').insert({
      user_id: user.id,
      nom: nom.trim(),
      description: description.trim() || null,
      annee_base: anneeBase,
      horizon: 3,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Simulation créée');
    setOpenCreate(false);
    setNom(''); setDescription('');
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('simulations').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Simulation supprimée');
    load();
  };

  const modules = [
    { key: 'pib', label: 'Secteur réel', icon: TrendingUp, color: 'text-accent' },
    { key: 'tofe', label: 'TOFE', icon: Landmark, color: 'text-primary' },
    { key: 'bdp', label: 'Balance des paiements', icon: Globe, color: 'text-warning' },
    { key: 'monetaire', label: 'Situation monétaire', icon: Banknote, color: 'text-success' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Cadrage macroéconomique</h1>
          <p className="text-sm text-muted-foreground mt-1">Simulations de cadrage sur 3 ans — Sénégal</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle simulation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une simulation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom</Label><Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Scénario de base 2025-2027" /></div>
              <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description optionnelle" /></div>
              <div><Label>Année de base</Label><Input type="number" value={anneeBase} onChange={e => setAnneeBase(Number(e.target.value))} /></div>
              <Button className="w-full" onClick={handleCreate}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {simulations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Aucune simulation</h2>
          <p className="text-sm text-muted-foreground mb-4">Créez votre première simulation de cadrage macroéconomique</p>
          <Button onClick={() => setOpenCreate(true)}><Plus className="w-4 h-4 mr-2" />Commencer</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {simulations.map(sim => (
            <Card key={sim.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{sim.nom}</CardTitle>
                    {sim.description && <CardDescription className="mt-1">{sim.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sim.statut === 'finalise' ? 'default' : 'secondary'}>
                      {sim.statut === 'finalise' ? 'Finalisé' : 'Brouillon'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sim.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Période : {sim.annee_base} — {sim.annee_base + (sim.horizon || 3) - 1}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {modules.map(mod => (
                    <button
                      key={mod.key}
                      onClick={() => navigate(`/macro/${sim.id}/${mod.key}`)}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
                    >
                      <mod.icon className={`w-4 h-4 ${mod.color} flex-shrink-0`} />
                      <span className="text-sm font-medium text-foreground truncate">{mod.label}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MacroDashboard;
