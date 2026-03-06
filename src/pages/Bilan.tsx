import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBalanceComptes } from '@/hooks/useBalanceComptes';
import { useExercices } from '@/hooks/useExercices';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

const fmt = (n: number) => n !== 0 ? Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '';

// SYSCOHADA: Classes 1-5 = Bilan
// Actif: Classe 2 (immobilisations), 3 (stocks), 4 (tiers débiteurs), 5 (trésorerie active)
// Passif: Classe 1 (capitaux), 4 (tiers créditeurs)

interface BilanSection {
  label: string;
  comptes: { numero: string; libelle: string; montant: number }[];
  total: number;
}

const Bilan = () => {
  const exercices = useExercices();
  const [selectedExercice, setSelectedExercice] = useState<string>('');
  const { soldes, loading } = useBalanceComptes(selectedExercice || undefined);

  const buildBilan = () => {
    const actifImmobilise: BilanSection = { label: 'Actif immobilisé', comptes: [], total: 0 };
    const actifCirculant: BilanSection = { label: 'Actif circulant', comptes: [], total: 0 };
    const tresorerieActif: BilanSection = { label: 'Trésorerie Actif', comptes: [], total: 0 };
    const capitaux: BilanSection = { label: 'Capitaux propres & Ressources', comptes: [], total: 0 };
    const dettesFinancieres: BilanSection = { label: 'Dettes financières', comptes: [], total: 0 };
    const passifCirculant: BilanSection = { label: 'Passif circulant', comptes: [], total: 0 };
    const tresoreriePassif: BilanSection = { label: 'Trésorerie Passif', comptes: [], total: 0 };

    soldes.forEach(s => {
      const c1 = s.numero.charAt(0);
      const c2 = s.numero.substring(0, 2);
      const montant = Math.abs(s.solde);
      const entry = { numero: s.numero, libelle: s.libelle, montant };

      if (c1 === '2') {
        actifImmobilise.comptes.push(entry);
        actifImmobilise.total += montant;
      } else if (c1 === '3') {
        actifCirculant.comptes.push(entry);
        actifCirculant.total += montant;
      } else if (c1 === '4') {
        if (s.solde > 0) {
          actifCirculant.comptes.push(entry);
          actifCirculant.total += montant;
        } else {
          passifCirculant.comptes.push(entry);
          passifCirculant.total += montant;
        }
      } else if (c1 === '5') {
        if (s.solde > 0) {
          tresorerieActif.comptes.push(entry);
          tresorerieActif.total += montant;
        } else {
          tresoreriePassif.comptes.push(entry);
          tresoreriePassif.total += montant;
        }
      } else if (c1 === '1') {
        if (c2 >= '16') {
          dettesFinancieres.comptes.push(entry);
          dettesFinancieres.total += montant;
        } else {
          capitaux.comptes.push(entry);
          capitaux.total += montant;
        }
      }
    });

    // Résultat de l'exercice (classes 6 et 7)
    const charges = soldes.filter(s => s.numero.charAt(0) === '6').reduce((sum, s) => sum + Math.abs(s.solde), 0);
    const produits = soldes.filter(s => s.numero.charAt(0) === '7').reduce((sum, s) => sum + Math.abs(s.solde), 0);
    const resultat = produits - charges;
    if (resultat !== 0) {
      capitaux.comptes.push({ numero: '13x', libelle: 'Résultat de l\'exercice', montant: Math.abs(resultat) });
      capitaux.total += Math.abs(resultat);
    }

    const actifSections = [actifImmobilise, actifCirculant, tresorerieActif];
    const passifSections = [capitaux, dettesFinancieres, passifCirculant, tresoreriePassif];
    const totalActif = actifSections.reduce((s, sec) => s + sec.total, 0);
    const totalPassif = passifSections.reduce((s, sec) => s + sec.total, 0);

    return { actifSections, passifSections, totalActif, totalPassif, resultat };
  };

  const { actifSections, passifSections, totalActif, totalPassif, resultat } = buildBilan();

  const renderSection = (sections: BilanSection[]) => (
    <>
      {sections.map(sec => (
        sec.comptes.length > 0 && (
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
              <TableCell className="pl-6 font-medium text-xs text-muted-foreground">Total {sec.label}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{fmt(sec.total)}</TableCell>
            </TableRow>
          </div>
        )
      ))}
    </>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header flex items-center gap-2"><FileSpreadsheet className="w-6 h-6" /> Bilan</h1>
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune écriture. Saisissez des écritures pour générer le bilan.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">ACTIF</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Poste</TableHead>
                    <TableHead className="w-32 text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSection(actifSections)}
                  <TableRow className="border-t-2 bg-secondary font-bold">
                    <TableCell>TOTAL ACTIF</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalActif)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">PASSIF</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Poste</TableHead>
                    <TableHead className="w-32 text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSection(passifSections)}
                  <TableRow className="border-t-2 bg-secondary font-bold">
                    <TableCell>TOTAL PASSIF</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalPassif)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {soldes.length > 0 && (
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="py-4 text-center">
              <div className="text-sm text-muted-foreground">Résultat net</div>
              <div className={`text-2xl font-bold font-mono ${resultat >= 0 ? 'text-accent' : 'text-destructive'}`}>
                {resultat >= 0 ? '+' : '-'}{fmt(resultat)} FCFA
              </div>
              <div className="text-xs text-muted-foreground mt-1">{resultat >= 0 ? 'Bénéfice' : 'Perte'}</div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="py-4 text-center">
              <div className="text-sm text-muted-foreground">Écart Actif / Passif</div>
              <div className={`text-2xl font-bold font-mono ${Math.abs(totalActif - totalPassif) < 1 ? 'text-accent' : 'text-destructive'}`}>
                {fmt(totalActif - totalPassif)} FCFA
              </div>
              <div className="text-xs text-muted-foreground mt-1">{Math.abs(totalActif - totalPassif) < 1 ? '✅ Équilibré' : '⚠️ Déséquilibre'}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Bilan;
