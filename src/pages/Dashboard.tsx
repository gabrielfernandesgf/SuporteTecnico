import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Search, Filter, PhoneCall, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AgendamentoDetailsDialog from "@/components/AgendamentoDetailsDialog";
import { useNavigate } from "react-router-dom";
import { AgendamentoFormatado } from "@/types/AgendamentoFormatado";
import { fetchAgendamentos as fetchAgsIntervalo } from "@/services/syndata";
import { listarEncaixes, listarEncaixesAguardando, converterEncaixe } from "@/services/encaixes";
import { obterDetalhesAgendamento } from "@/services/agendamentos";
import { Button } from "@/components/ui/button";

function formatarData(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

const Dashboard = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<AgendamentoFormatado[]>([]);
  const [tecnicosAtivos, setTecnicosAtivos] = useState<string[]>([]);
  const [encaixesDisponiveis, setEncaixesDisponiveis] = useState(0);
  const [aguardando, setAguardando] = useState<any[]>([]);

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<AgendamentoFormatado | null>(null);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataIni, setDataIni] = useState(hojeISO);
  const [dataFim, setDataFim] = useState(hojeISO);

  // em andamento = deslocamento OU andamento
  const emAndamento = useMemo(
    () => agendamentos.filter(ag => ag.status === "em_andamento" || ag.status === "em_deslocamento"),
    [agendamentos]
  );

  // técnicos ativos = únicos entre os “em andamento”
  const tecnicosUnicos = useMemo(() => {
    const set = new Set<string>();
    emAndamento.forEach(a => a.tecnico && set.add(a.tecnico));
    return Array.from(set);
  }, [emAndamento]);

  useEffect(() => {
    setTecnicosAtivos(tecnicosUnicos);
  }, [tecnicosUnicos]);

  useEffect(() => {
    (async () => {
      try {
        const disp = await listarEncaixes({ status: "A" });
        setEncaixesDisponiveis(Array.isArray(disp) ? disp.length : 0);

        const pend = await listarEncaixesAguardando();
        setAguardando(pend);
      } catch {
        setEncaixesDisponiveis(0);
        setAguardando([]);
      }
    })();
  }, []);

  useEffect(() => {
    loadIntervalo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataIni, dataFim]);

  async function loadIntervalo() {
    try {
      setLoading(true);
      const ags = await fetchAgsIntervalo(dataIni, dataFim);
      setAgendamentos(ags);
      // atualiza cartão de técnicos ativos com base nos ags
      setTecnicosAtivos(tecnicosUnicos);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados do dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const buscarDetalhesAgendamento = async (id: string) => {
    try {
      const d = await obterDetalhesAgendamento(Number(id));
      const traduz = (s: string) => {
        switch (s) {
          case "AB": return "agendado";
          case "AN": return "em_andamento";
          case "CO": return "finalizado";
          case "EM": return "em_deslocamento";
          case "PE": return "agendado";
          default: return (s ?? "").toLowerCase();
        }
      };
      setAgendamentoSelecionado({
        id: String(d.id),
        cliente: d.cliente,
        endereco: d.enderecoCliente ?? "Endereço não informado",
        tipo: d.titulo ?? d.tipo ?? "Visita Técnica",
        tecnico: d.tecnicoNome ?? (d.tecnicoCodigo ? `Técnico ${d.tecnicoCodigo}` : "—"),
        observacoes: d.agenda_retorno ?? "",
        status: traduz(d.status),
        data: d.dataHoraInicial?.slice(0, 10) ?? "",
        horario: d.dataHoraInicial?.slice(11, 16) ?? "",
        agendaAbertura: d.agendaAbertura ?? undefined,
      });
    } catch (error) {
      console.error("Erro ao buscar detalhes do agendamento:", error);
      toast({ title: "Erro", description: "Erro ao carregar detalhes do agendamento", variant: "destructive" });
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "agendado": return "agendado";
      case "em_andamento": return "em_andamento";
      case "finalizado": return "finalizado";
      case "destructive": return "destructive";
      case "warning": return "warning";
      case "success": return "success";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "agendado": return "Agendado";
      case "em_andamento": return "Em Andamento";
      case "finalizado": return "Finalizado";
      case "cancelado": return "Cancelado";
      case "em_deslocamento": return "Em Deslocamento";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  async function onConfirmarEncaixe(chave: number) {
    try {
      await converterEncaixe(chave); // usa o técnico já travado no encaixe
      // atualiza contadores e lista
      const [disp, pend] = await Promise.all([
        listarEncaixes({ status: "A" }),
        listarEncaixesAguardando(),
      ]);
      setEncaixesDisponiveis(Array.isArray(disp) ? disp.length : 0);
      setAguardando(pend);
      await loadIntervalo();
      toast({ title: "Encaixe confirmado", description: "Agendamento criado com sucesso." });
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível confirmar o encaixe.", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  }

  if (!userProfile || userProfile.role !== "secretaria") {
    return <div className="p-6 flex items-center justify-center min-h-screen text-muted-foreground">Acesso negado.</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard - Controle de Técnicos</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos agendamentos e técnicos em campo</p>
        </div>
      </div>

      {/* Cards topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{tecnicosUnicos.length}</div>
            <p className="text-xs text-muted-foreground">+{tecnicosUnicos.length} desde ontem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos no Período</CardTitle>
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

        <Card onClick={() => navigate("/encaixes?f=pendentes")} className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Confirmação</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aguardando.length}</div>
            <p className="text-xs text-muted-foreground">Encaixes aceitos por técnicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Encaixes aguardando confirmação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Encaixes Aguardando Confirmação</CardTitle>
          <CardDescription>Solicitados por técnicos, aguardando contato com o cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end">
            <Button variant="link" onClick={() => navigate("/encaixes?f=pendentes")}>Ver todos</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {aguardando.map((e: any) => (
              <div key={e.chave} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">#{`ENC-${e.chave}`}</div>
                    <div className="font-semibold">{e.nomeCliente}</div>
                  </div>
                  <Badge variant={(e.tipoUrgencia ?? "M").toUpperCase() === "ALTA" ? "destructive" : "secondary"}>
                    {e.tipoUrgencia ?? "Normal"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Abertura: {new Date(e.dataHoraAbertura).toLocaleString()}
                </div>
                <div className="pt-2 flex justify-end">
                  <Button onClick={() => onConfirmarEncaixe(e.chave)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar e Agendar
                  </Button>
                </div>
              </div>
            ))}
            {aguardando.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum encaixe aguardando confirmação.</div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Agendamentos no Período */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div>
              <CardTitle>Agendamentos</CardTitle>
              <CardDescription>Lista completa no período selecionado</CardDescription>
            </div>

            <div className="flex items-end gap-2">
              <div>
                <span className="block text-xs text-muted-foreground mb-1">Início</span>
                <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} className="w-[165px]" />
              </div>
              <div>
                <span className="block text-xs text-muted-foreground mb-1">Fim</span>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-[165px]" />
              </div>

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
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agendamentos
              .filter(ag => (filtroStatus === "todos" ? true : ag.status === filtroStatus))
              .filter(ag => {
                if (!buscaTexto) return true;
                const q = buscaTexto.toLowerCase();
                return ag.cliente.toLowerCase().includes(q)
                  || ag.id.toLowerCase().includes(q)
                  || ag.tecnico.toLowerCase().includes(q);
              })
              .map((agendamento) => (
                <AgendamentoDetailsDialog
                  key={agendamento.id}
                  agendamento={agendamentoSelecionado ?? agendamento}
                  onAgendamentoAtualizado={loadIntervalo}
                >
                  <div
                    className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => buscarDetalhesAgendamento(agendamento.id)}
                  >
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
                      <div className="text-right">
                        <span className="block text-sm text-muted-foreground">
                          {formatarData(agendamento.data)}
                        </span>
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
            {agendamentos.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum agendamento para o período selecionado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
