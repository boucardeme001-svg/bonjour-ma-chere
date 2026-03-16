
-- Fonction security definer pour que le chef comptable puisse voir tous les profils
CREATE OR REPLACE FUNCTION public.list_all_users_for_admin()
RETURNS TABLE(user_id uuid, email text, nom text, prenom text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est chef_comptable
  IF NOT public.has_role(auth.uid(), 'chef_comptable') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email::text,
    COALESCE(p.nom, '')::text AS nom,
    COALESCE(p.prenom, '')::text AS prenom,
    COALESCE(ur.role::text, '') AS role
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  ORDER BY u.created_at;
END;
$$;
