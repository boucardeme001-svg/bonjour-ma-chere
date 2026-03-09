import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Search, Upload } from 'lucide-react';

// Default SYSCOHADA accounts for Senegal
const DEFAULT_ACCOUNTS = [
  { numero: '10', libelle: 'Capital', classe: 1, type: 'bilan', nature: 'credit' },
  { numero: '101', libelle: 'Capital social', classe: 1, type: 'bilan', nature: 'credit' },
  { numero: '12', libelle: 'Report à nouveau', classe: 1, type: 'bilan', nature: 'credit' },
  { numero: '13', libelle: 'Résultat net de l\'exercice', classe: 1, type: 'bilan', nature: 'credit' },
  { numero: '16', libelle: 'Emprunts et dettes assimilées', classe: 1, type: 'bilan', nature: 'credit' },
  { numero: '21', libelle: 'Immobilisations corporelles', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '211', libelle: 'Terrains', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '213', libelle: 'Bâtiments', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '215', libelle: 'Installations techniques', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '218', libelle: 'Autres immobilisations corporelles', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '24', libelle: 'Matériel', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '244', libelle: 'Matériel et mobilier', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '245', libelle: 'Matériel de transport', classe: 2, type: 'bilan', nature: 'debit' },
  { numero: '28', libelle: 'Amortissements', classe: 2, type: 'bilan', nature: 'credit' },
  { numero: '31', libelle: 'Marchandises', classe: 3, type: 'bilan', nature: 'debit' },
  { numero: '32', libelle: 'Matières premières', classe: 3, type: 'bilan', nature: 'debit' },
  { numero: '40', libelle: 'Fournisseurs et comptes rattachés', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '401', libelle: 'Fournisseurs', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '41', libelle: 'Clients et comptes rattachés', classe: 4, type: 'bilan', nature: 'debit' },
  { numero: '411', libelle: 'Clients', classe: 4, type: 'bilan', nature: 'debit' },
  { numero: '42', libelle: 'Personnel', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '421', libelle: 'Personnel, rémunérations dues', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '43', libelle: 'Organismes sociaux', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '431', libelle: 'Sécurité sociale (CSS/IPRES)', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '44', libelle: 'État et collectivités publiques', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '441', libelle: 'État, impôt sur les bénéfices', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '443', libelle: 'État, TVA facturée', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '445', libelle: 'État, TVA récupérable', classe: 4, type: 'bilan', nature: 'debit' },
  { numero: '447', libelle: 'État, impôts retenus à la source', classe: 4, type: 'bilan', nature: 'credit' },
  { numero: '52', libelle: 'Banques', classe: 5, type: 'bilan', nature: 'debit' },
  { numero: '521', libelle: 'Banques locales', classe: 5, type: 'bilan', nature: 'debit' },
  { numero: '57', libelle: 'Caisse', classe: 5, type: 'bilan', nature: 'debit' },
  { numero: '571', libelle: 'Caisse siège social', classe: 5, type: 'bilan', nature: 'debit' },
  { numero: '60', libelle: 'Achats et variations de stocks', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '601', libelle: 'Achats de marchandises', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '602', libelle: 'Achats de matières premières', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '61', libelle: 'Transports', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '62', libelle: 'Services extérieurs', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '63', libelle: 'Autres services extérieurs', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '64', libelle: 'Impôts et taxes', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '66', libelle: 'Charges de personnel', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '661', libelle: 'Rémunérations directes', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '664', libelle: 'Charges sociales', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '67', libelle: 'Frais financiers', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '68', libelle: 'Dotations aux amortissements', classe: 6, type: 'gestion', nature: 'debit' },
  { numero: '70', libelle: 'Ventes', classe: 7, type: 'gestion', nature: 'credit' },
  { numero: '701', libelle: 'Ventes de marchandises', classe: 7, type: 'gestion', nature: 'credit' },
  { numero: '702', libelle: 'Ventes de produits finis', classe: 7, type: 'gestion', nature: 'credit' },
  { numero: '706', libelle: 'Services vendus', classe: 7, type: 'gestion', nature: 'credit' },
  { numero: '71', libelle: 'Subventions d\'exploitation', classe: 7, type: 'gestion', nature: 'credit' },
  { numero: '77', libelle: 'Revenus financiers', classe: 7, type: 'gestion', nature: 'credit' },
  { numero: '81', libelle: 'Valeurs comptables des cessions', classe: 8, type: 'gestion', nature: 'debit' },
  { numero: '82', libelle: 'Produits des cessions d\'immobilisations', classe: 8, type: 'gestion', nature: 'credit' },
];

const CLASSES = [
  { value: 1, label: '1 - Capitaux propres' },
  { value: 2, label: '2 - Immobilisations' },
  { value: 3, label: '3 - Stocks' },
  { value: 4, label: '4 - Tiers' },
  { value: 5, label: '5 - Trésorerie' },
  { value: 6, label: '6 - Charges' },
  { value: 7, label: '7 - Produits' },
  { value: 8, label: '8 - Comptes spéciaux' },
];

const PlanComptable = () => {
  const { user } = useAuth();
  const [comptes, setComptes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ numero: '', libelle: '', classe: 1, type: 'bilan', nature: 'debit' });

  const fetchComptes = async () => {
    if (!user) return;
    const { data } = await supabase.from('comptes').select('*').eq('user_id', user.id).order('numero');
    if (data && data.length === 0) {
      await autoInitialize();
    } else {
      setComptes(data || []);
    }
  };

  const autoInitialize = async () => {
    if (!user) return;
    setLoading(true);
    const rows = DEFAULT_ACCOUNTS.map((a) => ({ ...a, user_id: user.id }));
    const { error } = await supabase.from('comptes').insert(rows);
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success(`${rows.length} comptes SYSCOHADA importés automatiquement !`);
      const { data } = await supabase.from('comptes').select('*').eq('user_id', user.id).order('numero');
      setComptes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchComptes(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    const { error } = await supabase.from('comptes').insert({ ...form, user_id: user.id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Compte ajouté');
      setDialogOpen(false);
      setForm({ numero: '', libelle: '', classe: 1, type: 'bilan', nature: 'debit' });
      fetchComptes();
    }
  };

  const filtered = comptes.filter((c) => {
    const matchSearch = c.numero.includes(search) || c.libelle.toLowerCase().includes(search.toLowerCase());
    const matchClasse = filterClasse === 'all' || c.classe === parseInt(filterClasse);
    return matchSearch && matchClasse;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Plan comptable SYSCOHADA</h1>
        <div className="flex gap-2">
          {comptes.length === 0 && (
            <Button onClick={handleInitialize} disabled={loading} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Initialisation...' : 'Initialiser SYSCOHADA'}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau compte</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Numéro</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="601" /></div>
                  <div>
                    <Label>Classe</Label>
                    <Select value={String(form.classe)} onValueChange={(v) => setForm({ ...form, classe: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CLASSES.map((c) => <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Libellé</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Achats de marchandises" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bilan">Bilan</SelectItem>
                        <SelectItem value="gestion">Gestion</SelectItem>
                        <SelectItem value="hors_bilan">Hors bilan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nature</Label>
                    <Select value={form.nature} onValueChange={(v) => setForm({ ...form, nature: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Débit</SelectItem>
                        <SelectItem value="credit">Crédit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full">Ajouter le compte</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par numéro ou libellé..." className="pl-10" />
        </div>
        <Select value={filterClasse} onValueChange={setFilterClasse}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {CLASSES.map((c) => <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead className="w-24">Numéro</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-20">Classe</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-20">Nature</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {comptes.length === 0 ? "Aucun compte. Cliquez sur 'Initialiser SYSCOHADA' pour charger le plan comptable." : 'Aucun résultat'}
              </TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium text-primary">{c.numero}</TableCell>
                <TableCell className={c.numero.length <= 2 ? 'font-semibold' : ''}>{c.libelle}</TableCell>
                <TableCell>{c.classe}</TableCell>
                <TableCell className="capitalize">{c.type === 'hors_bilan' ? 'Hors bilan' : c.type}</TableCell>
                <TableCell className={c.nature === 'debit' ? 'amount-debit' : 'amount-credit'}>{c.nature === 'debit' ? 'Débit' : 'Crédit'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default PlanComptable;
