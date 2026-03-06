import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const GrandLivre = () => {
  const { user } = useAuth();
  const [comptes, setComptes] = useState<any[]>([]);
  const [selectedCompte, setSelectedCompte] = useState('');
  const [lignes, setLignes] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('comptes').select('*').eq('user_id', user.id).eq('actif', true).order('numero')
      .then(({ data }) => setComptes(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedCompte) { setLignes([]); return; }
    supabase.from('lignes_ecriture').select('*, comptes(numero, libelle), ecriture:ecritures(date_ecriture, libelle, numero_piece, journaux(code))')
      .eq('compte_id', selectedCompte)
      .order('created_at')
      .then(({ data }) => setLignes(data || []));
  }, [selectedCompte]);

  const filteredComptes = comptes.filter(c =>
    c.numero.includes(search) || c.libelle.toLowerCase().includes(search.toLowerCase())
  );

  let soldeProgressif = 0;

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="page-header">Grand livre</h1>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un compte..." className="pl-10" />
        </div>
        <div className="w-80">
          <Select value={selectedCompte} onValueChange={setSelectedCompte}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
            <SelectContent>
              {filteredComptes.map((c) => <SelectItem key={c.id} value={c.id}>{c.numero} - {c.libelle}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCompte && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-secondary">
            <h2 className="font-semibold text-secondary-foreground">
              {comptes.find(c => c.id === selectedCompte)?.numero} — {comptes.find(c => c.id === selectedCompte)?.libelle}
            </h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-16">Jnl</TableHead>
                <TableHead className="w-24">N° pièce</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="w-32 text-right">Débit</TableHead>
                <TableHead className="w-32 text-right">Crédit</TableHead>
                <TableHead className="w-32 text-right">Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucun mouvement pour ce compte</TableCell></TableRow>
              ) : lignes.map((l: any) => {
                soldeProgressif += Number(l.debit) - Number(l.credit);
                const ecriture = l.ecriture as any;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-sm">{ecriture ? new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR') : '-'}</TableCell>
                    <TableCell className="font-mono text-primary">{ecriture?.journaux?.code || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{ecriture?.numero_piece || '-'}</TableCell>
                    <TableCell>{l.libelle || ecriture?.libelle}</TableCell>
                    <TableCell className="text-right font-mono">{Number(l.debit) > 0 ? Number(l.debit).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : ''}</TableCell>
                    <TableCell className="text-right font-mono">{Number(l.credit) > 0 ? Number(l.credit).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : ''}</TableCell>
                    <TableCell className={`text-right font-mono font-medium ${soldeProgressif >= 0 ? 'amount-debit' : 'amount-credit'}`}>
                      {Math.abs(soldeProgressif).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {soldeProgressif >= 0 ? 'D' : 'C'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default GrandLivre;
