import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Trash2, Database } from 'lucide-react';
import { parseCSV } from '@/lib/statistics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MODULES, ModuleKey, evalFormule } from '@/lib/macro-indicators';
import { toast } from 'sonner';

export interface DataSet {
  name: string;
  headers: string[];
  data: number[][];
}

// Shared state for datasets (simple module-level store)
let _datasets: DataSet[] = [];
let _listeners: (() => void)[] = [];

export function getDatasets() { return _datasets; }
export function addDataset(ds: DataSet) { _datasets = [..._datasets, ds]; _listeners.forEach(l => l()); }
export function removeDataset(idx: number) { _datasets = _datasets.filter((_, i) => i !== idx); _listeners.forEach(l => l()); }
export function useDatasets() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);
  return _datasets;
}

const ImportPage = () => {
  const datasets = useDatasets();
  const { user } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [simulations, setSimulations] = useState<any[]>([]);
  const [selectedSim, setSelectedSim] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [loadingSim, setLoadingSim] = useState(false);

  // Load user simulations
  useEffect(() => {
    if (!user) return;
    supabase.from('simulations').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSimulations(data); });
  }, [user]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || '');
    reader.readAsText(file);
  }, []);

  const handleImport = () => {
    if (!csvText.trim()) { toast.error('Collez ou importez des données CSV'); return; }
    const { headers, data } = parseCSV(csvText);
    if (headers.length === 0 || data.length === 0) { toast.error('Données CSV invalides'); return; }
    const name = fileName || `Dataset ${datasets.length + 1}`;
    addDataset({ name, headers, data });
    toast.success(`${data.length} observations importées (${headers.length} variables)`);
    setCsvText('');
    setFileName('');
  };

  const handleImportSimulation = async () => {
    if (!selectedSim || !selectedModule) { toast.error('Sélectionnez une simulation et un module'); return; }
    setLoadingSim(true);
    try {
      const [simRes, valRes] = await Promise.all([
        supabase.from('simulations').select('*').eq('id', selectedSim).single(),
        supabase.from('simulation_valeurs').select('*').eq('simulation_id', selectedSim).eq('module', selectedModule),
      ]);
      if (simRes.error || !simRes.data) throw new Error('Simulation introuvable');
      const sim = simRes.data;
      const valeurs = valRes.data || [];

      const mod = MODULES[selectedModule as ModuleKey];
      const annees = Array.from({ length: sim.horizon || 3 }, (_, i) => sim.annee_base + i);

      // Build value map
      const valMap: Record<string, number> = {};
      valeurs.forEach((r: any) => { valMap[`${r.indicateur}_${r.annee}`] = Number(r.valeur); });

      // Build dataset: rows = years, columns = indicators
      const headers = ['Année', ...mod.indicateurs.map(ind => ind.libelle.trim())];
      const data: number[][] = annees.map(annee => {
        // First pass: get input values
        const yearVals: Record<string, number> = {};
        mod.indicateurs.forEach(ind => {
          if (ind.type === 'input') {
            yearVals[ind.code] = valMap[`${ind.code}_${annee}`] ?? 0;
          }
        });
        // Second pass: compute calculated values
        mod.indicateurs.forEach(ind => {
          if (ind.type === 'calcul' && ind.formule) {
            yearVals[ind.code] = evalFormule(ind.formule, yearVals);
          }
        });

        return [annee, ...mod.indicateurs.map(ind => yearVals[ind.code] ?? 0)];
      });

      const name = `${sim.nom} — ${mod.label}`;
      addDataset({ name, headers, data });
      toast.success(`${annees.length} observations importées depuis "${sim.nom}" (${mod.label})`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors du chargement');
    } finally {
      setLoadingSim(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importer des données</h1>
        <p className="text-muted-foreground mt-1">Depuis vos simulations macro ou un fichier CSV</p>
      </div>

      {/* Import from simulation */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Depuis une simulation macro</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Simulation</label>
            <Select value={selectedSim} onValueChange={setSelectedSim}>
              <SelectTrigger><SelectValue placeholder="Choisir une simulation" /></SelectTrigger>
              <SelectContent>
                {simulations.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nom} ({s.annee_base}–{s.annee_base + s.horizon - 1})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Module</label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger><SelectValue placeholder="Choisir un module" /></SelectTrigger>
              <SelectContent>
                {Object.entries(MODULES).map(([key, mod]) => (
                  <SelectItem key={key} value={key}>{mod.icon} {mod.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleImportSimulation} disabled={!selectedSim || !selectedModule || loadingSim}>
          <Database className="w-4 h-4 mr-2" /> {loadingSim ? 'Chargement...' : 'Importer les données'}
        </Button>
      </Card>

      {/* Import CSV */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Depuis un fichier CSV</h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-muted text-sm font-medium">
              <Upload className="w-4 h-4" /> Choisir un fichier CSV
            </div>
          </label>
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
        </div>

        <Textarea
          placeholder="Ou collez vos données CSV ici...&#10;Année;PIB;Inflation&#10;2020;15000;2.1&#10;2021;15800;2.5"
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={6}
          className="font-mono text-xs"
        />

        <Button onClick={handleImport} disabled={!csvText.trim()}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Importer
        </Button>
      </Card>

      {datasets.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-foreground mb-3">Jeux de données chargés</h2>
          <div className="space-y-2">
            {datasets.map((ds, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{ds.name}</span>
                  <Badge variant="secondary">{ds.data.length} obs.</Badge>
                  <Badge variant="outline">{ds.headers.length} var.</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { removeDataset(i); toast.info('Dataset supprimé'); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportPage;
