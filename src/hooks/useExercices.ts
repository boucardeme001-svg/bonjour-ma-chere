import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Exercice { id: string; libelle: string; date_debut: string; date_fin: string; cloture: boolean; }

export const useExercices = () => {
  const { user } = useAuth();
  const [exercices, setExercices] = useState<Exercice[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('exercices').select('*').eq('user_id', user.id).order('date_debut', { ascending: false })
      .then(({ data }) => setExercices(data || []));
  }, [user]);

  return exercices;
};
