-- Allow secretaries to view technician profiles to create appointments
CREATE POLICY "Secretarias can view technician profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'secretaria'
  )
  AND role = 'tecnico'
);