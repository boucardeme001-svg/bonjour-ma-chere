import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Eye, Printer } from 'lucide-react';
import { calculerBulletin } from '@/lib/paie-senegal';

const BulletinsPaie = () => {
  const { user } = useAuth();
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [selectedEmploye, setSelectedEmploye] = useState('');
  const [periode, setPeriode] = useState(new Date().toISOString().slice(0, 7));
  const [sursalaire, setSursalaire] = useState(0);
  const [primeAnciennete, setPrimeAnciennete] = useState(0);
  const [primeTransport, setPrimeTransport] = useState(0);
  const [autresPrimes, setAutresPrimes] = useState(0);
  const [heuresSupMontant, setHeuresSupMontant] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);
  const [viewBulletin, setViewBulletin] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    const [b, e] = await Promise.all([
      supabase.from('bulletins_paie').select('*, employes(matricule, prenom, nom)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('employes').select('*').eq('user_id', user.id).eq('actif', true).order('nom'),
    ]);
    setBulletins(b.data || []);
    setEmployes(e.data || []);
  };

  useEffect(() => { load(); }, [user]);

  const emp = employes.find(e => e.id === selectedEmploye);

  const handleGenerate = async () => {
    if (!user || !emp) { toast.error('Sélectionnez un employé'); return; }

    const calcul = calculerBulletin(
      Number(emp.salaire_base), sursalaire, primeAnciennete, primeTransport,
      autresPrimes, heuresSupMontant, emp.is_cadre, emp.situation_familiale, emp.nombre_enfants
    );

    const { error } = await supabase.from('bulletins_paie').insert({
      user_id: user.id,
      employe_id: emp.id,
      periode,
      salaire_base: Number(emp.salaire_base),
      sursalaire, prime_anciennete: primeAnciennete, prime_transport: primeTransport,
      autres_primes: autresPrimes, heures_sup_montant: heuresSupMontant,
      ...calcul,
    });

    if (error) { toast.error(error.message); return; }
    toast.success('Bulletin généré');
    setOpenCreate(false);
    setSursalaire(0); setPrimeAnciennete(0); setPrimeTransport(0); setAutresPrimes(0); setHeuresSupMontant(0);
    setSelectedEmploye('');
    load();
  };

  const fmt = (n: number) => Number(n).toLocaleString('fr-FR');

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Bulletins de paie</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nouveau bulletin</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Générer un bulletin</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employé</Label>
                <Select value={selectedEmploye} onValueChange={setSelectedEmploye}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{employes.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.matricule} — {e.prenom} {e.nom}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div><Label>Période</Label><Input type="month" value={periode} onChange={e => setPeriode(e.target.value)} /></div>
              {emp && <div className="p-3 rounded-md bg-muted text-sm">Salaire de base : <strong>{fmt(Number(emp.salaire_base))} FCFA</strong> {emp.is_cadre && '(Cadre)'}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Sursalaire</Label><Input type="number" min={0} value={sursalaire} onChange={e => setSursalaire(Number(e.target.value))} /></div>
                <div><Label>Prime ancienneté</Label><Input type="number" min={0} value={primeAnciennete} onChange={e => setPrimeAnciennete(Number(e.target.value))} /></div>
                <div><Label>Prime transport</Label><Input type="number" min={0} value={primeTransport} onChange={e => setPrimeTransport(Number(e.target.value))} /></div>
                <div><Label>Autres primes</Label><Input type="number" min={0} value={autresPrimes} onChange={e => setAutresPrimes(Number(e.target.value))} /></div>
                <div><Label>Heures sup. montant</Label><Input type="number" min={0} value={heuresSupMontant} onChange={e => setHeuresSupMontant(Number(e.target.value))} /></div>
              </div>
              <Button className="w-full" onClick={handleGenerate}>Calculer et enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Détail bulletin */}
      <Dialog open={!!viewBulletin} onOpenChange={() => setViewBulletin(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulletin de paie — {viewBulletin?.periode}</DialogTitle></DialogHeader>
          {viewBulletin && <BulletinDetail b={viewBulletin} />}
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Période</TableHead>
              <TableHead>Employé</TableHead>
              <TableHead className="text-right">Brut</TableHead>
              <TableHead className="text-right">Retenues</TableHead>
              <TableHead className="text-right">Net à payer</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulletins.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucun bulletin</TableCell></TableRow>
            ) : bulletins.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-mono">{b.periode}</TableCell>
                <TableCell>{(b.employes as any)?.prenom} {(b.employes as any)?.nom}</TableCell>
                <TableCell className="text-right font-mono">{fmt(Number(b.salaire_brut))}</TableCell>
                <TableCell className="text-right font-mono text-destructive">{fmt(Number(b.total_retenues_sal))}</TableCell>
                <TableCell className="text-right font-mono font-bold">{fmt(Number(b.net_a_payer))}</TableCell>
                <TableCell><Badge variant={b.statut === 'valide' ? 'default' : 'secondary'}>{b.statut === 'valide' ? 'Validé' : 'Brouillon'}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => setViewBulletin(b)}><Eye className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const BulletinDetail = ({ b }: { b: any }) => {
  const fmt = (n: number) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });

  const Line = ({ label, value, bold, negative, muted }: { label: string; value: number; bold?: boolean; negative?: boolean; muted?: boolean }) => (
    <div className={`flex justify-between items-center py-2 px-3 ${bold ? 'font-semibold bg-muted/50 rounded-md mt-2' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span className="text-sm">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${negative ? 'text-destructive' : ''} ${bold ? 'text-base' : ''}`}>
        {negative && value > 0 ? '- ' : ''}{fmt(value)} <span className="text-xs text-muted-foreground">FCFA</span>
      </span>
    </div>
  );

  const Section = ({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) => (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="divide-y divide-border/30 p-1">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 text-sm">
      {/* En-tête employé */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/40">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {(b.employes as any)?.prenom?.[0]}{(b.employes as any)?.nom?.[0]}
        </div>
        <div>
          <div className="font-semibold text-base text-foreground">{(b.employes as any)?.prenom} {(b.employes as any)?.nom}</div>
          <div className="text-xs text-muted-foreground font-mono">{(b.employes as any)?.matricule} • {b.periode}</div>
        </div>
      </div>

      <div className="grid gap-4">
        <Section title="Rémunération" icon="💰">
          <Line label="Salaire de base" value={Number(b.salaire_base)} />
          {Number(b.sursalaire) > 0 && <Line label="Sursalaire" value={Number(b.sursalaire)} />}
          {Number(b.prime_anciennete) > 0 && <Line label="Prime d'ancienneté" value={Number(b.prime_anciennete)} />}
          {Number(b.prime_transport) > 0 && <Line label="Prime de transport" value={Number(b.prime_transport)} />}
          {Number(b.autres_primes) > 0 && <Line label="Autres primes" value={Number(b.autres_primes)} />}
          {Number(b.heures_sup_montant) > 0 && <Line label="Heures supplémentaires" value={Number(b.heures_sup_montant)} />}
          <Line label="Salaire brut" value={Number(b.salaire_brut)} bold />
        </Section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Retenues salariales" icon="📉">
            <Line label="IPRES RG (5,6%)" value={Number(b.ipres_rg_sal)} negative />
            {Number(b.ipres_crc_sal) > 0 && <Line label="IPRES CRC (2,4%)" value={Number(b.ipres_crc_sal)} negative />}
            <Line label="IR" value={Number(b.ir)} negative />
            <Line label="TRIMF" value={Number(b.trimf)} negative />
            <Line label="Total retenues" value={Number(b.total_retenues_sal)} bold negative />
          </Section>

          <Section title="Charges patronales" icon="🏢">
            <Line label="IPRES RG (8,4%)" value={Number(b.ipres_rg_pat)} muted />
            {Number(b.ipres_crc_pat) > 0 && <Line label="IPRES CRC (3,6%)" value={Number(b.ipres_crc_pat)} muted />}
            <Line label="CSS AT (1%)" value={Number(b.css_at)} muted />
            <Line label="CSS PF (7%)" value={Number(b.css_pf)} muted />
            <Line label="CFCE (3%)" value={Number(b.cfce)} muted />
            <Line label="Total charges" value={Number(b.total_charges_pat)} bold />
          </Section>
        </div>
      </div>

      {/* Net à payer */}
      <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 flex justify-between items-center">
        <span className="font-semibold text-base text-foreground">Net à payer</span>
        <span className="font-mono font-bold text-xl text-primary">{fmt(Number(b.net_a_payer))} <span className="text-sm">FCFA</span></span>
      </div>
    </div>
  );
};

export default BulletinsPaie;
