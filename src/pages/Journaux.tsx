import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const TYPES_JOURNAUX = [
  { value: 'achat', label: 'Achats' },
  { value: 'vente', label: 'Ventes' },
  { value: 'banque', label: 'Banque' },
  { value: 'caisse', label: 'Caisse' },
  { value: 'operations_diverses', label: 'Opérations diverses' },
  { value: 'a_nouveau', label: 'À nouveau' },
];

const Journaux = () => {
  const { user } = useAuth();
  const [journaux, setJournaux] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', type: 'achat' });

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase.from('journaux').select('*').eq('user_id', user.id).order('code');
    setJournaux(data || []);
  };

  useEffect(() => { fetch(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    const { error } = await supabase.from('journaux').insert({ ...form, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Journal créé');
    setDialogOpen(false);
    setForm({ code: '', libelle: '', type: 'achat' });
    fetch();
  };

  const handleInitialize = async () => {
    if (!user) return;
    const defaults = [
      { code: 'AC', libelle: 'Journal des achats', type: 'achat', user_id: user.id },
      { code: 'VE', libelle: 'Journal des ventes', type: 'vente', user_id: user.id },
      { code: 'BQ', libelle: 'Journal de banque', type: 'banque', user_id: user.id },
      { code: 'CA', libelle: 'Journal de caisse', type: 'caisse', user_id: user.id },
      { code: 'OD', libelle: 'Opérations diverses', type: 'operations_diverses', user_id: user.id },
      { code: 'AN', libelle: 'À nouveau', type: 'a_nouveau', user_id: user.id },
    ];
    const { error } = await supabase.from('journaux').insert(defaults);
    if (error) { toast.error(error.message); return; }
    toast.success('Journaux initialisés');
    fetch();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Journaux comptables</h1>
        <div className="flex gap-2">
          {journaux.length === 0 && <Button variant="outline" onClick={handleInitialize}>Initialiser les journaux</Button>}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nouveau journal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau journal</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="AC" maxLength={5} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES_JOURNAUX.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Libellé</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Journal des achats" /></div>
                <Button onClick={handleAdd} className="w-full">Créer le journal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-40">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journaux.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun journal. Cliquez sur "Initialiser les journaux".</TableCell></TableRow>
            ) : journaux.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-mono font-semibold text-primary">{j.code}</TableCell>
                <TableCell>{j.libelle}</TableCell>
                <TableCell className="capitalize">{TYPES_JOURNAUX.find(t => t.value === j.type)?.label || j.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Journaux;
