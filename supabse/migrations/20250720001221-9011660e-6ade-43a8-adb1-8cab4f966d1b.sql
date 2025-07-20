-- Remove problematic policy
DROP POLICY IF EXISTS "Secretarias can view technician profiles" ON public.profiles;

-- Criar função security definer para verificar o papel do usuário
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Criar política correta usando a função
CREATE POLICY "Secretarias can view technician profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  public.get_current_user_role() = 'secretaria' AND role = 'tecnico'
);