
-- Create exercice comptable (fiscal year)
CREATE TABLE public.exercices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  libelle TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  cloture BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exercices" ON public.exercices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plan comptable SYSCOHADA
CREATE TABLE public.comptes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  libelle TEXT NOT NULL,
  classe INTEGER NOT NULL CHECK (classe BETWEEN 1 AND 9),
  type TEXT NOT NULL CHECK (type IN ('bilan', 'gestion', 'hors_bilan')),
  nature TEXT NOT NULL CHECK (nature IN ('debit', 'credit')),
  actif BOOLEAN NOT NULL DEFAULT true,
  parent_numero TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comptes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own comptes" ON public.comptes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_comptes_numero ON public.comptes(user_id, numero);
CREATE INDEX idx_comptes_classe ON public.comptes(user_id, classe);

-- Journaux comptables
CREATE TABLE public.journaux (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('achat', 'vente', 'banque', 'caisse', 'operations_diverses', 'a_nouveau')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journaux" ON public.journaux FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ecritures comptables (header)
CREATE TABLE public.ecritures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercice_id UUID NOT NULL REFERENCES public.exercices(id),
  journal_id UUID NOT NULL REFERENCES public.journaux(id),
  date_ecriture DATE NOT NULL,
  numero_piece TEXT,
  libelle TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'validee')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ecritures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ecritures" ON public.ecritures FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ecritures_date ON public.ecritures(user_id, date_ecriture);
CREATE INDEX idx_ecritures_journal ON public.ecritures(journal_id);

-- Lignes d'ecritures (detail lines)
CREATE TABLE public.lignes_ecriture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ecriture_id UUID NOT NULL REFERENCES public.ecritures(id) ON DELETE CASCADE,
  compte_id UUID NOT NULL REFERENCES public.comptes(id),
  libelle TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

ALTER TABLE public.lignes_ecriture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lignes via ecriture" ON public.lignes_ecriture FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.ecritures WHERE ecritures.id = lignes_ecriture.ecriture_id AND ecritures.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ecritures WHERE ecritures.id = lignes_ecriture.ecriture_id AND ecritures.user_id = auth.uid()));

CREATE INDEX idx_lignes_ecriture ON public.lignes_ecriture(ecriture_id);
CREATE INDEX idx_lignes_compte ON public.lignes_ecriture(compte_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
