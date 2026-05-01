import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'assistant' | 'comptable' | 'chef_comptable';

// Définition des accès par module pour chaque rôle
const MODULE_ACCESS: Record<AppRole, string[]> = {
  assistant: ['/', '/plan-comptable', '/journaux', '/grand-livre', '/balance'],
  comptable: ['/', '/plan-comptable', '/journaux', '/ecritures', '/import-ia', '/grand-livre', '/balance', '/exercices', '/bilan', '/compte-resultat', '/tafire', '/employes', '/bulletins-paie', '/etats-paie'],
  chef_comptable: ['/', '/plan-comptable', '/journaux', '/ecritures', '/import-ia', '/grand-livre', '/balance', '/exercices', '/bilan', '/compte-resultat', '/tafire', '/employes', '/bulletins-paie', '/etats-paie', '/gestion-roles'],
};

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase.rpc('get_user_role', { _user_id: user.id });
      if (!error && data) {
        setRole(data as AppRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const hasAccess = (path: string): boolean => {
    if (!role) return false;
    return MODULE_ACCESS[role].includes(path);
  };

  const isChefComptable = role === 'chef_comptable';
  const isComptable = role === 'comptable' || role === 'chef_comptable';

  return { role, loading, hasAccess, isChefComptable, isComptable };
};

export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'chef_comptable': return 'Chef Comptable';
    case 'comptable': return 'Comptable';
    case 'assistant': return 'Assistant';
    default: return role;
  }
};
