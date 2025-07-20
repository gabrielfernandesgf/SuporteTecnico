-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('secretaria', 'tecnico')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create agendamentos table
CREATE TABLE public.agendamentos (
  id TEXT NOT NULL PRIMARY KEY,
  cliente TEXT NOT NULL,
  endereco TEXT NOT NULL,
  tipo TEXT NOT NULL,
  tecnico_id UUID REFERENCES public.profiles(user_id),
  horario TIME NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'em_deslocamento', 'em_andamento', 'finalizado')),
  observacoes TEXT,
  saida_horario TIMESTAMP WITH TIME ZONE,
  chegada_horario TIMESTAMP WITH TIME ZONE,
  finalizacao_horario TIMESTAMP WITH TIME ZONE,
  tempo_deslocamento INTEGER, -- em minutos
  tempo_atendimento INTEGER, -- em minutos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Create policies for agendamentos
CREATE POLICY "Secretarias can view all agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'secretaria'
  )
);

CREATE POLICY "Tecnicos can view their own agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (tecnico_id = auth.uid());

CREATE POLICY "Secretarias can insert agendamentos" 
ON public.agendamentos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'secretaria'
  )
);

CREATE POLICY "Secretarias can update all agendamentos" 
ON public.agendamentos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'secretaria'
  )
);

CREATE POLICY "Tecnicos can update their own agendamentos" 
ON public.agendamentos 
FOR UPDATE 
USING (tecnico_id = auth.uid());

-- Create trigger for agendamentos timestamps
CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create encaixes table
CREATE TABLE public.encaixes (
  id TEXT NOT NULL PRIMARY KEY,
  cliente TEXT NOT NULL,
  endereco TEXT NOT NULL,
  tipo TEXT NOT NULL,
  urgencia TEXT NOT NULL DEFAULT 'Baixa' CHECK (urgencia IN ('Baixa', 'Média', 'Alta')),
  aceito_por UUID REFERENCES public.profiles(user_id),
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'aceito', 'finalizado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.encaixes ENABLE ROW LEVEL SECURITY;

-- Create policies for encaixes
CREATE POLICY "Everyone can view available encaixes" 
ON public.encaixes 
FOR SELECT 
USING (status = 'disponivel' OR aceito_por = auth.uid());

CREATE POLICY "Secretarias can insert encaixes" 
ON public.encaixes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'secretaria'
  )
);

CREATE POLICY "Tecnicos can accept encaixes" 
ON public.encaixes 
FOR UPDATE 
USING (status = 'disponivel' OR aceito_por = auth.uid());

-- Create trigger for encaixes timestamps
CREATE TRIGGER update_encaixes_updated_at
BEFORE UPDATE ON public.encaixes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();