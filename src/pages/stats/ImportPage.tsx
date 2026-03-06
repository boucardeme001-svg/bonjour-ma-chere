import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import { parseCSV } from '@/lib/statistics';
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
  useState(() => {
    const listener = () => setTick(t => t + 1);
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  });
  return _datasets;
}

const ImportPage = () => {
  const datasets = useDatasets();
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');

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

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importer des données</h1>
        <p className="text-muted-foreground mt-1">Chargez un fichier CSV ou collez vos données séparées par des virgules ou points-virgules</p>
      </div>

      <Card className="p-5 space-y-4">
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
          rows={8}
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
