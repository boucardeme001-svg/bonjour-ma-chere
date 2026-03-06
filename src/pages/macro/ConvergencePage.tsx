import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface CritereResult {
  code: string;
  libelle: string;
  norme: string;
  valeur: number | null;
  respecte: boolean | null;
  ordre: 'premier' | 'second';
  unite: string;
}

const ConvergencePage = () => {
  const { simulationId } = useParams<{ simulationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [simulation, setSimulation] = useState<any>(null);
  const [valeurs, setValeurs] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    if (!user || !simulationId) return;
    (async () => {
      const [s, v] = await Promise.all([
        supabase.from('simulations').select('*').eq('id', simulationId).single(),
        supabase.from('simulation_valeurs').select('*').eq('simulation_id', simulationId),
      ]);
      if (s.error) { navigate('/macro'); return; }
      setSimulation(s.data);

      const map: Record<string, Record<number, number>> = {};
      (v.data || []).forEach((r: any) => {
        if (!map[r.indicateur]) map[r.indicateur] = {};
        map[r.indicateur][r.annee] = Number(r.valeur);
      });
      setValeurs(map);
    })();
  }, [user, simulationId]);

  const annees = useMemo(() => {
    if (!simulation) return [];
    return Array.from({ length: simulation.horizon || 3 }, (_, i) => simulation.annee_base + i);
  }, [simulation]);

  const getVal = (code: string, annee: number): number => valeurs[code]?.[annee] ?? 0;

  // Compute PIB nominal for ratios
  const getPibNominal = (annee: number) =>
    getVal('pib_primaire', annee) + getVal('pib_secondaire', annee) + getVal('pib_tertiaire', annee) + getVal('taxes_nettes', annee);

  // Compute total recettes + dons
  const getTotalRecettes = (annee: number) =>
    getVal('recettes_fiscales', annee) + getVal('recettes_non_fiscales', annee) + getVal('dons', annee);

  // Compute total dépenses
  const getTotalDepenses = (annee: number) =>
    getVal('depenses_courantes', annee) + getVal('depenses_capital', annee);

  // Solde global
  const getSoldeGlobal = (annee: number) => getTotalRecettes(annee) - getTotalDepenses(annee);

  const getCriteres = (annee: number): CritereResult[] => {
    const pib = getPibNominal(annee);
    const hasPib = pib > 0;

    // 1er ordre
    const soldeGlobalPib = hasPib ? (getSoldeGlobal(annee) / pib) * 100 : null;
    const inflation = getVal('inflation', annee) || null;
    const dettePib = hasPib ? (getVal('dette_publique', annee) / pib) * 100 : null;

    // 2nd ordre
    const masseSalRecFisc = getVal('recettes_fiscales', annee) > 0
      ? (getVal('masse_salariale', annee) / getVal('recettes_fiscales', annee)) * 100
      : null;
    const pressionFiscale = hasPib ? (getVal('recettes_fiscales', annee) / pib) * 100 : null;
    // Solde courant extérieur / PIB
    const soldeCourant = getVal('balance_commerciale', annee) + getVal('balance_services', annee) +
      getVal('revenus_primaires', annee) + getVal('revenus_secondaires', annee);
    const soldeCourantPib = hasPib ? (soldeCourant / pib) * 100 : null;

    return [
      {
        code: 'solde_global_pib',
        libelle: 'Solde budgétaire global / PIB',
        norme: '≥ -3%',
        valeur: soldeGlobalPib,
        respecte: soldeGlobalPib !== null ? soldeGlobalPib >= -3 : null,
        ordre: 'premier',
        unite: '%',
      },
      {
        code: 'inflation',
        libelle: 'Taux d\'inflation (IPC)',
        norme: '≤ 3%',
        valeur: inflation,
        respecte: inflation !== null ? inflation <= 3 : null,
        ordre: 'premier',
        unite: '%',
      },
      {
        code: 'dette_pib',
        libelle: 'Encours dette publique / PIB',
        norme: '≤ 70%',
        valeur: dettePib,
        respecte: dettePib !== null ? dettePib <= 70 : null,
        ordre: 'premier',
        unite: '%',
      },
      {
        code: 'masse_sal_rec',
        libelle: 'Masse salariale / Recettes fiscales',
        norme: '≤ 35%',
        valeur: masseSalRecFisc,
        respecte: masseSalRecFisc !== null ? masseSalRecFisc <= 35 : null,
        ordre: 'second',
        unite: '%',
      },
      {
        code: 'pression_fiscale',
        libelle: 'Pression fiscale (Rec. fiscales / PIB)',
        norme: '≥ 20%',
        valeur: pressionFiscale,
        respecte: pressionFiscale !== null ? pressionFiscale >= 20 : null,
        ordre: 'second',
        unite: '%',
      },
      {
        code: 'solde_courant_pib',
        libelle: 'Solde courant extérieur / PIB',
        norme: '≥ -5%',
        valeur: soldeCourantPib,
        respecte: soldeCourantPib !== null ? soldeCourantPib >= -5 : null,
        ordre: 'second',
        unite: '%',
      },
    ];
  };

  const fmt = (n: number | null) => n !== null ? n.toFixed(1) : '—';

  const StatusIcon = ({ respecte }: { respecte: boolean | null }) => {
    if (respecte === null) return <AlertTriangle className="w-4 h-4 text-warning" />;
    return respecte
      ? <CheckCircle2 className="w-4 h-4 text-success" />
      : <XCircle className="w-4 h-4 text-destructive" />;
  };

  if (!simulation) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  const premierOrdre = annees.length > 0 ? getCriteres(annees[0]).filter(c => c.ordre === 'premier') : [];
  const secondOrdre = annees.length > 0 ? getCriteres(annees[0]).filter(c => c.ordre === 'second') : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/macro')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="page-header">Critères de convergence UEMOA</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {simulation.nom} — {annees[0]}–{annees[annees.length - 1]}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {annees.map(annee => {
          const criteres = getCriteres(annee);
          const respectes = criteres.filter(c => c.respecte === true).length;
          const total = criteres.filter(c => c.respecte !== null).length;
          return (
            <Card key={annee}>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-foreground">{respectes}/{total}</div>
                <p className="text-sm text-muted-foreground mt-1">critères respectés en {annee}</p>
                <div className="mt-3">
                  <Badge variant={respectes === total && total > 0 ? 'default' : 'secondary'} className={respectes === total && total > 0 ? 'bg-success text-success-foreground' : ''}>
                    {total === 0 ? 'Données manquantes' : respectes === total ? 'Conforme' : 'Non conforme'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed table */}
      {[
        { label: 'Critères de premier rang', items: premierOrdre, ordre: 'premier' as const },
        { label: 'Critères de second rang', items: secondOrdre, ordre: 'second' as const },
      ].map(group => (
        <Card key={group.label} className="overflow-hidden">
          <CardHeader className="bg-muted/40 border-b border-border py-3">
            <CardTitle className="text-sm uppercase tracking-wider">{group.label}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-2.5 min-w-[280px]">Critère</th>
                  <th className="text-center px-4 py-2.5 min-w-[100px]">Norme</th>
                  {annees.map(a => (
                    <th key={a} className="text-center px-4 py-2.5 min-w-[120px]">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getCriteres(annees[0] || 0).filter(c => c.ordre === group.ordre).map(critere => (
                  <tr key={critere.code} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium text-foreground">{critere.libelle}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="font-mono text-xs">{critere.norme}</Badge>
                    </td>
                    {annees.map(annee => {
                      const c = getCriteres(annee).find(x => x.code === critere.code)!;
                      return (
                        <td key={annee} className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <StatusIcon respecte={c.respecte} />
                            <span className={`font-mono tabular-nums ${c.respecte === false ? 'text-destructive font-semibold' : c.respecte === true ? 'text-success' : 'text-muted-foreground'}`}>
                              {fmt(c.valeur)}{c.valeur !== null ? c.unite : ''}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground italic">
        Source des normes : Pacte de convergence, de stabilité, de croissance et de solidarité de l'UEMOA (Acte additionnel n° 04/99).
        Les critères sont calculés automatiquement à partir des données saisies dans les modules PIB, TOFE et Balance des paiements.
      </p>
    </div>
  );
};

export default ConvergencePage;
