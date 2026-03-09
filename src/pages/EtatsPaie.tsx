import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

type Bulletin = {
  id: string;
  periode: string;
  salaire_base: number;
  sursalaire: number;
  prime_anciennete: number;
  prime_transport: number;
  autres_primes: number;
  heures_sup_montant: number;
  salaire_brut: number;
  ipres_rg_sal: number;
  ipres_crc_sal: number;
  ir: number;
  trimf: number;
  total_retenues_sal: number;
  ipres_rg_pat: number;
  ipres_crc_pat: number;
  css_at: number;
  css_pf: number;
  cfce: number;
  total_charges_pat: number;
  net_a_payer: number;
  statut: string;
  employes: { matricule: string; prenom: string; nom: string } | null;
};

const fmt = (n: number) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });

const EtatsPaie = () => {
  const { user } = useAuth();
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [periodes, setPeriodes] = useState<string[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('bulletins_paie')
        .select('*, employes(matricule, prenom, nom)')
        .eq('user_id', user.id)
        .order('periode', { ascending: false });
      const all = (data || []) as unknown as Bulletin[];
      setBulletins(all);
      const ps = [...new Set(all.map(b => b.periode))].sort().reverse();
      setPeriodes(ps);
      if (ps.length > 0 && !selectedPeriode) setSelectedPeriode(ps[0]);
    };
    load();
  }, [user]);

  const filtered = useMemo(
    () => bulletins.filter(b => b.periode === selectedPeriode),
    [bulletins, selectedPeriode]
  );

  const totals = useMemo(() => {
    const t = {
      salaire_base: 0, sursalaire: 0, prime_anciennete: 0, prime_transport: 0,
      autres_primes: 0, heures_sup_montant: 0, salaire_brut: 0,
      ipres_rg_sal: 0, ipres_crc_sal: 0, ir: 0, trimf: 0, total_retenues_sal: 0,
      ipres_rg_pat: 0, ipres_crc_pat: 0, css_at: 0, css_pf: 0, cfce: 0,
      total_charges_pat: 0, net_a_payer: 0,
    };
    for (const b of filtered) {
      for (const k of Object.keys(t) as (keyof typeof t)[]) {
        t[k] += Number(b[k]);
      }
    }
    return t;
  }, [filtered]);

  const empName = (b: Bulletin) =>
    b.employes ? `${b.employes.prenom} ${b.employes.nom}` : '—';

  const [transferring, setTransferring] = useState(false);

  const handleTransferCompta = async () => {
    if (!user || filtered.length === 0) return;
    setTransferring(true);
    try {
      // 1. Find an open exercice covering this period
      const periodeParts = selectedPeriode.split('-'); // "2025-01" format
      const periodeDate = `${selectedPeriode}-01`;
      const { data: exercices } = await supabase
        .from('exercices')
        .select('id')
        .eq('user_id', user.id)
        .eq('cloture', false)
        .lte('date_debut', periodeDate)
        .gte('date_fin', periodeDate);

      if (!exercices || exercices.length === 0) {
        toast.error('Aucun exercice ouvert ne couvre cette période');
        setTransferring(false);
        return;
      }
      const exerciceId = exercices[0].id;

      // 2. Find or create OD journal
      let { data: journaux } = await supabase
        .from('journaux')
        .select('id')
        .eq('user_id', user.id)
        .eq('code', 'OD');

      let journalId: string;
      if (journaux && journaux.length > 0) {
        journalId = journaux[0].id;
      } else {
        const { data: newJ, error: errJ } = await supabase
          .from('journaux')
          .insert({ user_id: user.id, code: 'OD', libelle: 'Opérations Diverses', type: 'od' })
          .select('id')
          .single();
        if (errJ || !newJ) { toast.error('Erreur création journal OD'); setTransferring(false); return; }
        journalId = newJ.id;
      }

      // 3. Find account IDs by numero
      const accountNums = ['661', '664', '421', '431', '447'];
      const { data: comptes } = await supabase
        .from('comptes')
        .select('id, numero')
        .eq('user_id', user.id)
        .in('numero', accountNums);

      const compteMap = new Map((comptes || []).map(c => [c.numero, c.id]));
      const missing = accountNums.filter(n => !compteMap.has(n));
      if (missing.length > 0) {
        toast.error(`Comptes manquants dans le plan comptable : ${missing.join(', ')}`);
        setTransferring(false);
        return;
      }

      // 4. Calculate totals for accounting entry
      const totalBrut = totals.salaire_brut;
      const totalChargesPat = totals.total_charges_pat;
      const totalNet = totals.net_a_payer;
      const totalOrganismes = totals.ipres_rg_sal + totals.ipres_crc_sal + totals.ipres_rg_pat + totals.ipres_crc_pat + totals.css_at + totals.css_pf + totals.cfce;
      const totalImpots = totals.ir + totals.trimf;

      // 5. Create ecriture
      const { data: ecriture, error: errE } = await supabase
        .from('ecritures')
        .insert({
          user_id: user.id,
          exercice_id: exerciceId,
          journal_id: journalId,
          date_ecriture: `${selectedPeriode}-28`,
          libelle: `Paie ${selectedPeriode}`,
          numero_piece: `PAIE-${selectedPeriode}`,
          statut: 'brouillon',
        })
        .select('id')
        .single();

      if (errE || !ecriture) { toast.error('Erreur création écriture'); setTransferring(false); return; }

      // 6. Create lignes
      const lignes = [
        { ecriture_id: ecriture.id, compte_id: compteMap.get('661')!, libelle: 'Rémunérations brutes', debit: totalBrut, credit: 0 },
        { ecriture_id: ecriture.id, compte_id: compteMap.get('664')!, libelle: 'Charges sociales patronales', debit: totalChargesPat, credit: 0 },
        { ecriture_id: ecriture.id, compte_id: compteMap.get('421')!, libelle: 'Net à payer personnel', debit: 0, credit: totalNet },
        { ecriture_id: ecriture.id, compte_id: compteMap.get('431')!, libelle: 'Organismes sociaux (IPRES/CSS/CFCE)', debit: 0, credit: totalOrganismes },
        { ecriture_id: ecriture.id, compte_id: compteMap.get('447')!, libelle: 'Impôts retenus (IR/TRIMF)', debit: 0, credit: totalImpots },
      ];

      const { error: errL } = await supabase.from('lignes_ecriture').insert(lignes);
      if (errL) { toast.error('Erreur création lignes écriture'); setTransferring(false); return; }

      toast.success(`Écriture de paie ${selectedPeriode} transférée en comptabilité`);
    } catch (err) {
      toast.error('Erreur lors du transfert');
    }
    setTransferring(false);
  };

  const TotalRow = ({ cells }: { cells: (string | number)[] }) => (
    <TableRow className="bg-muted/50 font-semibold border-t-2 border-border">
      {cells.map((c, i) => (
        <TableCell key={i} className={i > 0 ? 'text-right font-mono' : 'font-bold'}>
          {typeof c === 'number' ? fmt(c) : c}
        </TableCell>
      ))}
    </TableRow>
  );

  if (!selectedPeriode) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="page-header">États de paie</h1>
        <Card className="p-8 text-center text-muted-foreground">
          Aucun bulletin généré. Créez des bulletins de paie d'abord.
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-header">États de paie</h1>
        <div className="flex items-center gap-3">
          <Label className="text-sm">Période :</Label>
          <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filtered.length} bulletin(s)</Badge>
          <Button onClick={handleTransferCompta} disabled={transferring || filtered.length === 0}>
            <BookOpen className="h-4 w-4 mr-2" />
            {transferring ? 'Transfert...' : 'Transférer en compta'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="paie" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="paie">État de paie</TabsTrigger>
          <TabsTrigger value="salaires">État des salaires</TabsTrigger>
          <TabsTrigger value="retenues">État des retenues</TabsTrigger>
          <TabsTrigger value="patronales">Parts patronales</TabsTrigger>
        </TabsList>

        {/* État de paie complet */}
        <TabsContent value="paie">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right">Retenues</TableHead>
                    <TableHead className="text-right">Charges pat.</TableHead>
                    <TableHead className="text-right">Net à payer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{empName(b)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.salaire_brut))}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{fmt(Number(b.total_retenues_sal))}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{fmt(Number(b.total_charges_pat))}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(Number(b.net_a_payer))}</TableCell>
                    </TableRow>
                  ))}
                  <TotalRow cells={['TOTAL', totals.salaire_brut, totals.total_retenues_sal, totals.total_charges_pat, totals.net_a_payer]} />
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* État des salaires */}
        <TabsContent value="salaires">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Sursalaire</TableHead>
                    <TableHead className="text-right">Anc.</TableHead>
                    <TableHead className="text-right">Transport</TableHead>
                    <TableHead className="text-right">Autres</TableHead>
                    <TableHead className="text-right">H. Sup</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{empName(b)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.salaire_base))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.sursalaire))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.prime_anciennete))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.prime_transport))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.autres_primes))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.heures_sup_montant))}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(Number(b.salaire_brut))}</TableCell>
                    </TableRow>
                  ))}
                  <TotalRow cells={['TOTAL', totals.salaire_base, totals.sursalaire, totals.prime_anciennete, totals.prime_transport, totals.autres_primes, totals.heures_sup_montant, totals.salaire_brut]} />
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* État des retenues */}
        <TabsContent value="retenues">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">IPRES RG</TableHead>
                    <TableHead className="text-right">IPRES CRC</TableHead>
                    <TableHead className="text-right">IR</TableHead>
                    <TableHead className="text-right">TRIMF</TableHead>
                    <TableHead className="text-right">Total retenues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{empName(b)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.ipres_rg_sal))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.ipres_crc_sal))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.ir))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.trimf))}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-destructive">{fmt(Number(b.total_retenues_sal))}</TableCell>
                    </TableRow>
                  ))}
                  <TotalRow cells={['TOTAL', totals.ipres_rg_sal, totals.ipres_crc_sal, totals.ir, totals.trimf, totals.total_retenues_sal]} />
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Parts patronales */}
        <TabsContent value="patronales">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">IPRES RG</TableHead>
                    <TableHead className="text-right">IPRES CRC</TableHead>
                    <TableHead className="text-right">CSS AT</TableHead>
                    <TableHead className="text-right">CSS PF</TableHead>
                    <TableHead className="text-right">CFCE</TableHead>
                    <TableHead className="text-right">Total charges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{empName(b)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.ipres_rg_pat))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.ipres_crc_pat))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.css_at))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.css_pf))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(b.cfce))}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(Number(b.total_charges_pat))}</TableCell>
                    </TableRow>
                  ))}
                  <TotalRow cells={['TOTAL', totals.ipres_rg_pat, totals.ipres_crc_pat, totals.css_at, totals.css_pf, totals.cfce, totals.total_charges_pat]} />
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EtatsPaie;
