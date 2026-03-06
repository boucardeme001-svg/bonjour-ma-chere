
-- Table des scénarios de simulation
CREATE TABLE public.simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  annee_base INTEGER NOT NULL DEFAULT 2024,
  horizon INTEGER NOT NULL DEFAULT 3,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des valeurs par indicateur/année
CREATE TABLE public.simulation_valeurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'tofe', 'pib', 'bdp', 'monetaire'
  indicateur TEXT NOT NULL,
  annee INTEGER NOT NULL,
  valeur NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(simulation_id, module, indicateur, annee)
);

-- RLS
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_valeurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own simulations" ON public.simulations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own simulation_valeurs" ON public.simulation_valeurs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.simulations WHERE simulations.id = simulation_valeurs.simulation_id AND simulations.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.simulations WHERE simulations.id = simulation_valeurs.simulation_id AND simulations.user_id = auth.uid())
);

-- Trigger updated_at
CREATE TRIGGER update_simulations_updated_at BEFORE UPDATE ON public.simulations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
