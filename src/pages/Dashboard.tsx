import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NovoAgendamentoDialog from "@/components/NovoAgendamentoDialog";
import NovoEncaixeDialog from "@/components/NovoEncaixeDialog";
import AgendamentoDetailsDialog from "@/components/AgendamentoDetailsDialog";
import { useNavigate } from "react-router-dom";



const Dashboard = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const navigate = useNavigate();

 useEffect(() => {
    if (user && userProfile?.role === 'secretaria') {
      fetchDashboardData();
    }
  }, [user, userProfile, dataSelecionada]);


  const fetchDashboardData = async () => {
    try {
      await Promise.all([fetchTecnicos(), fetchAgendamentos(), fetchEncaixes()]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const [encaixesDisponiveis, setEncaixesDisponiveis] = useState(0);

  const fetchEncaixes = async () => {
    const { data, error } = await supabase
      .from('encaixes')
      .select('id')
      .not('status', 'eq', 'aceito');

    if (error) {
      console.error("Erro ao buscar encaixes disponíveis:", error);
      setEncaixesDisponiveis(0);
    } else {
      setEncaixesDisponiveis(data.length);
    }
  };


  const emAndamento = agendamentos.filter(
    ag => ag.status === 'em_andamento' || ag.status === 'em_deslocamento'
  );

  const fetchTecnicos = async () => {
    try {
      const { data: tecnicosData, error } = await supabase
        .from('profiles')
        .select('user_id, name, role')
        .eq('role', 'tecnico');
      
      if (error) throw error;

      // Formato local confiável (YYYY-MM-DD sem fuso UTC)
      const hoje = new Date().toLocaleDateString("sv-SE");

      const { data: agendamentosHoje, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('tecnico_id, status')
        .eq('data', hoje);
      
      if (agendamentosError) throw agendamentosError;

      const tecnicosComEstatisticas = tecnicosData?.map(tecnico => {
        const agendamentosTecnico = agendamentosHoje?.filter(ag => ag.tecnico_id === tecnico.user_id) || [];
        const statusAtual = agendamentosTecnico.find(ag => ag.status === 'em_andamento')?.status || 
                          agendamentosTecnico.find(ag => ag.status === 'em_deslocamento')?.status || 
                          agendamentosTecnico.find(ag => ag.status === 'agendado')?.status || 
                          'livre';
        
        return {
          id: tecnico.user_id,
          nome: tecnico.name,
          status: statusAtual,
          agendamentosHoje: agendamentosTecnico.length,
          proximoCliente: '',
          localizacao: 'Base'
        };
      }) || [];

      setTecnicos(tecnicosComEstatisticas);
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
    }
  };


 const fetchAgendamentos = async () => {
  try {
    // Gera string no formato "YYYY-MM-DD" local sem hora
    const ano = dataSelecionada.getFullYear();
    const mes = String(dataSelecionada.getMonth() + 1).padStart(2, "0");
    const dia = String(dataSelecionada.getDate()).padStart(2, "0");
    const dataFormatada = `${ano}-${mes}-${dia}`;

    console.log("Buscando agendamentos para a data:", dataFormatada);

    const { data, error } = await supabase
      .from('agendamentos')
      .select(`*, profiles!agendamentos_tecnico_id_fkey(name)`)
      .eq('data', dataFormatada)
      .order('horario');

    if (error) throw error;

    const agendamentosFormatados = data?.map(ag => ({
      ...ag,
      tecnico: ag.profiles?.name || 'N/A'
    })) || [];

    setAgendamentos(agendamentosFormatados);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
  }
};



  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado": return "agendado";
      case "em_andamento": return "em_andamento";
      case "finalizado": return "finalizado";
      case "cancelado": return "destructive";
      default: return "default";
    }
  };

  function formatarData(data: string) {
    // Evita conversão para UTC
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }


  const getStatusText = (status: string) => {
    switch (status) {
      case "agendado": return "Agendado";
      case "em_andamento": return "Em Andamento";
      case "finalizado": return "Finalizado";
      case "cancelado": return "Cancelado";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== 'secretaria') {
    return (
      <div className="p-6 space-y-6 bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Acesso negado. Esta área é apenas para secretárias.</p>
        </div>
      </div>
    );
  }

  const agendamentosFiltrados = agendamentos.filter(ag => {
    if (filtroStatus !== "todos" && ag.status !== filtroStatus) return false;
    if (buscaTexto && !ag.cliente?.toLowerCase()?.includes(buscaTexto.toLowerCase()) && 
        !ag.id.toLowerCase().includes(buscaTexto.toLowerCase()) &&
        !ag.tecnico.toLowerCase().includes(buscaTexto.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard - Controle de Técnicos</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos agendamentos e técnicos em campo</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <NovoEncaixeDialog onEncaixeCriado={fetchDashboardData} />
          <NovoAgendamentoDialog onAgendamentoCriado={fetchDashboardData} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{tecnicos.length}</div>
            <p className="text-xs text-muted-foreground">+{tecnicos.length} desde ontem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{agendamentos.length}</div>
            <p className="text-xs text-muted-foreground">
              {agendamentos.filter(ag => ag.status === 'finalizado').length} finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{emAndamento.length}</div>
            <p className="text-xs text-muted-foreground">Tempo médio: 120min</p>
          </CardContent>
        </Card>

        <Card onClick={() => navigate("/encaixes")} className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encaixes Disponíveis</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{encaixesDisponiveis}</div>
            <p className="text-xs text-muted-foreground">Para distribuir</p>
          </CardContent>
        </Card>
      </div>

      {/* Técnicos em Campo */}
      <Card>
        <CardHeader>
          <CardTitle>Técnicos em Campo</CardTitle>
          <CardDescription>Status atual dos técnicos e suas localizações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tecnicos.map((tecnico) => (
              <div key={tecnico.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-foreground">{tecnico.nome}</h3>
                  <Badge variant={getStatusColor(tecnico.status)}>
                    {getStatusText(tecnico.status)}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {tecnico.agendamentosHoje} agendamentos hoje
                  </div>
                  
                  {tecnico.proximoCliente && (
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      Próximo: {tecnico.proximoCliente}
                    </div>
                  )}
                  
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {tecnico.localizacao}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agendamentos do Dia */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <CardTitle>Agendamentos do Dia</CardTitle>
                <CardDescription>
                  Lista completa dos agendamentos programados
                </CardDescription>
              </div>
              <div>
                <Input 
                  type="date" 
                  value={dataSelecionada.toLocaleDateString("sv-SE")} // formato ISO sem fuso
                  onChange={(e) => {
                    const [ano, mes, dia] = e.target.value.split("-");
                    setDataSelecionada(new Date(Number(ano), Number(mes) - 1, Number(dia)));
                  }}
                  className="w-[180px]"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-8 w-64"
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="em_deslocamento">Em Deslocamento</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agendamentos
              .filter(ag => {
                if (filtroStatus !== "todos" && ag.status !== filtroStatus) return false;
                if (buscaTexto && !ag.cliente.toLowerCase().includes(buscaTexto.toLowerCase()) && 
                    !ag.id.toLowerCase().includes(buscaTexto.toLowerCase()) &&
                    !ag.tecnico.toLowerCase().includes(buscaTexto.toLowerCase())) return false;
                return true;
              })
              .map((agendamento) => (
              <AgendamentoDetailsDialog key={agendamento.id} agendamento={agendamento}>
                <div className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">#{agendamento.id}</span>
                      <Badge variant={getStatusColor(agendamento.status)}>
                        {getStatusText(agendamento.status)}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-foreground">{agendamento.cliente}</h3>
                  </div>
                  <div className="sm:hidden text-sm text-muted-foreground">
                    {formatarData(agendamento.data)} - {agendamento.horario}
                  </div>
                  <div className="text-right sm:block hidden">
                    <span className="block text-sm text-muted-foreground">{formatarData(agendamento.data)}</span>
                    <span className="text-2xl font-bold text-primary">{agendamento.horario}</span>
                  </div>

                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Endereço:</span>
                    <p className="text-foreground">{agendamento.endereco}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="text-foreground">{agendamento.tipo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Técnico:</span>
                    <p className="text-foreground">{agendamento.tecnico}</p>
                  </div>
                </div>
                
                {agendamento.observacoes && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-muted-foreground text-sm">Observações:</span>
                    <p className="text-foreground text-sm">{agendamento.observacoes}</p>
                  </div>
                )}
                </div>
              </AgendamentoDetailsDialog>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;