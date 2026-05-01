import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, FileImage, FileText, Upload, Save } from 'lucide-react';

interface ExtractedInvoice {
  fournisseur: string;
  numero_piece?: string;
  date_facture: string;
  libelle: string;
  montant_ttc: number;
  type_journal: string;
  lignes: { compte_numero: string; libelle: string; debit: number; credit: number }[];
  confiance: string;
}

interface BankResult {
  compte_banque: string;
  operations: {
    date: string; libelle: string; montant: number; sens: 'debit' | 'credit';
    compte_contrepartie: string; confiance: string;
  }[];
}

const ImportIA = () => {
  const { user } = useAuth();
  const [comptes, setComptes] = useState<any[]>([]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [exerciceId, setExerciceId] = useState('');

  // Facture
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [extracting, setExtracting] = useState(false);
  const [invoice, setInvoice] = useState<ExtractedInvoice | null>(null);

  // Relevé bancaire
  const [statementText, setStatementText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [bankResult, setBankResult] = useState<BankResult | null>(null);
  const [bankJournalId, setBankJournalId] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [c, j, e] = await Promise.all([
        supabase.from('comptes').select('id, numero, libelle').eq('user_id', user.id).eq('actif', true).order('numero'),
        supabase.from('journaux').select('*').eq('user_id', user.id).order('code'),
        supabase.from('exercices').select('*').eq('user_id', user.id).eq('cloture', false).order('date_debut'),
      ]);
      setComptes(c.data || []);
      setJournaux(j.data || []);
      setExercices(e.data || []);
      if (e.data?.[0]) setExerciceId(e.data[0].id);
    })();
  }, [user]);

  const onFileChange = (f: File | null) => {
    setFile(f);
    setInvoice(null);
    if (f && f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview('');
    }
  };

  const fileToBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const extraireFacture = async () => {
    if (!file) { toast.error('Sélectionne une image de facture'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Seules les images sont supportées (JPG, PNG)'); return; }
    setExtracting(true);
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('ia-comptable', {
        body: {
          action: 'extract_invoice',
          payload: {
            imageBase64: b64,
            mimeType: file.type,
            comptes: comptes.map((c) => ({ numero: c.numero, libelle: c.libelle })),
          },
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setInvoice(data);
      toast.success(`Facture analysée (confiance: ${data.confiance})`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'extraction');
    } finally {
      setExtracting(false);
    }
  };

  const enregistrerFacture = async () => {
    if (!invoice || !user || !exerciceId) return;
    const journal = journaux.find((j) => j.code === invoice.type_journal) || journaux[0];
    if (!journal) { toast.error('Aucun journal disponible'); return; }

    setSaving(true);
    try {
      const { data: ec, error } = await supabase.from('ecritures').insert({
        user_id: user.id,
        exercice_id: exerciceId,
        journal_id: journal.id,
        date_ecriture: invoice.date_facture,
        numero_piece: invoice.numero_piece || null,
        libelle: `[IA] ${invoice.libelle}`,
        statut: 'brouillon',
      }).select().single();
      if (error || !ec) throw error;

      const lignesData = invoice.lignes
        .map((l) => {
          const compte = comptes.find((c) => c.numero === l.compte_numero);
          if (!compte) return null;
          return {
            ecriture_id: ec.id,
            compte_id: compte.id,
            libelle: l.libelle,
            debit: l.debit || 0,
            credit: l.credit || 0,
          };
        })
        .filter(Boolean);

      if (lignesData.length === 0) { toast.error('Aucun compte reconnu'); return; }

      const { error: e2 } = await supabase.from('lignes_ecriture').insert(lignesData as any);
      if (e2) throw e2;
      toast.success('Écriture créée en brouillon');
      setInvoice(null);
      setFile(null);
      setPreview('');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const analyserReleve = async () => {
    if (!statementText.trim()) { toast.error('Colle le contenu du relevé bancaire'); return; }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ia-comptable', {
        body: {
          action: 'parse_bank_statement',
          payload: {
            texte: statementText.slice(0, 15000),
            comptes: comptes.map((c) => ({ numero: c.numero, libelle: c.libelle })),
          },
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setBankResult(data);
      toast.success(`${data.operations.length} opération(s) analysée(s)`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setAnalyzing(false);
    }
  };

  const enregistrerReleve = async () => {
    if (!bankResult || !user || !exerciceId || !bankJournalId) {
      toast.error('Sélectionne un journal de banque'); return;
    }
    const compteBanque = comptes.find((c) => c.numero === bankResult.compte_banque);
    if (!compteBanque) { toast.error(`Compte banque ${bankResult.compte_banque} introuvable`); return; }

    setSaving(true);
    let ok = 0, ko = 0;
    for (const op of bankResult.operations) {
      const contrepartie = comptes.find((c) => c.numero === op.compte_contrepartie);
      if (!contrepartie) { ko++; continue; }

      const { data: ec, error } = await supabase.from('ecritures').insert({
        user_id: user.id,
        exercice_id: exerciceId,
        journal_id: bankJournalId,
        date_ecriture: op.date,
        libelle: `[IA] ${op.libelle}`,
        statut: 'brouillon',
      }).select().single();
      if (error || !ec) { ko++; continue; }

      const lignes = op.sens === 'debit'
        ? [
            { ecriture_id: ec.id, compte_id: compteBanque.id, libelle: op.libelle, debit: op.montant, credit: 0 },
            { ecriture_id: ec.id, compte_id: contrepartie.id, libelle: op.libelle, debit: 0, credit: op.montant },
          ]
        : [
            { ecriture_id: ec.id, compte_id: contrepartie.id, libelle: op.libelle, debit: op.montant, credit: 0 },
            { ecriture_id: ec.id, compte_id: compteBanque.id, libelle: op.libelle, debit: 0, credit: op.montant },
          ];
      const { error: e2 } = await supabase.from('lignes_ecriture').insert(lignes);
      if (e2) ko++; else ok++;
    }
    setSaving(false);
    toast.success(`${ok} écriture(s) créée(s)${ko ? `, ${ko} ignorée(s)` : ''}`);
    setBankResult(null);
    setStatementText('');
  };

  const confianceColor = (c: string) => c === 'elevee' ? 'default' : c === 'moyenne' ? 'secondary' : 'destructive';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-primary" />
        <h1 className="page-header mb-0">Enregistrement automatique par IA</h1>
      </div>
      <p className="text-muted-foreground -mt-2">Extrais des écritures depuis une facture ou un relevé bancaire. Toutes les écritures sont créées en brouillon pour validation.</p>

      <Card className="p-4">
        <Label>Exercice</Label>
        <Select value={exerciceId} onValueChange={setExerciceId}>
          <SelectTrigger className="max-w-xs"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
          <SelectContent>{exercices.map((e) => <SelectItem key={e.id} value={e.id}>{e.libelle}</SelectItem>)}</SelectContent>
        </Select>
      </Card>

      <Tabs defaultValue="facture">
        <TabsList>
          <TabsTrigger value="facture"><FileImage className="w-4 h-4 mr-2" />Facture (image)</TabsTrigger>
          <TabsTrigger value="banque"><FileText className="w-4 h-4 mr-2" />Relevé bancaire</TabsTrigger>
        </TabsList>

        <TabsContent value="facture" className="space-y-4">
          <Card className="p-6">
            <Label>Image de facture (JPG/PNG)</Label>
            <Input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] || null)} className="mt-2" />
            {preview && <img src={preview} alt="Aperçu facture" className="mt-4 max-h-80 rounded border" />}
            <div className="flex justify-end mt-4">
              <Button onClick={extraireFacture} disabled={!file || extracting}>
                <Sparkles className="w-4 h-4 mr-2" />{extracting ? 'Analyse en cours...' : 'Extraire avec l\'IA'}
              </Button>
            </div>
          </Card>

          {invoice && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Écriture proposée</h3>
                <Badge variant={confianceColor(invoice.confiance) as any}>Confiance: {invoice.confiance}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground">Fournisseur:</span> <strong>{invoice.fournisseur}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> <strong>{invoice.date_facture}</strong></div>
                <div><span className="text-muted-foreground">N° pièce:</span> <strong>{invoice.numero_piece || '—'}</strong></div>
                <div><span className="text-muted-foreground">TTC:</span> <strong>{invoice.montant_ttc.toLocaleString('fr-FR')} FCFA</strong></div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Compte</TableHead><TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Débit</TableHead><TableHead className="text-right">Crédit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lignes.map((l, i) => {
                    const c = comptes.find((x) => x.numero === l.compte_numero);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{l.compte_numero} {c ? `- ${c.libelle}` : <span className="text-destructive">(introuvable)</span>}</TableCell>
                        <TableCell>{l.libelle}</TableCell>
                        <TableCell className="text-right font-mono">{l.debit ? l.debit.toLocaleString('fr-FR') : ''}</TableCell>
                        <TableCell className="text-right font-mono">{l.credit ? l.credit.toLocaleString('fr-FR') : ''}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button onClick={enregistrerFacture} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />Créer l'écriture (brouillon)
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="banque" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Journal de banque</Label>
              <Select value={bankJournalId} onValueChange={setBankJournalId}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Choisir un journal..." /></SelectTrigger>
                <SelectContent>{journaux.filter((j) => j.type === 'banque' || j.code?.startsWith('BQ')).concat(journaux.filter((j) => j.type !== 'banque' && !j.code?.startsWith('BQ'))).map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.code} - {j.libelle}</SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contenu du relevé (texte ou CSV)</Label>
              <Textarea
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                placeholder="Colle ici les lignes du relevé bancaire (date, libellé, montant, sens...)"
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={analyserReleve} disabled={analyzing || !statementText.trim()}>
                <Sparkles className="w-4 h-4 mr-2" />{analyzing ? 'Analyse...' : 'Analyser avec l\'IA'}
              </Button>
            </div>
          </Card>

          {bankResult && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{bankResult.operations.length} opération(s) — Banque {bankResult.compte_banque}</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Date</TableHead><TableHead>Libellé</TableHead>
                    <TableHead>Contrepartie</TableHead>
                    <TableHead>Sens</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Confiance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankResult.operations.map((op, i) => {
                    const c = comptes.find((x) => x.numero === op.compte_contrepartie);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{op.date}</TableCell>
                        <TableCell>{op.libelle}</TableCell>
                        <TableCell className="font-mono text-xs">{op.compte_contrepartie} {c ? '' : <span className="text-destructive">(?)</span>}</TableCell>
                        <TableCell><Badge variant={op.sens === 'debit' ? 'default' : 'secondary'}>{op.sens}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{op.montant.toLocaleString('fr-FR')}</TableCell>
                        <TableCell><Badge variant={confianceColor(op.confiance) as any}>{op.confiance}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button onClick={enregistrerReleve} disabled={saving || !bankJournalId}>
                  <Save className="w-4 h-4 mr-2" />Créer les écritures (brouillon)
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportIA;