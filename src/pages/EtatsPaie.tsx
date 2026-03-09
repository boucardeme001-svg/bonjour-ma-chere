import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
