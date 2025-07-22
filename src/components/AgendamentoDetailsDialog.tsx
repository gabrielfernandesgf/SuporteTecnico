import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  Calendar,
  User,
  FileText,
  Timer,
  Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";


interface AgendamentoDetailsDialogProps {
  agendamento: any;
  onAgendamentoAtualizado?: () => void;
  children: React.ReactNode;
}

const AgendamentoDetailsDialog = ({
  agendamento,
  onAgendamentoAtualizado,
  children,
}: AgendamentoDetailsDialogProps) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return "N/A";
    return new Date(dateTime).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "agendado":
        return <Badge variant="secondary">Agendado</Badge>;
      case "em_andamento":
        return <Badge variant="default">Em Andamento</Badge>;
      case "finalizado":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Finalizado
          </Badge>
        );
      case "cancelado":
        return (
          <Badge variant="outline" className="border-red-500 text-red-700">
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;

    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({
          status: "cancelado",
          motivo_cancelamento: cancelReason,
        })
        .eq("id", agendamento.id);

      if (error) throw error;

      alert("Agendamento cancelado com sucesso!");
      setCancelDialogOpen(false);
      if (onAgendamentoAtualizado) onAgendamentoAtualizado();
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
      alert("Erro ao cancelar agendamento.");
    }
  };

  function formatarData(data: string) {
    // Evita conversão para UTC
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Agendamento {agendamento.id}</span>
            {getStatusBadge(agendamento.status)}
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre o atendimento
          </DialogDescription>
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
                <Label className="text-sm font-medium text-muted-foreground">
                  Cliente
                </Label>
                <p className="text-sm">{agendamento.cliente}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Endereço
                </Label>
                <p className="text-sm flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {agendamento.endereco}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Tipo de Serviço
                </Label>
                <p className="text-sm">{agendamento.tipo}</p>
              </div>
               <div>
                 <span className="text-muted-foreground">Técnico:</span>
                 <p className="text-foreground">{agendamento.tecnico}</p>
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
                  <Label className="text-sm font-medium text-muted-foreground">
                    Data
                  </Label>
                  <p className="text-sm">
                    <span>{formatarData(agendamento.data)}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Horário Agendado
                  </Label>
                  <p className="text-sm">{formatTime(agendamento.horario)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Timer className="mr-2 h-5 w-5" />
                Controle de Tempo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Saída
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(agendamento.saida_horario)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Chegada
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(agendamento.chegada_horario)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Finalização
                  </Label>
                  <p className="text-sm">
                    {formatDateTime(agendamento.finalizacao_horario)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Localização de Chegada
                  </Label>
                  {agendamento.localizacao_chegada && (
                    <a
                      href={`https://www.google.com/maps?q=${agendamento.localizacao_chegada}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    > <br />
                      Ver localização no mapa
                    </a>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Tempo de Deslocamento
                  </Label>
                  <p className="text-sm font-semibold text-blue-600">
                    {formatDuration(agendamento.tempo_deslocamento)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Tempo de Atendimento
                  </Label>
                  <p className="text-sm font-semibold text-green-600">
                    {formatDuration(agendamento.tempo_atendimento)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {agendamento.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {agendamento.observacoes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Botão de Cancelar (somente se status for "agendado") */}
          {agendamento.status === "agendado" && (
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancelar Agendamento
              </Button>
            </div>
          )}
        </div>

        {cancelDialogOpen && (
          <div className="mt-8 border rounded-md p-4 bg-red-50">
            <h4 className="text-lg font-semibold text-red-700">
              Cancelar Agendamento
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Informe o motivo do cancelamento. Essa ação não poderá ser desfeita.
            </p>
            <Textarea
              placeholder="Digite o motivo do cancelamento..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={className} {...props} />
);

export default AgendamentoDetailsDialog;
