import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Exercices = () => {
  const { user } = useAuth();
  const [exercices, setExercices] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ libelle: '', date_debut: '', date_fin: '' });

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase.from('exercices').select('*').eq('user_id', user.id).order('date_debut', { ascending: false });
    setExercices(data || []);
  };

  useEffect(() => { fetch(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    const { error } = await supabase.from('exercices').insert({ ...form, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Exercice créé');
    setDialogOpen(false);
    setForm({ libelle: '', date_debut: '', date_fin: '' });
    fetch();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Exercices comptables</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nouvel exercice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel exercice comptable</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Libellé</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Exercice 2025" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date début</Label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
                <div><Label>Date fin</Label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
              </div>
              <Button onClick={handleAdd} className="w-full">Créer l'exercice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Libellé</TableHead>
              <TableHead className="w-36">Début</TableHead>
              <TableHead className="w-36">Fin</TableHead>
              <TableHead className="w-24">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercices.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun exercice. Créez votre premier exercice comptable.</TableCell></TableRow>
            ) : exercices.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.libelle}</TableCell>
                <TableCell className="font-mono text-sm">{new Date(e.date_debut).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell className="font-mono text-sm">{new Date(e.date_fin).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                  <Badge variant={e.cloture ? 'secondary' : 'default'}>{e.cloture ? 'Clôturé' : 'Ouvert'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Exercices;
