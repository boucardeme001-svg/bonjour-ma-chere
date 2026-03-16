import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, getRoleLabel, type AppRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Loader2, Users } from 'lucide-react';

interface UserWithRole {
  user_id: string;
  email: string;
  nom: string;
  prenom: string;
  role: AppRole | null;
}

const GestionRoles = () => {
  const { isChefComptable, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data, error } = await supabase.rpc('list_all_users_for_admin');

    if (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
      setLoading(false);
      return;
    }

    const merged: UserWithRole[] = (data || []).map((u: any) => ({
      user_id: u.user_id,
      email: u.email || '',
      nom: u.nom || '',
      prenom: u.prenom || '',
      role: (u.role as AppRole) || null,
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    const existing = users.find(u => u.user_id === userId);
    if (!existing) return;

    // Upsert : supprimer l'ancien rôle puis insérer le nouveau
    if (existing.role) {
      await supabase.from('user_roles').delete().eq('user_id', userId);
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole } as any);

    if (error) {
      toast.error('Erreur lors de la modification du rôle');
      return;
    }

    toast.success(`Rôle mis à jour : ${getRoleLabel(newRole)}`);
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isChefComptable) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Accès réservé</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seul le Chef Comptable peut gérer les rôles des utilisateurs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case 'chef_comptable': return 'default';
      case 'comptable': return 'secondary';
      case 'assistant': return 'outline';
      default: return 'destructive' as const;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6" /> Gestion des rôles
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Attribuez un rôle à chaque utilisateur pour contrôler son accès aux modules
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            <strong>Assistant</strong> : lecture seule (plan comptable, journaux, grand livre, balance) —
            <strong> Comptable</strong> : accès complet sauf gestion des rôles —
            <strong> Chef Comptable</strong> : accès total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {(u.prenom?.[0] || '').toUpperCase()}{(u.nom?.[0] || '').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {u.prenom} {u.nom}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={roleBadgeVariant(u.role)}>
                    {u.role ? getRoleLabel(u.role) : 'Aucun rôle'}
                  </Badge>
                  <Select
                    value={u.role || ''}
                    onValueChange={(v) => handleRoleChange(u.user_id, v as AppRole)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Attribuer un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assistant">Assistant</SelectItem>
                      <SelectItem value="comptable">Comptable</SelectItem>
                      <SelectItem value="chef_comptable">Chef Comptable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail des accès par rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { role: 'Assistant', modules: ['Tableau de bord', 'Plan comptable', 'Journaux', 'Grand livre', 'Balance'] },
              { role: 'Comptable', modules: ['Tout sauf Gestion des rôles', 'Saisie écritures', 'Exercices', 'États financiers', 'Paie'] },
              { role: 'Chef Comptable', modules: ['Accès total', 'Gestion des rôles', 'Clôture exercices', 'Validation écritures'] },
            ].map((r) => (
              <div key={r.role} className="p-4 rounded-lg border bg-muted/30">
                <p className="font-semibold text-sm text-foreground mb-2">{r.role}</p>
                <ul className="space-y-1">
                  {r.modules.map((m) => (
                    <li key={m} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestionRoles;
