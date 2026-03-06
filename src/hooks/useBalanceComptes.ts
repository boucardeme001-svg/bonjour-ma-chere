import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SoldeCompte {
  numero: string;
  libelle: string;
  classe: number;
  solde: number; // positif = débit, négatif = crédit
}

export const useBalanceComptes = (exerciceId?: string) => {
  const { user } = useAuth();
  const [soldes, setSoldes] = useState<SoldeCompte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: comptes } = await supabase
        .from('comptes')
        .select('id, numero, libelle, classe')
        .eq('user_id', user.id)
        .order('numero');
      if (!comptes) { setLoading(false); return; }

      let query = supabase
        .from('lignes_ecriture')
        .select('compte_id, debit, credit, ecriture:ecritures!inner(user_id, exercice_id)')
        .eq('ecriture.user_id', user.id);

      if (exerciceId) {
        query = query.eq('ecriture.exercice_id', exerciceId);
      }

      const { data: lignes } = await query;

      const map = new Map<string, SoldeCompte>();
      comptes.forEach(c => map.set(c.id, { numero: c.numero, libelle: c.libelle, classe: c.classe, solde: 0 }));

      (lignes || []).forEach((l: any) => {
        const entry = map.get(l.compte_id);
        if (entry) {
          entry.solde += Number(l.debit) - Number(l.credit);
        }
      });

      const result: SoldeCompte[] = [];
      map.forEach(v => { if (v.solde !== 0) result.push(v); });
      result.sort((a, b) => a.numero.localeCompare(b.numero));
      setSoldes(result);
      setLoading(false);
    };
    fetch();
  }, [user, exerciceId]);

  return { soldes, loading };
};
