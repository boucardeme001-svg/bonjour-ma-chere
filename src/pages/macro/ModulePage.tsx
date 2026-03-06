import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Save, TrendingUp, Landmark, Globe, Banknote } from 'lucide-react';
import { MODULES, ModuleKey, Indicateur, evalFormule } from '@/lib/macro-indicators';
import MacroCharts from '@/components/MacroCharts';

const MODULE_ICONS: Record<string, typeof TrendingUp> = {
  pib: TrendingUp, tofe: Landmark, bdp: Globe, monetaire: Banknote,
};

const ModulePage = () => {
  const { simulationId, moduleKey } = useParams<{ simulationId: string; moduleKey: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [simulation, setSimulation] = useState<any>(null);
  const [valeurs, setValeurs] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const mod = MODULES[moduleKey as ModuleKey];
  const Icon = MODULE_ICONS[moduleKey || ''] || TrendingUp;

  const annees = useMemo(() => {
    if (!simulation) return [];
    const base = simulation.annee_base;
    return Array.from({ length: simulation.horizon || 3 }, (_, i) => base + i);
  }, [simulation]);

  // Load simulation + values
  useEffect(() => {
    if (!user || !simulationId || !moduleKey) return;
    (async () => {
      const [s, v] = await Promise.all([
        supabase.from('simulations').select('*').eq('id', simulationId).single(),
        supabase.from('simulation_valeurs').select('*').eq('simulation_id', simulationId).eq('module', moduleKey),
      ]);
      if (s.error) { toast.error('Simulation introuvable'); navigate('/macro'); return; }
      setSimulation(s.data);
      const map: Record<string, number> = {};
      (v.data || []).forEach((r: any) => { map[`${r.indicateur}_${r.annee}`] = Number(r.valeur); });
      setValeurs(map);
    })();
  }, [user, simulationId, moduleKey]);

  const getVal = useCallback((code: string, annee: number): number => {
    return valeurs[`${code}_${annee}`] ?? 0;
  }, [valeurs]);

  const setVal = useCallback((code: string, annee: number, value: number) => {
    setValeurs(prev => ({ ...prev, [`${code}_${annee}`]: value }));
  }, []);

  // Compute calculated fields
  const getDisplayVal = useCallback((ind: Indicateur, annee: number): number => {
    if (ind.type === 'calcul' && ind.formule) {
      const yearVals: Record<string, number> = {};
      mod.indicateurs.forEach(i => {
        if (i.type === 'calcul' && i.formule && i.code !== ind.code) {
          yearVals[i.code] = evalFormule(i.formule, { ...yearVals, ...Object.fromEntries(mod.indicateurs.filter(x => x.type === 'input').map(x => [x.code, getVal(x.code, annee)])) });
        } else {
          yearVals[i.code] = getVal(i.code, annee);
        }
      });
      return evalFormule(ind.formule, yearVals);
    }
    return getVal(ind.code, annee);
  }, [getVal, mod]);

  const handleSave = async () => {
    if (!simulationId || !moduleKey) return;
    setSaving(true);
    try {
      // Delete existing values for this module
      await supabase.from('simulation_valeurs').delete().eq('simulation_id', simulationId).eq('module', moduleKey);

      // Insert all non-zero input values
      const rows: any[] = [];
      mod.indicateurs.filter(i => i.type === 'input').forEach(ind => {
        annees.forEach(annee => {
          const v = getVal(ind.code, annee);
          if (v !== 0) {
            rows.push({ simulation_id: simulationId, module: moduleKey, indicateur: ind.code, annee, valeur: v });
          }
        });
      });

      if (rows.length > 0) {
        const { error } = await supabase.from('simulation_valeurs').insert(rows);
        if (error) throw error;
      }
      toast.success('Données enregistrées');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!mod) return <div className="p-6 text-center text-muted-foreground">Module introuvable</div>;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

  // Group indicators by category
  const categories = [...new Set(mod.indicateurs.map(i => i.categorie))];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/macro')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              <h1 className="page-header">{mod.label}</h1>
            </div>
            {simulation && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {simulation.nom} — {annees[0]}–{annees[annees.length - 1]}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />{saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      {categories.map(cat => (
        <Card key={cat} className="overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{cat}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-4 py-2.5 min-w-[250px]">Indicateur</th>
                  {annees.map(a => (
                    <th key={a} className="text-right px-4 py-2.5 min-w-[130px]">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mod.indicateurs.filter(i => i.categorie === cat).map(ind => {
                  const isCalc = ind.type === 'calcul';
                  return (
                    <tr key={ind.code} className={`border-b border-border/40 ${isCalc ? 'bg-muted/20 font-semibold' : 'hover:bg-muted/10'}`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={isCalc ? 'text-foreground' : 'text-foreground/90'}>{ind.libelle}</span>
                          {isCalc && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">auto</Badge>}
                          {ind.unite === 'pourcentage' && <span className="text-xs text-muted-foreground">%</span>}
                        </div>
                      </td>
                      {annees.map(annee => (
                        <td key={annee} className="px-4 py-1.5 text-right">
                          {isCalc ? (
                            <span className={`font-mono tabular-nums ${getDisplayVal(ind, annee) < 0 ? 'text-destructive' : ''}`}>
                              {fmt(getDisplayVal(ind, annee))}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              className="text-right font-mono tabular-nums h-8 w-full max-w-[120px] ml-auto"
                              value={getVal(ind.code, annee) || ''}
                              onChange={e => setVal(ind.code, annee, Number(e.target.value) || 0)}
                              placeholder="0"
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {annees.length > 0 && (
        <MacroCharts
          indicateurs={mod.indicateurs}
          annees={annees}
          getDisplayVal={getDisplayVal}
        />
      )}
    </div>
  );
};

export default ModulePage;
