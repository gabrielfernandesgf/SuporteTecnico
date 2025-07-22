import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, MapPin, Navigation, CheckCircle, Play, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const TecnicoView = () => {
  const { toast } = useToast();
  const { userProfile, user } = useAuth();
  const [observacoes, setObservacoes] = useState("");
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [encaixes, setEncaixes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
  if (user && userProfile?.role === 'tecnico') {
    fetchAgendamentos();
    fetchEncaixes();
    solicitarPermissaoLocalizacao();
  }
}, [user, userProfile]);

const solicitarPermissaoLocalizacao = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {
        toast({
          title: "Aviso",
          description: "Você precisa permitir o acesso à localização para registrar chegada no cliente.",
          variant: "destructive"
        });
      }
    );
  }
};


  const fetchAgendamentos = async () => {
    try {
      const hoje = new Date();

      // Formata a data no formato YYYY-MM-DD respeitando o fuso horário local
      const dataFormatada = hoje.toLocaleDateString('sv-SE'); // 'sv-SE' => yyyy-mm-dd

      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('tecnico_id', user?.id)
        .eq('data', dataFormatada) // <- comparação correta para campo Date (sem hora)
        .order('horario');

      if (error) throw error;

      setAgendamentos(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const fetchEncaixes = async () => {
    try {
      const { data, error } = await supabase
        .from('encaixes')
        .select('*')
        .eq('status', 'disponivel')
        .order('urgencia', { ascending: false });
      
      if (error) throw error;
      setEncaixes(data || []);
    } catch (error) {
      // Erro ao buscar encaixes
    }
  };

  const registrarSaida = async (agendamentoId: string) => {
    const agora = new Date();
    
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'em_deslocamento',
          saida_horario: agora.toISOString()
        })
        .eq('id', agendamentoId);
      
      if (error) throw error;
      
      setAgendamentos(prev => 
        prev.map(ag => 
          ag.id === agendamentoId 
            ? { ...ag, saida_horario: agora.toISOString(), status: 'em_deslocamento' }
            : ag
        )
      );
      
      toast({
        title: "Saída registrada!",
        description: `Saída registrada às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a saída",
        variant: "destructive"
      });
    }
  };

  const registrarChegada = async (agendamentoId: string) => {
    const agora = new Date();

    if (!navigator.geolocation) {
      toast({
        title: "Erro",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const { error } = await supabase
          .from('agendamentos')
          .update({
            status: 'em_andamento',
            chegada_horario: agora.toISOString(),
            localizacao_chegada: `${latitude},${longitude}`
          })
          .eq('id', agendamentoId);

        if (error) throw error;

        setAgendamentos(prev =>
          prev.map(ag =>
            ag.id === agendamentoId
              ? {
                  ...ag,
                  chegada_horario: agora.toISOString(),
                  status: 'em_andamento',
                  localizacao_chegada: `${latitude},${longitude}`
                }
              : ag
          )
        );

        toast({
          title: "Chegada registrada!",
          description: `Localização salva: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao salvar localização da chegada",
          variant: "destructive"
        });
      }
    }, () => {
      toast({
        title: "Erro",
        description: "Permissão de localização negada",
        variant: "destructive"
      });
    });
  };


  const calcularTempoMinutos = (inicio: string, fim: string): number => {
    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    return Math.round((fimDate.getTime() - inicioDate.getTime()) / (1000 * 60));
  };

  const finalizarAtendimento = async (agendamentoId: string) => {
    const agora = new Date();
    const agendamento = agendamentos.find(ag => ag.id === agendamentoId);
    
    if (!agendamento) return;
    
    const tempoDeslocamento = agendamento.saida_horario && agendamento.chegada_horario 
      ? calcularTempoMinutos(agendamento.saida_horario, agendamento.chegada_horario)
      : null;
    
    const tempoAtendimento = agendamento.chegada_horario 
      ? calcularTempoMinutos(agendamento.chegada_horario, agora.toISOString())
      : null;
    
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'finalizado',
          finalizacao_horario: agora.toISOString(),
          observacoes: observacoes || agendamento.observacoes,
          tempo_deslocamento: tempoDeslocamento,
          tempo_atendimento: tempoAtendimento
        })
        .eq('id', agendamentoId);
      
      if (error) throw error;
      
      setAgendamentos(prev => 
        prev.map(ag => 
          ag.id === agendamentoId 
            ? { 
                ...ag, 
                finalizacao_horario: agora.toISOString(), 
                status: 'finalizado',
                observacoes: observacoes || ag.observacoes,
                tempo_deslocamento: tempoDeslocamento,
                tempo_atendimento: tempoAtendimento
              }
            : ag
        )
      );
      
      setObservacoes("");
      
      toast({
        title: "Atendimento finalizado!",
        description: `Atendimento concluído às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o atendimento",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado": return "agendado";
      case "em_deslocamento": return "warning";
      case "em_andamento": return "em_andamento";
      case "finalizado": return "finalizado";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "agendado": return "Agendado";
      case "em_deslocamento": return "Em Deslocamento";
      case "em_andamento": return "Em Andamento";
      case "finalizado": return "Finalizado";
      default: return status;
    }
  };

  const aceitarEncaixe = async (encaixeId: string) => {
    try {
      const { data: encaixe, error: fetchError } = await supabase
        .from('encaixes')
        .select("*")
        .eq('id', encaixeId)
        .single();
      
      if (fetchError ) throw fetchError;

      
      const novoAgendamento = {
      id: encaixe.id,
      cliente: encaixe.cliente,
      endereco: encaixe.endereco,
      tipo: encaixe.tipo || "treinamento",
      tecnico_id: user?.id,
      status: "agendado",
      origem: "encaixe",
      // observacoes: encaixe.observacoes || null, // Removido pois não existe no tipo encaixe
      observacoes: null,
      data: new Date().toISOString().split("T")[0],
      horario: new Date().toTimeString().split(" ")[0],
    };

    // Removido console.log de produção
    const { error: insetError } = await supabase
      .from('agendamentos')
      .insert(novoAgendamento);

   if (insetError) {
    // Erro detalhado no insert
  }


      if (!user?.id) throw new Error("Usuário técnico não autenticado.");

      if (insetError) throw insetError;

      const { error: updateError } = await supabase
      .from("encaixes")
      .update({ status: "aceito", aceito_por: user?.id })
      .eq("id", encaixeId);

      if (updateError) throw updateError;

      setEncaixes((prev) => prev.filter((e) => e.id !== encaixeId));

      toast({
        title: "Encaixe aceito!",
        description: "O encaixe foi adicionado à sua agenda.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o encaixe",
        variant: "destructive",
      });
    }
  };

  const formatarHorario = (horarioISO: string) => {
    if (!horarioISO) return '';
    return new Date(horarioISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarTempo = (minutos: number | null) => {
    if (!minutos) return '';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}


  const renderBotaoAcao = (agendamento: any) => {
    if (agendamento.status === "agendado") {
      return (
        <Button 
          onClick={() => registrarSaida(agendamento.id)}
          className="bg-primary hover:bg-primary-hover w-full"
        >
          <Play className="mr-2 h-4 w-4" />
          Confirmar Saída
        </Button>
      );
    } else if (agendamento.status === "em_deslocamento") {
      return (
        <Button 
          onClick={() => registrarChegada(agendamento.id)}
          className="bg-warning hover:bg-warning/80 w-full"
        >
          <MapPin className="mr-2 h-4 w-4" />
          Confirmar Chegada
        </Button>
      );
    } else if (agendamento.status === "em_andamento") {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-success hover:bg-success/80 w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalizar Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizar Atendimento</DialogTitle>
              <DialogDescription>
                Adicione observações sobre o atendimento realizado (opcional).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Observações sobre o atendimento..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
              />
              <Button 
                onClick={() => finalizarAtendimento(agendamento.id)}
                className="w-full bg-success hover:bg-success/80"
              >
                Confirmar Finalização
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    } else {
      return (
        <Button disabled className="w-full">
          <CheckCircle className="mr-2 h-4 w-4" />
          Finalizado
        </Button>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'tecnico') {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Acesso negado. Esta área é apenas para técnicos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Olá, {userProfile?.name}!</h1>
        <p className="text-muted-foreground mt-1">Sua agenda do dia - {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Agendamentos do Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Agendamentos Hoje</CardTitle>
          <CardDescription>Clique nos botões para registrar cada etapa do atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {agendamentos.map((agendamento) => (
              <div key={agendamento.id} className="border rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">#{agendamento.id}</span>
                      <Badge variant={getStatusColor(agendamento.status)}>
                        {getStatusText(agendamento.status)}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-medium text-foreground">{agendamento.cliente}</h3>
                  </div>
                  <div className="sm:text-right">
                    <span className="block text-sm text-muted-foreground"> {formatarData(agendamento.data)} </span>
                    <span className="text-xl sm:text-2xl font-bold text-primary block">{agendamento.horario}</span>
                    <p className="text-sm text-muted-foreground">{agendamento.tipo}</p>
                  </div>
                </div>

                
                <div className="space-y-3 mb-4">
                  <div className="flex items-start">
                    <MapPin className="mr-2 h-5 w-5 text-muted-foreground mt-0.5" />
                    <span className="text-foreground">{agendamento.endereco}</span>
                  </div>
                  
                  {agendamento.observacoes && (
                    <div className="flex items-start">
                      <FileText className="mr-2 h-5 w-5 text-muted-foreground mt-0.5" />
                      <span className="text-foreground">{agendamento.observacoes}</span>
                    </div>
                  )}
                </div>

                {/* Timeline de Horários */}
                {(agendamento.saida_horario || agendamento.chegada_horario || agendamento.finalizacao_horario) && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-foreground mb-2">Timeline do Atendimento</h4>
                    <div className="space-y-2 text-sm">
                      {agendamento.saida_horario && (
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-primary" />
                          <span>Saída: {formatarHorario(agendamento.saida_horario)}</span>
                        </div>
                      )}
                      {agendamento.chegada_horario && (
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-warning" />
                          <span>Chegada: {formatarHorario(agendamento.chegada_horario)}</span>
                        </div>
                      )}
                      {agendamento.finalizacao_horario && (
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-success" />
                          <span>Finalização: {formatarHorario(agendamento.finalizacao_horario)}</span>
                        </div>
                      )}
                      {(agendamento.tempo_deslocamento || agendamento.tempo_atendimento) && (
                        <div className="pt-2 border-t border-border space-y-1">
                          {agendamento.tempo_deslocamento && (
                            <div className="text-muted-foreground">
                              Tempo de deslocamento: <span className="font-medium text-foreground">{formatarTempo(agendamento.tempo_deslocamento)}</span>
                            </div>
                          )}
                          {agendamento.tempo_atendimento && (
                            <div className="text-muted-foreground">
                              Tempo de atendimento: <span className="font-medium text-foreground">{formatarTempo(agendamento.tempo_atendimento)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Botão de Ação */}
                <div className="flex justify-end">
                  {renderBotaoAcao(agendamento)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Encaixes Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Encaixes Disponíveis</CardTitle>
          <CardDescription>Atendimentos extras que você pode realizar após finalizar sua agenda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {encaixes.map((encaixe) => (
              <div key={encaixe.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-foreground">{encaixe.cliente}</h3>
                  <Badge variant={encaixe.urgencia === "Alta" ? "destructive" : "secondary"}>
                    {encaixe.urgencia}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {encaixe.endereco}
                  </div>
                  <div className="text-muted-foreground">
                    Tipo: {encaixe.tipo}

                    {encaixe.observacoes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Observações:</strong> {encaixe.observacoes}
                    </div>
                  )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-3"
                  onClick={() => aceitarEncaixe(encaixe.id)}
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Aceitar Encaixe
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TecnicoView;