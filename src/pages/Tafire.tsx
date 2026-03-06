import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBalanceComptes } from '@/hooks/useBalanceComptes';
import { useExercices } from '@/hooks/useExercices';
import { ArrowDownUp, Loader2 } from 'lucide-react';

const fmt = (n: number) => n !== 0 ? n.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) : '—';

// TAFIRE simplifié SYSCOHADA — Tableau Financier des Ressources et Emplois
// Partie 1: CAF et ressources internes
// Partie 2: Emplois et ressources

const Tafire = () => {
  const exercices = useExercices();
  const [selectedExercice, setSelectedExercice] = useState<string>('');
  const { soldes, loading } = useBalanceComptes(selectedExercice || undefined);

  const sumByPrefix = (prefix: string) =>
    soldes.filter(s => s.numero.startsWith(prefix)).reduce((sum, s) => sum + Math.abs(s.solde), 0);

  const sumByPrefixes = (prefixes: string[]) =>
    prefixes.reduce((sum, p) => sum + sumByPrefix(p), 0);

  const buildTafire = () => {
    // === PARTIE 1 : Capacité d'Autofinancement Globale (CAFG) ===
    const produits = soldes.filter(s => s.numero.charAt(0) === '7').reduce((sum, s) => sum + Math.abs(s.solde), 0);
    const charges = soldes.filter(s => s.numero.charAt(0) === '6').reduce((sum, s) => sum + Math.abs(s.solde), 0);
    const resultatNet = produits - charges;

    const dotationsAmort = sumByPrefix('68'); // Dotations aux amortissements
    const dotationsProv = sumByPrefix('69'); // Dotations aux provisions
    const reprisesAmort = sumByPrefix('78'); // Reprises d'amortissements
    const reprisesProv = sumByPrefix('79'); // Reprises de provisions

    const cafg = resultatNet + dotationsAmort + dotationsProv - reprisesAmort - reprisesProv;

    // === PARTIE 2 : Emplois et Ressources ===
    // Ressources
    const augmentationCapital = sumByPrefix('10'); // Capital
    const emprunts = sumByPrefixes(['16']); // Emprunts
    const cessionImmo = sumByPrefix('82'); // Cessions d'immobilisations (si utilisé)

    const totalRessources = cafg + augmentationCapital + emprunts + cessionImmo;

    // Emplois
    const investissements = sumByPrefix('2'); // Immobilisations (acquisitions)
    const remboursementEmprunts = sumByPrefixes(['17']); // Remboursements
    const dividendes = sumByPrefix('47'); // Dividendes à payer (approximation)

    const totalEmplois = investissements + remboursementEmprunts + dividendes;

    const variationTresorerie = totalRessources - totalEmplois;

    // Trésorerie
    const tresorerieActif = soldes.filter(s => s.numero.charAt(0) === '5' && s.solde > 0).reduce((sum, s) => sum + s.solde, 0);
    const tresoreriePassif = soldes.filter(s => s.numero.charAt(0) === '5' && s.solde < 0).reduce((sum, s) => sum + Math.abs(s.solde), 0);
    const tresorerieNette = tresorerieActif - tresoreriePassif;

    return {
      cafg: [
        { label: 'Résultat net de l\'exercice', montant: resultatNet },
        { label: '+ Dotations aux amortissements (68)', montant: dotationsAmort },
        { label: '+ Dotations aux provisions (69)', montant: dotationsProv },
        { label: '- Reprises d\'amortissements (78)', montant: -reprisesAmort },
        { label: '- Reprises de provisions (79)', montant: -reprisesProv },
      ],
      cafgTotal: cafg,
      ressources: [
        { label: 'CAFG', montant: cafg },
        { label: 'Augmentation de capital (10)', montant: augmentationCapital },
        { label: 'Emprunts (16)', montant: emprunts },
        { label: 'Cessions d\'immobilisations (82)', montant: cessionImmo },
      ],
      totalRessources,
      emplois: [
        { label: 'Investissements / Immobilisations (2x)', montant: investissements },
        { label: 'Remboursement d\'emprunts (17)', montant: remboursementEmprunts },
        { label: 'Dividendes (47)', montant: dividendes },
      ],
      totalEmplois,
      variationTresorerie,
      tresorerieActif,
      tresoreriePassif,
      tresorerieNette,
    };
  };

  const data = buildTafire();

  const renderLines = (lines: { label: string; montant: number }[]) =>
    lines.map((l, i) => (
      <TableRow key={i}>
        <TableCell className="text-sm pl-6">{l.label}</TableCell>
        <TableCell className={`text-right font-mono text-sm ${l.montant < 0 ? 'text-destructive' : ''}`}>
          {fmt(l.montant)}
        </TableCell>
      </TableRow>
    ));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header flex items-center gap-2"><ArrowDownUp className="w-6 h-6" /> TAFIRE</h1>
        <Select value={selectedExercice} onValueChange={setSelectedExercice}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Tous les exercices" /></SelectTrigger>
          <SelectContent>
            {exercices.map(ex => (
              <SelectItem key={ex.id} value={ex.id}>{ex.libelle}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">Tableau Financier des Ressources et des Emplois — Norme SYSCOHADA</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : soldes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune écriture comptabilisée.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Partie 1 : CAFG */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">1ère Partie — Capacité d'Autofinancement Globale (CAFG)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Éléments</TableHead>
                    <TableHead className="w-40 text-right">Montant (FCFA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderLines(data.cafg)}
                  <TableRow className="border-t-2 bg-secondary font-bold">
                    <TableCell>CAFG</TableCell>
                    <TableCell className="text-right font-mono">{fmt(data.cafgTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Partie 2 : Emplois et Ressources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Ressources</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Poste</TableHead>
                      <TableHead className="w-36 text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderLines(data.ressources)}
                    <TableRow className="border-t-2 bg-secondary font-bold">
                      <TableCell>TOTAL RESSOURCES</TableCell>
                      <TableCell className="text-right font-mono">{fmt(data.totalRessources)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg">Emplois</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Poste</TableHead>
                      <TableHead className="w-36 text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderLines(data.emplois)}
                    <TableRow className="border-t-2 bg-secondary font-bold">
                      <TableCell>TOTAL EMPLOIS</TableCell>
                      <TableCell className="text-right font-mono">{fmt(data.totalEmplois)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Synthèse trésorerie */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-sm text-muted-foreground">Variation de trésorerie</div>
                <div className={`text-2xl font-bold font-mono ${data.variationTresorerie >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {fmt(data.variationTresorerie)} FCFA
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-sm text-muted-foreground">Trésorerie nette</div>
                <div className={`text-2xl font-bold font-mono ${data.tresorerieNette >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {fmt(data.tresorerieNette)} FCFA
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-sm text-muted-foreground">CAFG</div>
                <div className={`text-2xl font-bold font-mono ${data.cafgTotal >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {fmt(data.cafgTotal)} FCFA
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tafire;
