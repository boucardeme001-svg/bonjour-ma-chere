import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface BalanceLine {
  numero: string;
  libelle: string;
  classe: number;
  totalDebit: number;
  totalCredit: number;
  soldeDebit: number;
  soldeCredit: number;
}

const Balance = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<BalanceLine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchBalance = async () => {
      // Get all comptes
      const { data: comptes } = await supabase.from('comptes').select('id, numero, libelle, classe').eq('user_id', user.id).order('numero');
      if (!comptes) { setLoading(false); return; }

      // Get all lignes for user's écritures
      const { data: lignes } = await supabase.from('lignes_ecriture')
        .select('compte_id, debit, credit, ecriture:ecritures!inner(user_id)')
        .eq('ecriture.user_id', user.id);

      const balanceMap = new Map<string, BalanceLine>();
      comptes.forEach(c => {
        balanceMap.set(c.id, { numero: c.numero, libelle: c.libelle, classe: c.classe, totalDebit: 0, totalCredit: 0, soldeDebit: 0, soldeCredit: 0 });
      });

      (lignes || []).forEach((l: any) => {
        const entry = balanceMap.get(l.compte_id);
        if (entry) {
          entry.totalDebit += Number(l.debit);
          entry.totalCredit += Number(l.credit);
        }
      });

      const result: BalanceLine[] = [];
      balanceMap.forEach((v) => {
        const solde = v.totalDebit - v.totalCredit;
        v.soldeDebit = solde > 0 ? solde : 0;
        v.soldeCredit = solde < 0 ? Math.abs(solde) : 0;
        if (v.totalDebit > 0 || v.totalCredit > 0) result.push(v);
      });

      result.sort((a, b) => a.numero.localeCompare(b.numero));
      setBalance(result);
      setLoading(false);
    };
    fetchBalance();
  }, [user]);

  const filtered = balance.filter(b =>
    b.numero.includes(search) || b.libelle.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filtered.reduce((acc, b) => ({
    totalDebit: acc.totalDebit + b.totalDebit,
    totalCredit: acc.totalCredit + b.totalCredit,
    soldeDebit: acc.soldeDebit + b.soldeDebit,
    soldeCredit: acc.soldeCredit + b.soldeCredit,
  }), { totalDebit: 0, totalCredit: 0, soldeDebit: 0, soldeCredit: 0 });

  const fmt = (n: number) => n > 0 ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '';

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-header">Balance générale</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-10" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead className="w-24">Numéro</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-36 text-right">Mvt Débit</TableHead>
              <TableHead className="w-36 text-right">Mvt Crédit</TableHead>
              <TableHead className="w-36 text-right">Solde Débit</TableHead>
              <TableHead className="w-36 text-right">Solde Crédit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune donnée. Saisissez des écritures d'abord.</TableCell></TableRow>
            ) : (
              <>
                {filtered.map((b) => (
                  <TableRow key={b.numero}>
                    <TableCell className="font-mono font-medium text-primary">{b.numero}</TableCell>
                    <TableCell>{b.libelle}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(b.totalDebit)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(b.totalCredit)}</TableCell>
                    <TableCell className="text-right font-mono amount-debit">{fmt(b.soldeDebit)}</TableCell>
                    <TableCell className="text-right font-mono amount-credit">{fmt(b.soldeCredit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold bg-secondary">
                  <TableCell colSpan={2} className="text-right">TOTAUX</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.totalDebit)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totals.totalCredit)}</TableCell>
                  <TableCell className="text-right font-mono amount-debit">{fmt(totals.soldeDebit)}</TableCell>
                  <TableCell className="text-right font-mono amount-credit">{fmt(totals.soldeCredit)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Balance;
