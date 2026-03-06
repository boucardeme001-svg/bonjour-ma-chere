
-- Table des employés
CREATE TABLE public.employes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  matricule TEXT NOT NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  date_naissance DATE,
  lieu_naissance TEXT,
  sexe TEXT NOT NULL DEFAULT 'M',
  situation_familiale TEXT NOT NULL DEFAULT 'celibataire',
  nombre_enfants INTEGER NOT NULL DEFAULT 0,
  numero_css TEXT,
  numero_ipres TEXT,
  date_embauche DATE NOT NULL,
  date_fin_contrat DATE,
  type_contrat TEXT NOT NULL DEFAULT 'CDI',
  poste TEXT,
  categorie TEXT,
  echelon TEXT,
  salaire_base NUMERIC NOT NULL DEFAULT 0,
  is_cadre BOOLEAN NOT NULL DEFAULT false,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own employes"
  ON public.employes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table des bulletins de paie
CREATE TABLE public.bulletins_paie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employe_id UUID NOT NULL REFERENCES public.employes(id) ON DELETE CASCADE,
  periode TEXT NOT NULL, -- format: 2026-03
  date_paiement DATE,
  salaire_base NUMERIC NOT NULL DEFAULT 0,
  sursalaire NUMERIC NOT NULL DEFAULT 0,
  prime_anciennete NUMERIC NOT NULL DEFAULT 0,
  prime_transport NUMERIC NOT NULL DEFAULT 0,
  autres_primes NUMERIC NOT NULL DEFAULT 0,
  heures_sup_montant NUMERIC NOT NULL DEFAULT 0,
  salaire_brut NUMERIC NOT NULL DEFAULT 0,
  -- Cotisations salariales
  ipres_rg_sal NUMERIC NOT NULL DEFAULT 0,       -- IPRES Régime Général 5.6%
  ipres_crc_sal NUMERIC NOT NULL DEFAULT 0,      -- IPRES CRC (cadres) 2.4%
  ir NUMERIC NOT NULL DEFAULT 0,                  -- Impôt sur le Revenu
  trimf NUMERIC NOT NULL DEFAULT 0,               -- TRIMF
  total_retenues_sal NUMERIC NOT NULL DEFAULT 0,
  -- Cotisations patronales
  ipres_rg_pat NUMERIC NOT NULL DEFAULT 0,       -- IPRES RG Patronal 8.4%
  ipres_crc_pat NUMERIC NOT NULL DEFAULT 0,      -- IPRES CRC Patronal 3.6%
  css_at NUMERIC NOT NULL DEFAULT 0,             -- CSS Accidents du travail 1-5%
  css_pf NUMERIC NOT NULL DEFAULT 0,             -- CSS Prestations familiales 7%
  cfce NUMERIC NOT NULL DEFAULT 0,               -- CFCE 3%
  total_charges_pat NUMERIC NOT NULL DEFAULT 0,
  net_a_payer NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bulletins_paie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bulletins"
  ON public.bulletins_paie FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
