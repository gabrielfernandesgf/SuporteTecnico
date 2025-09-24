// src/components/NovoAgendamentoDialog.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Loader2, Search } from "lucide-react";

import { criarAgendamento, proximoNumeroAgendamento } from "@/services/agendamentos";
import { buscarClientes, listarClientes, Cliente } from "@/services/clientes";
import { listarTecnicos, UsuarioDTO } from "@/services/usuarios";

type Tecnico = { id: string; nome: string }

interface NovoAgendamentoDialogProps {
  onAgendamentoCriado?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
  children?: React.ReactNode;
}

const tiposAtendimento = ["Treinamento", "Cancelamento", "Verificação de Sistema", "Manutenção", "Instalação", "Suporte Técnico"];

const NovoAgendamentoDialog = ({ onAgendamentoCriado, open: openProp, onOpenChange, asChild, children }: NovoAgendamentoDialogProps) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [_open, _setOpen] = useState(false);
  const open = openProp ?? _open;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : _setOpen(v));

  const [submitting, setSubmitting] = useState(false);

  const [numeroAgendamento, setNumeroAgendamento] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().split("T")[0]);
  const [horario, setHorario] = useState<string>("");

  const [clienteBusca, setClienteBusca] = useState<string>("");
  const [clientesSugestoes, setClientesSugestoes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [endereco, setEndereco] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [tecnicoId, setTecnicoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

  const [abrirPickerCliente, setAbrirPickerCliente] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState("");

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const buscaTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [tecs, prox] = await Promise.all([listarTecnicos(), proximoNumeroAgendamento()]);
        setTecnicos(tecs.map((t: UsuarioDTO) => ({ id: String(t.user_id), nome: String(t.name) })));
        setNumeroAgendamento(String(prox.data ?? prox)); // compatível com seu service
      } catch (e) {
        console.error("Erro ao carregar técnicos/numeração", e);
        toast({ title: "Erro ao carregar técnicos/numeração", variant: "destructive" });
      }
    })();
  }, [open, toast]);

  useEffect(() => {
    if (!abrirPickerCliente) return;
    (async () => {
      try {
        const clientesData = await listarClientes();
        setClientes(clientesData);
      } catch (e) {
        console.error("Erro ao carregar clientes:", e);
        toast({ title: "Erro ao carregar clientes", variant: "destructive" });
      }
    })();
  }, [abrirPickerCliente, toast]);

  const filtrar = async () => {
    try {
      const clientesFiltrados = await buscarClientes(filtro);
      setClientes(clientesFiltrados);
    } catch (e) {
      console.error("Erro ao filtrar clientes:", e);
      toast({ title: "Erro ao filtrar clientes", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!open) return;
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current);
    if (!clienteBusca || clienteBusca.trim().length < 2) {
      setClientesSugestoes([]);
      return;
    }
    buscaTimer.current = window.setTimeout(async () => {
      try {
        const lista = await buscarClientes(clienteBusca.trim());
        setClientesSugestoes(lista);
      } catch (e) {
        console.error("Erro buscando clientes:", e);
      }
    }, 300);
    return () => { if (buscaTimer.current) window.clearTimeout(buscaTimer.current); };
  }, [clienteBusca, open]);

  const prontoParaSalvar = useMemo(
    () => !!(clienteSelecionado?.id && tipo && tecnicoId && horario && data),
    [clienteSelecionado, tipo, tecnicoId, horario, data]
  );

  const handleSelecionarCliente = (c: Cliente) => {
    setClienteSelecionado(c);
    setClienteBusca(`${c.id} - ${c.nome}`);
    setEndereco(c.endereco ?? "");
    setClientesSugestoes([]);
  };

  const handleOpenChange = (novo: boolean) => {
    setOpen(novo);
    if (!novo) {
      setNumeroAgendamento("");
      setData(new Date().toISOString().split("T")[0]);
      setHorario("");
      setClienteBusca("");
      setClienteSelecionado(null);
      setClientesSugestoes([]);
      setEndereco("");
      setTipo("");
      setTecnicoId("");
      setObservacoes("");
      if (buscaTimer.current) window.clearTimeout(buscaTimer.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prontoParaSalvar) {
      toast({ title: "Campos obrigatórios", description: "Preencha cliente, tipo, data, horário e técnico.", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      await criarAgendamento({
        codigoCliente: Number(clienteSelecionado!.id),
        codigoResponsavel: Number(tecnicoId),
        data,
        hora: horario,
        titulo: tipo,
        observacao: observacoes,
        grupoAgendamento: 52,
        nomeCliente: clienteSelecionado!.nome,
      });
      toast({ title: "Agendamento criado!", description: `Agendamento #${numeroAgendamento} criado com sucesso.` });
      handleOpenChange(false);
      onAgendamentoCriado?.();
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast({ title: "Erro ao criar agendamento", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (userProfile?.role !== "secretaria") return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild={!!asChild}>
        {asChild && children ? (
          children
        ) : (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Agendamento</DialogTitle>
          <DialogDescription>Preencha os dados para criar um novo agendamento</DialogDescription>
        </DialogHeader>

        {/* -- FORM -- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número do Agendamento</Label>
              <Input value={numeroAgendamento} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome do Cliente *</Label>
            <div className="flex gap-2">
              <Input readOnly value={clienteSelecionado ? `${clienteSelecionado.id} - ${clienteSelecionado.nome}` : ""} placeholder="Nenhum cliente selecionado" />
              <Button type="button" variant="outline" onClick={() => setAbrirPickerCliente(true)}>
                <Search className="mr-2 h-4 w-4" /> Selecionar
              </Button>
            </div>
          </div>

          {/* Picker de Cliente */}
          <Dialog open={abrirPickerCliente} onOpenChange={setAbrirPickerCliente}>
            <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Selecionar Cliente</DialogTitle></DialogHeader>
              <div className="flex gap-2">
                <Input placeholder="Buscar por nome (opcional)" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                <Button type="button" onClick={filtrar}><Search className="mr-2 h-4 w-4" />Buscar</Button>
              </div>
              <div className="mt-3 max-h-[320px] overflow-auto rounded border">
                {clientes.map((c) => (
                  <div key={c.id} className="cursor-pointer hover:bg-muted px-3 py-2 border-b last:border-b-0"
                    onClick={() => { setAbrirPickerCliente(false); setClienteSelecionado(c); setClienteBusca(`${c.id} - ${c.nome}`); setEndereco(c.endereco ?? ""); }}>
                    <div className="font-medium">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.endereco} {c.enderecoNumero && `, ${c.enderecoNumero}`} {c.bairro && ` - ${c.bairro}`}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input placeholder="Endereço do cliente" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Solicitação *</Label>
              <Select onValueChange={setTipo} value={tipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>{tiposAtendimento.map((t) => <SelectItem value={t} key={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Técnico Responsável *</Label>
            <Select onValueChange={setTecnicoId} value={tecnicoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
              <SelectContent>
                {tecnicos.map((t) => (
                  <SelectItem key={(t as any).user_id ?? (t as any).id} value={(t as any).user_id ?? (t as any).id}>
                    {(t as any).name ?? (t as any).nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button type="submit" disabled={submitting || !prontoParaSalvar}>
              {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>) : ("Criar Agendamento")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoAgendamentoDialog;
