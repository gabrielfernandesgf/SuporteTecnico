import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import EditarAgendamentoDialog from "./EditarAgendamentoDialog";
import { finalizarAgendamento, remarcarAgendamento, obterDetalhesAgendamento } from "@/services/agendamentos";
import { MapPin, ExternalLink } from "lucide-react";
import { listarLocalizacoesAgendamento } from "@/services/agendamentos";


// 🔹 tipos locais mínimos
type AgendamentoBase = {
  id: string;
  cliente: string;
  endereco: string;
  tipo: string;
  tecnico: string;
  observacoes?: string;
  status: string;
  data: string;
  horario: string;
  agendaAbertura?: string;
};

// 🔹 helper para traduzir status curto
function traduzirStatus(status: string) {
  switch ((status ?? "").toUpperCase()) {
    case "AB": return "agendado";
    case "EM": return "em_deslocamento";
    case "AN": return "em_andamento";
    case "EX": return "em_andamento";
    case "CO": return "finalizado";
    case "CA":
    case "CN": return "cancelado";
    default: return (status ?? "").toLowerCase();
  }
}

interface AgendamentoDetailsDialogProps {
  agendamento: AgendamentoBase;           // vem da lista
  onAgendamentoAtualizado?: () => void;
  children: React.ReactNode;
}

const AgendamentoDetailsDialog = ({
  agendamento: agendamentoInicial,
  onAgendamentoAtualizado,
  children,
}: AgendamentoDetailsDialogProps) => {

  const topRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // ✅ estado precisa existir ANTES do useEffect
  const [agendamento, setAgendamento] = useState<any>(agendamentoInicial);
  const [open, setOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editarAberto, setEditarAberto] = useState(false);

  const [remarcarData, setRemarcarData] = useState("");
  const [remarcarHora, setRemarcarHora] = useState("");
  const [obsRemarcar, setObsRemarcar] = useState("");
  const [obsRetorno, setObsRetorno] = useState("");

  const [locs, setLocs] = useState<Array<{
    id: number;
    tipo: "SAIDA" | "CHEGADA" | "FINAL";
    dataHora: string;
    lat: number;
    lng: number;
    precisao: number | null;
    origem?: string | null;
  }>>([]);

  const canRemarcar = (agendamento?.status ?? "").toLowerCase() === "agendado";

  // ✅ sincroniza quando a prop muda (ex: troca de card)
  useEffect(() => {
    setAgendamento(agendamentoInicial);
  }, [agendamentoInicial]);

  // 🔹 busca detalhes quando o Dialog abre
  const carregarDetalhes = async () => {
    try {
      const det = await obterDetalhesAgendamento(Number(agendamentoInicial.id));
      const rast = await listarLocalizacoesAgendamento(Number(agendamentoInicial.id));

      setAgendamento((prev: any) => ({
        ...prev,
        cliente: det.cliente ?? prev.cliente,
        enderecoCliente: det.enderecoCliente ?? prev.enderecoCliente,
        tecnicoCodigo: det.tecnicoCodigo ?? prev.tecnicoCodigo,
        tecnicoNome: det.tecnicoNome ?? prev.tecnicoNome,
        dataHoraAbertura: det.dataHoraAbertura ?? prev.dataHoraAbertura,
        dataHoraInicial: det.dataHoraInicial ?? prev.dataHoraInicial,
        status: traduzirStatus(det.status),
        agenda_retorno: det.agenda_retorno ?? prev.agenda_retorno,
        tipo: det.titulo ?? det.tipo ?? prev.tipo,
        agendaAbertura: det.agendaAbertura ?? prev.agendaAbertura,
      }));

      setLocs(rast);
    } catch {
      toast({ title: "Erro ao carregar detalhes do agendamento", variant: "destructive" });
    }
  };

  async function onFinalizar() {
    const obs = obsRetorno.trim();
    if (!obs) {
      toast({ title: "Informe o motivo para concluir.", variant: "destructive" });
      return;
    }
    try {
      await finalizarAgendamento(Number(agendamentoInicial.id), obs);
      toast({ title: "Agendamento concluido" });
      setObsRetorno("");
      onAgendamentoAtualizado?.();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao concluir", description: e?.message, variant: "destructive" });
    }
  }

  async function onRemarcar() {
    if (!remarcarData || !remarcarHora) {
      toast({ title: "Informe data e horario para remarcar.", variant: "destructive" });
      return;
    }
    const obs = obsRetorno.trim();
    if (!obs) {
      toast({ title: "Informe o motivo para remarcar.", variant: "destructive" });
      return;
    }

    const novaISO = `${remarcarData}T${remarcarHora}:00`;
    const retornoAtual = (agendamento?.agenda_retorno ?? "").trim();
    const novoBloco = obsRemarcar.trim();
    const retornoFinal = [retornoAtual, novoBloco].filter(Boolean).join("\n");

    try {
      await remarcarAgendamento(Number(agendamentoInicial.id), novaISO, retornoFinal);
      toast({ title: "Agendamento remarcado" });
      setRemarcarData("");
      setRemarcarHora("");
      setObsRetorno("");
      onAgendamentoAtualizado?.();
      await carregarDetalhes();
    } catch (e: any) {
      toast({ title: "Erro ao remarcar", description: e?.message, variant: "destructive" });
    }
  }

  // 🕒 formatadores
  const formatTime = (timeString?: string) =>
    !timeString ? "N/A" :
      new Date(`2000-01-01T${timeString}`).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // helpers de link do Maps
  const mapsViewUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps?q=${lat},${lng}`;
  const mapsDirectionsUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const saida = [...locs].filter(l => l.tipo === "SAIDA").pop();
  const chegada = [...locs].filter(l => l.tipo === "CHEGADA").pop();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "agendado": return <Badge variant="secondary">Agendado</Badge>;
      case "em_deslocamento": return <Badge variant="warning">Em Deslocamento</Badge>;
      case "em_andamento": return <Badge variant="default">Em Andamento</Badge>;
      case "concluido":
      case "finalizado": return <Badge variant="outline" className="border-green-500 text-green-700">Concluído</Badge>;
      case "cancelado": return <Badge variant="outline" className="border-red-500 text-red-700">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const finalizacao = [...locs].filter(l => l.tipo === "FINAL").pop();

  const formatarData = (data: string) => {
    if (!data?.includes("-")) return "N/A";
    const [y, m, d] = data.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) carregarDetalhes();
        }}
      >
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            topRef.current?.focus();
            topRef.current?.scrollTo?.({ top: 0 });
          }}
        >
          <div ref={topRef} tabIndex={-1} />
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Agendamento {agendamento.id}</span>
              {getStatusBadge(agendamento.status)}
            </DialogTitle>
            <DialogDescription>Informações completas sobre o atendimento</DialogDescription>
          </DialogHeader>


          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                  <p className="text-sm">{agendamento.cliente}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Endereço do Cliente:</Label>
                  <p className="text-foreground">{agendamento.enderecoCliente ?? agendamento.endereco ?? "Endereço não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Serviço</Label>
                  <p className="text-sm">{agendamento.tipo || "-"} </p>
                </div>
                {agendamento.agendaAbertura && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Descrição (Abertura)</Label>
                    <p className="text-sm whitespace-pre-wrap">{agendamento.agendaAbertura}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Técnico:</span>
                  <p className="text-foreground">
                    {agendamento.tecnicoCodigo ? `${agendamento.tecnicoCodigo} - ${agendamento.tecnicoNome ?? ""}` : agendamento.tecnico}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                    <p className="text-sm"><span>{formatarData(agendamento.data)}</span></p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Horário Agendado</Label>
                    <p className="text-sm">{formatTime(agendamento.horario)}</p>
                  </div>
                </div>
                {/* Localização (saída/chegada) */}
                <div className="mt-4 space-y-3">
                  <div className="text-sm font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2" /> Localização
                  </div>

                  {/* Saída */}
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Saída</div>
                    {saida ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm">
                          {new Date(saida.dataHora).toLocaleString("pt-BR")}
                        </div>
                        <a className="text-primary inline-flex items-center gap-1"
                          href={mapsViewUrl(saida.lat, saida.lng)} target="_blank" rel="noreferrer">
                          Ver no mapa <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <a className="text-primary inline-flex items-center gap-1"
                          href={mapsDirectionsUrl(saida.lat, saida.lng)} target="_blank" rel="noreferrer">
                          Traçar rota <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sem registro de saída.</div>
                    )}
                  </div>

                  {/* Chegada */}
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Chegada</div>
                    {chegada ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm">
                          {new Date(chegada.dataHora).toLocaleString("pt-BR")}
                        </div>
                        <a className="text-primary inline-flex items-center gap-1"
                          href={mapsViewUrl(chegada.lat, chegada.lng)} target="_blank" rel="noreferrer">
                          Ver no mapa <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <a className="text-primary inline-flex items-center gap-1"
                          href={mapsDirectionsUrl(chegada.lat, chegada.lng)} target="_blank" rel="noreferrer">
                          Traçar rota <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sem registro de chegada.</div>
                    )}
                  </div>

                  {/* Finalização */}
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Finalização</div>
                    {finalizacao ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm">
                          {new Date(finalizacao.dataHora).toLocaleString("pt-BR")}
                        </div>
                        <a className="text-primary inline-flex items-center gap-1"
                          href={`https://www.google.com/maps?q=${finalizacao.lat},${finalizacao.lng}`}
                          target="_blank" rel="noreferrer">
                          Ver no mapa <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <a className="text-primary inline-flex items-center gap-1"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${finalizacao.lat},${finalizacao.lng}`}
                          target="_blank" rel="noreferrer">
                          Traçar rota <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sem registro de finalização.</div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Remarcar */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Remarcar</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input type="date" value={remarcarData}
                      onChange={(e) => setRemarcarData(e.target.value)}
                      disabled={!canRemarcar} />
                    <Input type="time" value={remarcarHora}
                      onChange={(e) => setRemarcarHora(e.target.value)}
                      disabled={!canRemarcar} />
                    <Button onClick={onRemarcar}
                      disabled={!canRemarcar || !remarcarData || !remarcarHora || !obsRetorno.trim()}>
                      Aplicar
                    </Button>
                  </div>
                  {!canRemarcar && (
                    <div className="text-xs text-muted-foreground">
                      Só é possível remarcar quando o status estiver <b>Agendado</b>.
                    </div>
                  )}
                </div>

                {/* Observação ÚNICA (RETORNO) — obrigatória para remarcar e concluir */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Observações (RETORNO)</div>
                  <Textarea
                    placeholder="Obrigatório ao remarcar ou concluir. Será salvo em 'Retorno' no Syndata."
                    value={obsRetorno}
                    onChange={(e) => setObsRetorno(e.target.value)}
                  />
                </div>

                {/* Concluir */}
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    onClick={onFinalizar}
                    disabled={!obsRetorno.trim()}
                  >
                    Marcar como Concluído
                  </Button>
                </div>

              </CardContent>
            </Card>


            {/* ... restante igual (Controle de tempo, Observações etc.) */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edição permanece */}
      <EditarAgendamentoDialog
        agendamento={agendamento}
        open={editarAberto}
        onFechar={() => setEditarAberto(false)}
        onAtualizar={(novo) => {
          setEditarAberto(false);
          setAgendamento(novo);
          onAgendamentoAtualizado?.();
        }}
      />
    </>
  );
};

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={className} {...props} />
);

export default AgendamentoDetailsDialog;
