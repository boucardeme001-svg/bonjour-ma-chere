import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LigneForm {
  compte_id: string;
  libelle: string;
  debit: string;
  credit: string;
}

const SaisieEcritures = () => {
  const { user } = useAuth();
  const [exercices, setExercices] = useState<any[]>([]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [ecritures, setEcritures] = useState<any[]>([]);

  const [selectedExercice, setSelectedExercice] = useState('');
  const [selectedJournal, setSelectedJournal] = useState('');
  const [dateEcriture, setDateEcriture] = useState(new Date().toISOString().split('T')[0]);
  const [libelle, setLibelle] = useState('');
  const [numeroPiece, setNumeroPiece] = useState('');
  const [lignes, setLignes] = useState<LigneForm[]>([
    { compte_id: '', libelle: '', debit: '', credit: '' },
    { compte_id: '', libelle: '', debit: '', credit: '' },
  ]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [ex, jo, co, ec] = await Promise.all([
        supabase.from('exercices').select('*').eq('user_id', user.id).eq('cloture', false).order('date_debut'),
        supabase.from('journaux').select('*').eq('user_id', user.id).order('code'),
        supabase.from('comptes').select('*').eq('user_id', user.id).eq('actif', true).order('numero'),
        supabase.from('ecritures').select('*, journaux(code, libelle), lignes_ecriture(*, comptes(numero, libelle))').eq('user_id', user.id).order('date_ecriture', { ascending: false }).limit(20),
      ]);
      setExercices(ex.data || []);
      setJournaux(jo.data || []);
      setComptes(co.data || []);
      setEcritures(ec.data || []);
      if (ex.data?.[0]) setSelectedExercice(ex.data[0].id);
      if (jo.data?.[0]) setSelectedJournal(jo.data[0].id);
    };
    load();
  }, [user]);

  const addLigne = () => setLignes([...lignes, { compte_id: '', libelle: '', debit: '', credit: '' }]);

  const removeLigne = (i: number) => {
    if (lignes.length <= 2) return;
    setLignes(lignes.filter((_, idx) => idx !== i));
  };

  const updateLigne = (i: number, field: keyof LigneForm, value: string) => {
    const updated = [...lignes];
    updated[i] = { ...updated[i], [field]: value };
    // Auto-clear opposite field
    if (field === 'debit' && value) updated[i].credit = '';
    if (field === 'credit' && value) updated[i].debit = '';
    setLignes(updated);
  };

  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSave = async () => {
    if (!user || !isBalanced || !selectedExercice || !selectedJournal || !libelle) {
      toast.error('Veuillez remplir tous les champs et équilibrer l\'écriture');
      return;
    }

    const { data: ecriture, error } = await supabase.from('ecritures').insert({
      user_id: user.id,
      exercice_id: selectedExercice,
      journal_id: selectedJournal,
      date_ecriture: dateEcriture,
      numero_piece: numeroPiece || null,
      libelle,
      statut: 'brouillon',
    }).select().single();

    if (error || !ecriture) { toast.error(error?.message || 'Erreur'); return; }

    const lignesData = lignes.filter(l => l.compte_id && (parseFloat(l.debit) || parseFloat(l.credit))).map(l => ({
      ecriture_id: ecriture.id,
      compte_id: l.compte_id,
      libelle: l.libelle || libelle,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
    }));

    const { error: lignesError } = await supabase.from('lignes_ecriture').insert(lignesData);
    if (lignesError) { toast.error(lignesError.message); return; }

    toast.success('Écriture enregistrée');
    setLibelle('');
    setNumeroPiece('');
    setLignes([
      { compte_id: '', libelle: '', debit: '', credit: '' },
      { compte_id: '', libelle: '', debit: '', credit: '' },
    ]);

    // Refresh list
    const { data: refreshed } = await supabase.from('ecritures')
      .select('*, journaux(code, libelle), lignes_ecriture(*, comptes(numero, libelle))')
      .eq('user_id', user.id).order('date_ecriture', { ascending: false }).limit(20);
    setEcritures(refreshed || []);
  };

  const formatAmount = (n: number) => n > 0 ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '';

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-header">Saisie d'écritures</h1>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label>Exercice</Label>
            <Select value={selectedExercice} onValueChange={setSelectedExercice}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>{exercices.map((e) => <SelectItem key={e.id} value={e.id}>{e.libelle}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Journal</Label>
            <Select value={selectedJournal} onValueChange={setSelectedJournal}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>{journaux.map((j) => <SelectItem key={j.id} value={j.id}>{j.code} - {j.libelle}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={dateEcriture} onChange={(e) => setDateEcriture(e.target.value)} /></div>
          <div><Label>N° pièce</Label><Input value={numeroPiece} onChange={(e) => setNumeroPiece(e.target.value)} placeholder="FA-001" /></div>
        </div>

        <div className="mb-4">
          <Label>Libellé de l'écriture</Label>
          <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Achat de marchandises..." />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Compte</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-36 text-right">Débit</TableHead>
              <TableHead className="w-36 text-right">Crédit</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.map((l, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Select value={l.compte_id} onValueChange={(v) => updateLigne(i, 'compte_id', v)}>
                    <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Choisir un compte" /></SelectTrigger>
                    <SelectContent>{comptes.map((c) => <SelectItem key={c.id} value={c.id}>{c.numero} - {c.libelle}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input value={l.libelle} onChange={(e) => updateLigne(i, 'libelle', e.target.value)} placeholder="Détail..." /></TableCell>
                <TableCell><Input type="number" value={l.debit} onChange={(e) => updateLigne(i, 'debit', e.target.value)} placeholder="0.00" className="text-right font-mono" min="0" step="0.01" /></TableCell>
                <TableCell><Input type="number" value={l.credit} onChange={(e) => updateLigne(i, 'credit', e.target.value)} placeholder="0.00" className="text-right font-mono" min="0" step="0.01" /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeLigne(i)} disabled={lignes.length <= 2}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 border-primary/20">
              <TableCell colSpan={2} className="text-right font-semibold">Totaux</TableCell>
              <TableCell className="text-right font-mono font-bold amount-debit">{totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right font-mono font-bold amount-credit">{totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" onClick={addLigne}><Plus className="w-4 h-4 mr-2" />Ajouter une ligne</Button>
          <div className="flex items-center gap-4">
            {!isBalanced && totalDebit > 0 && (
              <span className="text-sm text-destructive font-medium">
                Écart : {Math.abs(totalDebit - totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA
              </span>
            )}
            {isBalanced && <Check className="w-5 h-5 text-accent" />}
            <Button onClick={handleSave} disabled={!isBalanced}><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Dernières écritures</h2></div>
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="w-16">Journal</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-20">Statut</TableHead>
              <TableHead className="w-32 text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecritures.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Aucune écriture</TableCell></TableRow>
            ) : ecritures.map((e: any) => {
              const totalD = (e.lignes_ecriture || []).reduce((s: number, l: any) => s + Number(l.debit), 0);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">{new Date(e.date_ecriture).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="font-mono text-primary font-semibold">{(e.journaux as any)?.code}</TableCell>
                  <TableCell>{e.libelle}</TableCell>
                  <TableCell><Badge variant={e.statut === 'validee' ? 'default' : 'secondary'}>{e.statut === 'validee' ? 'Validée' : 'Brouillon'}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{totalD.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SaisieEcritures;
