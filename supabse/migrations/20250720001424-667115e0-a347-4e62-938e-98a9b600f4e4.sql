-- Remove problematic policy and function
DROP POLICY IF EXISTS "Secretarias can view technician profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Usar uma abordagem mais simples: permitir que usuários autenticados vejam perfis de técnicos
CREATE POLICY "Authenticated users can view technician profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (role = 'tecnico');