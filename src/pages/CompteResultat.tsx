import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBalanceComptes } from '@/hooks/useBalanceComptes';
import { useExercices } from '@/hooks/useExercices';
import { TrendingUp, Loader2 } from 'lucide-react';

const fmt = (n: number) => n !== 0 ? Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '';

interface Section {
  label: string;
  comptes: { numero: string; libelle: string; montant: number }[];
  total: number;
}

const CompteResultat = () => {
  const exercices = useExercices();
  const [selectedExercice, setSelectedExercice] = useState<string>('');
  const { soldes, loading } = useBalanceComptes(selectedExercice || undefined);

  const buildCR = () => {
    const sections: { charges: Section[]; produits: Section[] } = { charges: [], produits: [] };

    // SYSCOHADA structure
    const chargesMap: Record<string, string> = {
      '60': 'Achats et variations de stocks',
      '61': 'Transports',
      '62': 'Services extérieurs A',
      '63': 'Services extérieurs B',
      '64': 'Impôts et taxes',
      '65': 'Autres charges',
      '66': 'Charges de personnel',
      '67': 'Frais financiers et charges assimilées',
      '68': 'Dotations aux amortissements',
      '69': 'Dotations aux provisions',
    };

    const produitsMap: Record<string, string> = {
      '70': 'Ventes de marchandises',
      '71': 'Production vendue',
      '72': 'Production stockée',
      '73': 'Production immobilisée',
      '74': 'Subventions d\'exploitation',
      '75': 'Autres produits',
      '76': 'Produits financiers',
      '77': 'Revenus financiers et produits assimilés',
      '78': 'Reprises d\'amortissements',
      '79': 'Reprises de provisions',
    };

    const groupComptes = (prefixes: Record<string, string>, classeChar: string) => {
      const result: Section[] = [];
      Object.entries(prefixes).forEach(([prefix, label]) => {
        const matching = soldes.filter(s => s.numero.startsWith(prefix));
        if (matching.length > 0) {
          const comptes = matching.map(s => ({ numero: s.numero, libelle: s.libelle, montant: Math.abs(s.solde) }));
          const total = comptes.reduce((sum, c) => sum + c.montant, 0);
          result.push({ label, comptes, total });
        }
      });
      // Catch remaining
      const covered = Object.keys(prefixes);
      const remaining = soldes.filter(s => s.numero.charAt(0) === classeChar && !covered.some(p => s.numero.startsWith(p)));
      if (remaining.length > 0) {
        const comptes = remaining.map(s => ({ numero: s.numero, libelle: s.libelle, montant: Math.abs(s.solde) }));
        const total = comptes.reduce((sum, c) => sum + c.montant, 0);
        result.push({ label: 'Autres', comptes, total });
      }
      return result;
    };

    sections.charges = groupComptes(chargesMap, '6');
    sections.produits = groupComptes(produitsMap, '7');

    const totalCharges = sections.charges.reduce((s, sec) => s + sec.total, 0);
    const totalProduits = sections.produits.reduce((s, sec) => s + sec.total, 0);
    const resultat = totalProduits - totalCharges;

    return { ...sections, totalCharges, totalProduits, resultat };
  };

  const { charges, produits, totalCharges, totalProduits, resultat } = buildCR();

  const renderSections = (secs: Section[]) => (
    <>
      {secs.map(sec => (
        <div key={sec.label}>
          <TableRow className="bg-muted/50">
            <TableCell colSpan={2} className="font-semibold text-foreground">{sec.label}</TableCell>
          </TableRow>
          {sec.comptes.map((c, i) => (
            <TableRow key={`${c.numero}-${i}`}>
              <TableCell className="pl-6 text-sm">
                <span className="font-mono text-primary mr-2">{c.numero}</span>{c.libelle}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">{fmt(c.montant)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t">
            <TableCell className="pl-6 font-medium text-xs text-muted-foreground">Sous-total</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmt(sec.total)}</TableCell>
          </TableRow>
        </div>
      ))}
    </>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header flex items-center gap-2"><TrendingUp className="w-6 h-6" /> Compte de Résultat</h1>
        <Select value={selectedExercice} onValueChange={setSelectedExercice}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Tous les exercices" /></SelectTrigger>
          <SelectContent>
            {exercices.map(ex => (
              <SelectItem key={ex.id} value={ex.id}>{ex.libelle}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : soldes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune écriture comptabilisée.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">PRODUITS (Classe 7)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Poste</TableHead>
                      <TableHead className="w-32 text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderSections(produits)}
                    <TableRow className="border-t-2 bg-secondary font-bold">
                      <TableCell>TOTAL PRODUITS</TableCell>
                      <TableCell className="text-right font-mono">{fmt(totalProduits)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">CHARGES (Classe 6)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Poste</TableHead>
                      <TableHead className="w-32 text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderSections(charges)}
                    <TableRow className="border-t-2 bg-secondary font-bold">
                      <TableCell>TOTAL CHARGES</TableCell>
                      <TableCell className="text-right font-mono">{fmt(totalCharges)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="py-6 text-center">
              <div className="text-sm text-muted-foreground mb-1">Résultat net de l'exercice</div>
              <div className={`text-3xl font-bold font-mono ${resultat >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {resultat >= 0 ? '+' : ''}{resultat.toLocaleString('fr-FR')} FCFA
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {resultat >= 0 ? '✅ Bénéfice' : '❌ Perte'} — Produits {fmt(totalProduits)} − Charges {fmt(totalCharges)}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CompteResultat;
