
-- 1. Créer l'enum des rôles
CREATE TYPE public.app_role AS ENUM ('assistant', 'comptable', 'chef_comptable');

-- 2. Créer la table user_roles
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Activer RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Fonction security definer pour vérifier un rôle
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Fonction pour récupérer le rôle d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 6. RLS policies
-- Les utilisateurs authentifiés peuvent lire les rôles
CREATE POLICY "Authenticated users can read roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Seul le chef_comptable peut insérer/modifier/supprimer des rôles
CREATE POLICY "Chef comptable can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'chef_comptable'))
WITH CHECK (public.has_role(auth.uid(), 'chef_comptable'));

-- 7. Attribuer automatiquement le rôle chef_comptable au premier utilisateur (trigger)
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si c'est le premier utilisateur, il devient chef_comptable, sinon comptable
  IF (SELECT count(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'chef_comptable');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'comptable');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();
