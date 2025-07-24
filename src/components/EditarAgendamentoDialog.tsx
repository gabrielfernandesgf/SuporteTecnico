import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { on } from "events";

interface EditarAgendamentoDialogProps {
  agendamento: any;
  onFechar: () => void;
  onAtualizar(novoAgendamento): any;
  open: boolean;
}


const EditarAgendamentoDialog = ({
  agendamento,
  onFechar,
  onAtualizar,
  open,
}: EditarAgendamentoDialogProps) => {
  const [novaData, setNovaData] = useState(agendamento.data);
  const [novoHorario, setNovoHorario] = useState(agendamento.horario);
  const [novaObs, setNovaObs] = useState(agendamento.observacoes || "");
  const [pontoReferencia, setPontoReferencia] = useState(agendamento.ponto_referencia || "");
  const [tecnicos, setTecnicos] = useState<{ user_id: string; name: string }[]>([]);
  const [tecnicoId, setTecnicoId] = useState(agendamento.tecnico_id || "");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
  const carregarTecnicos = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("role", "tecnico")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar técnicos:", error);
    } else {
      setTecnicos(data);
    }
  };

  carregarTecnicos();
}, []);

  

  const salvarEdicao = async () => {
    const alterouData = novaData !== agendamento.data;
    const alterouHorario = novoHorario !== agendamento.horario;

    if ((alterouData || alterouHorario) && !motivo.trim()) {
        alert("Informe o motivo da alteração.");
        return;
    }

    setSalvando(true);

    const { error } = await supabase
        .from("agendamentos")
        .update({
        data: novaData,
        horario: novoHorario,
        observacoes: novaObs,
        ponto_referencia: pontoReferencia,
        motivo_reagendamento: (alterouData || alterouHorario) ? motivo : null,
        tecnico_id: tecnicoId,
        })
        .eq("id", agendamento.id);

        if (error) {
            alert("Erro ao salvar edições.");
            console.error(error);
        } else {
            const { data: atualizado } = await supabase
                .from("agendamentos")
                .select("*")
                .eq("id", agendamento.id)
                .single();

            if (onAtualizar && atualizado) onAtualizar(atualizado);
            alert("Agendamento atualizado com sucesso.");
        }

        setSalvando(false);
    };


  return (
    <Dialog open={open} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Agendamento #{agendamento.id}</DialogTitle>
          <DialogDescription>
            Informações completas sobre o atendimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Horário</Label>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tecnico">Técnico Responsável *</Label>
            <Select value={tecnicoId} onValueChange={(value) => setTecnicoId(value)}>
                <SelectTrigger>
                <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                {tecnicos.map(tecnico => (
                    <SelectItem key={tecnico.user_id} value={tecnico.user_id}>
                    {tecnico.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>


          <div>
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              placeholder="Atualize as observações do atendimento"
            />
          </div>

          <div>
            <Label>Ponto de Referência</Label>
            <Textarea
              rows={2}
              value={pontoReferencia}
              onChange={(e) => setPontoReferencia(e.target.value)}
              placeholder="Ex: Prédio azul em frente ao mercado"
            />
          </div>

          {(novaData !== agendamento.data || novoHorario !== agendamento.horario) && (
          <div>
            <Label>Motivo da alteração</Label>
            <Textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo do reagendamento/alteração"
            />
          </div>
          )}

          <div className="flex justify-end">
            <Button onClick={salvarEdicao} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditarAgendamentoDialog;
