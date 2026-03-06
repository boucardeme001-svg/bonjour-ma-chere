import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';

interface EmployeForm {
  matricule: string;
  prenom: string;
  nom: string;
  date_naissance: string;
  lieu_naissance: string;
  sexe: string;
  situation_familiale: string;
  nombre_enfants: number;
  numero_css: string;
  numero_ipres: string;
  date_embauche: string;
  date_fin_contrat: string;
  type_contrat: string;
  poste: string;
  categorie: string;
  echelon: string;
  salaire_base: number;
  is_cadre: boolean;
}

const emptyForm: EmployeForm = {
  matricule: '', prenom: '', nom: '', date_naissance: '', lieu_naissance: '',
  sexe: 'M', situation_familiale: 'celibataire', nombre_enfants: 0,
  numero_css: '', numero_ipres: '', date_embauche: new Date().toISOString().split('T')[0],
  date_fin_contrat: '', type_contrat: 'CDI', poste: '', categorie: '', echelon: '',
  salaire_base: 0, is_cadre: false,
};

const Employes = () => {
  const { user } = useAuth();
  const [employes, setEmployes] = useState<any[]>([]);
  const [form, setForm] = useState<EmployeForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('employes').select('*').eq('user_id', user.id).order('nom');
    setEmployes(data || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.matricule || !form.prenom || !form.nom) {
      toast.error('Matricule, prénom et nom sont obligatoires');
      return;
    }

    const payload = {
      ...form,
      user_id: user.id,
      date_naissance: form.date_naissance || null,
      date_fin_contrat: form.date_fin_contrat || null,
      salaire_base: Number(form.salaire_base),
      nombre_enfants: Number(form.nombre_enfants),
    };

    if (editId) {
      const { error } = await supabase.from('employes').update(payload).eq('id', editId);
      if (error) { toast.error(error.message); return; }
      toast.success('Employé modifié');
    } else {
      const { error } = await supabase.from('employes').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Employé ajouté');
    }

    setForm(emptyForm);
    setEditId(null);
    setOpen(false);
    load();
  };

  const handleEdit = (emp: any) => {
    setForm({
      matricule: emp.matricule, prenom: emp.prenom, nom: emp.nom,
      date_naissance: emp.date_naissance || '', lieu_naissance: emp.lieu_naissance || '',
      sexe: emp.sexe, situation_familiale: emp.situation_familiale,
      nombre_enfants: emp.nombre_enfants, numero_css: emp.numero_css || '',
      numero_ipres: emp.numero_ipres || '', date_embauche: emp.date_embauche,
      date_fin_contrat: emp.date_fin_contrat || '', type_contrat: emp.type_contrat,
      poste: emp.poste || '', categorie: emp.categorie || '', echelon: emp.echelon || '',
      salaire_base: emp.salaire_base, is_cadre: emp.is_cadre,
    });
    setEditId(emp.id);
    setOpen(true);
  };

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('employes').update({ actif: !actif }).eq('id', id);
    load();
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Employés</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvel employé</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Modifier l\'employé' : 'Nouvel employé'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Matricule *</Label><Input value={form.matricule} onChange={e => setForm({ ...form, matricule: e.target.value })} placeholder="EMP-001" /></div>
              <div><Label>Prénom *</Label><Input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} /></div>
              <div><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
              <div><Label>Sexe</Label>
                <Select value={form.sexe} onValueChange={v => setForm({ ...form, sexe: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Date de naissance</Label><Input type="date" value={form.date_naissance} onChange={e => setForm({ ...form, date_naissance: e.target.value })} /></div>
              <div><Label>Lieu de naissance</Label><Input value={form.lieu_naissance} onChange={e => setForm({ ...form, lieu_naissance: e.target.value })} /></div>
              <div><Label>Situation familiale</Label>
                <Select value={form.situation_familiale} onValueChange={v => setForm({ ...form, situation_familiale: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celibataire">Célibataire</SelectItem>
                    <SelectItem value="marie">Marié(e)</SelectItem>
                    <SelectItem value="divorce">Divorcé(e)</SelectItem>
                    <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nombre d'enfants</Label><Input type="number" min={0} value={form.nombre_enfants} onChange={e => setForm({ ...form, nombre_enfants: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>N° CSS</Label><Input value={form.numero_css} onChange={e => setForm({ ...form, numero_css: e.target.value })} /></div>
              <div><Label>N° IPRES</Label><Input value={form.numero_ipres} onChange={e => setForm({ ...form, numero_ipres: e.target.value })} /></div>
              <div><Label>Date d'embauche *</Label><Input type="date" value={form.date_embauche} onChange={e => setForm({ ...form, date_embauche: e.target.value })} /></div>
              <div><Label>Type de contrat</Label>
                <Select value={form.type_contrat} onValueChange={v => setForm({ ...form, type_contrat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI</SelectItem>
                    <SelectItem value="CDD">CDD</SelectItem>
                    <SelectItem value="Stage">Stage</SelectItem>
                    <SelectItem value="Interim">Intérim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date fin contrat</Label><Input type="date" value={form.date_fin_contrat} onChange={e => setForm({ ...form, date_fin_contrat: e.target.value })} /></div>
              <div><Label>Poste</Label><Input value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} /></div>
              <div><Label>Catégorie</Label><Input value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} /></div>
              <div><Label>Échelon</Label><Input value={form.echelon} onChange={e => setForm({ ...form, echelon: e.target.value })} /></div>
              <div><Label>Salaire de base (FCFA)</Label><Input type="number" min={0} value={form.salaire_base} onChange={e => setForm({ ...form, salaire_base: parseFloat(e.target.value) || 0 })} /></div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_cadre} onCheckedChange={v => setForm({ ...form, is_cadre: v })} />
                <Label>Cadre (cotisation IPRES CRC)</Label>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave}>{editId ? 'Modifier' : 'Ajouter'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Matricule</TableHead>
              <TableHead>Nom complet</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead className="text-right">Salaire base</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Aucun employé enregistré</TableCell></TableRow>
            ) : employes.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-mono text-primary font-semibold">{emp.matricule}</TableCell>
                <TableCell>{emp.prenom} {emp.nom}{emp.is_cadre && <Badge variant="outline" className="ml-2 text-xs">Cadre</Badge>}</TableCell>
                <TableCell>{emp.poste || '—'}</TableCell>
                <TableCell>{emp.type_contrat}</TableCell>
                <TableCell className="text-right font-mono">{fmt(Number(emp.salaire_base))}</TableCell>
                <TableCell>
                  <Badge variant={emp.actif ? 'default' : 'secondary'}>{emp.actif ? 'Actif' : 'Inactif'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleActif(emp.id, emp.actif)}>
                      {emp.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Employes;
