import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Search, ArrowLeft, RotateCcw } from "lucide-react";

import { criarAgendamento, proximoNumeroAgendamento, atualizarAgendamento } from "@/services/agendamentos";
import { buscarClientesArray as buscarClientes, Cliente } from "@/services/clientes";
import { listarTecnicos } from "@/services/usuarios";

import { converterEncaixe, atualizarEncaixe as patchEncaixe } from "@/services/encaixes";
import { api } from "@/services/api";

interface NovoAgendamentoFormProps {
  onAgendamentoCriado?: () => void;
  onVoltar?: () => void;
}

const tiposAtendimento = [
  "Treinamento",
  "Cancelamento",
  "Verificação de Sistema",
  "Manutenção",
  "Instalação",
  "Suporte Técnico",
];

type TecnicoUI = { id: string; nome: string };

const dateInputValue = (d: Date) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
};
const timeInputValue = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const toIsoLocal = (dateStr: string, timeStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);
  const off = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - off).toISOString().slice(0, 19);
};
const nowIsoLocal = () => {
  const now = new Date();
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 19);
};

const normalizaTipo = (t?: string | null) => {
  if (!t) return "";
  const s = t.toLowerCase();
  if (s.includes("manutenção")) return "Manutenção";
  if (s.includes("verificaçao")) return "Verificação de Sistema";
  if (s.includes("instala")) return "Instalação";
  if (s.includes("trein")) return "Treinamento";
  if (s.includes("suporte")) return "Suporte Técnico";
  if (s.includes("cancel")) return "Cancelamento";
  return "";
}

export default function NovoAgendamentoForm({
  onAgendamentoCriado,
  onVoltar,
}: NovoAgendamentoFormProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [sp] = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [numeroAgendamento, setNumeroAgendamento] = useState<string>("");

  const now = new Date();
  const [dataVisita, setDataVisita] = useState<string>(dateInputValue(now));
  const [horaVisita, setHoraVisita] = useState<string>("");

  // cliente (autocomplete)
  const [clienteBusca, setClienteBusca] = useState<string>("");
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  // técnico
  const [tecnicoId, setTecnicoId] = useState<string>("");
  const [tecnicos, setTecnicos] = useState<TecnicoUI[]>([]);

  const buscaTimer = useRef<number | null>(null);
  const sugestoesBoxRef = useRef<HTMLDivElement | null>(null);

  // demais campos
  const [tipo, setTipo] = useState<string>("");
  const [abertura, setAbertura] = useState<string>("");

  // NEW: campos extras
  const [contatoSolicitante, setContatoSolicitante] = useState<string>(""); // quem ligou
  const [carro, setCarro] = useState<string>("");                            // placa/descrição

  // NEW: secretária a partir do usuário logado
  const secretariaId =
    Number(userProfile?.user_id ?? 0);

  const secretariaNome =
    (userProfile?.name ??
      (userProfile as any)?.NOME ??
      "") as string;

  useEffect(() => {
    (async () => {
      try {
        setCarregandoDados(true);
        const [tecs, prox] = await Promise.all([listarTecnicos(), proximoNumeroAgendamento()]);
        const tecnicosValidos = (tecs ?? [])
          .map((t: any) => ({ id: String(t.user_id ?? t.id ?? ""), nome: String(t.name ?? t.nome ?? "") }))
          .filter((t) => t.id && t.nome);
        setTecnicos(tecnicosValidos);

        const proxVal = (prox as any)?.data ?? prox;
        setNumeroAgendamento(String(proxVal));

        // 🔽 Pré-preenche pelo querystring
        const qClienteId = sp.get("clienteId");
        const qClienteNome = sp.get("clienteNome");
        const qTec = sp.get("tec");
        const qTipo = sp.get("tipo");
        const qEncaixe = sp.get("encaixe");

        if (qClienteId && qClienteNome) {
          const c: Cliente = { id: qClienteId, nome: qClienteNome } as any;
          setClienteSelecionado(c);
          setClienteBusca(`${c.id} - ${c.nome}`);
        } else if (qClienteNome) {
          setClienteBusca(qClienteNome);
        }
        if (qTec) setTecnicoId(qTec);
        if (qTipo) setTipo(normalizaTipo(qTipo));

        // se veio do encaixe, tenta puxar observação para a "Abertura"
        if (qEncaixe) {
          try {
            const { data } = await api.get(`/encaixes/${qEncaixe}`);
            if (data?.observacao) setAbertura(String(data.observacao));
          } catch { }
        }
      } catch {
        toast({ title: "Erro ao carregar técnicos/numeração", variant: "destructive" });
      } finally {
        setCarregandoDados(false);
      }
    })();
  }, [toast, sp]);

  // autocomplete
  useEffect(() => {
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current);
    const q = clienteBusca.trim();
    if (q.length < 2) { setSugestoes([]); return; }
    buscaTimer.current = window.setTimeout(async () => {
      try { setSugestoes(await buscarClientes(q)); } catch { }
    }, 300);
    return () => { if (buscaTimer.current) window.clearTimeout(buscaTimer.current); };
  }, [clienteBusca]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (sugestoesBoxRef.current && !sugestoesBoxRef.current.contains(ev.target as Node)) setSugestoes([]);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selecionarCliente = (c: Cliente) => {
    setClienteSelecionado(c);
    setClienteBusca(`${c.id} - ${c.nome}`);
    setSugestoes([]);
  };

  const prontoParaSalvar = useMemo(
    () => !!(clienteSelecionado?.id && tipo && tecnicoId && horaVisita && dataVisita),
    [clienteSelecionado, tipo, tecnicoId, horaVisita, dataVisita]
  );

  const limparFormulario = () => {
    const now = new Date();
    setDataVisita(dateInputValue(now));
    setHoraVisita("");
    setClienteBusca("");
    setClienteSelecionado(null);
    setSugestoes([]);
    setTipo("");
    setTecnicoId("");
    setAbertura("");
    setContatoSolicitante(""); // NEW
    setCarro("");              // NEW
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prontoParaSalvar || !clienteSelecionado) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, tipo, data e horário da visita e técnico.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const inicio = toIsoLocal(dataVisita, horaVisita);

      const payload: Record<string, any> = {
        codigoCliente: Number(clienteSelecionado.id),
        nomeCliente: clienteSelecionado.nome,
        codigoResponsavel: Number(tecnicoId),
        codigoGrupo: 52,
        statusAg: "AB",
        agendaAbertura: abertura || "",
        titulo: tipo,
        dataHoraAbertura: nowIsoLocal(),
        dataHoraInicial: inicio,
        inativo: "N",
        numPedido: 0,
        codLoja: 1,
        codChecklist: 0,

        secretariaUsuarioId: secretariaId,
        secretariaNome: secretariaNome || null,
        contatoSolicitante: contatoSolicitante || null,
        carro: carro || null,
      };

      const resp = await criarAgendamento(payload);
      if (!(resp as any)?.success) throw new Error((resp as any)?.error || "Falha ao criar agendamento");

      const dado = (resp as any).data ?? {};
      const chaveCriada: number | undefined = dado?.chave ?? dado?.CHAVE ?? dado?.id ?? undefined;
      const numeroCriado = dado?.chave ?? dado?.CHAVE;

      // vínculo com o ENCAIXE, se veio de lá
      const enc = sp.get("encaixe");
      if (enc && chaveCriada) {
        try {
          // tenta o caminho preferido (com agendamentoId)
          await converterEncaixe(Number(enc), Number(chaveCriada));
        } catch {
          // fallback: marca como convertido e amarra a chave do agendamento
          await patchEncaixe(Number(enc), { status: "C", chaveAgendamento: chaveCriada } as any);
        }
      }

      toast({
        title: "Agendamento criado!",
        description: `Agendamento #${numeroCriado ?? chaveCriada} criado com sucesso.`,
      });

      const prox = await proximoNumeroAgendamento();
      setNumeroAgendamento(String((prox as any)?.data ?? prox));
      limparFormulario();
      onAgendamentoCriado?.();
    } catch (error: any) {
      toast({ title: "Erro ao criar agendamento", description: error?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (userProfile?.role !== "secretaria") {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso não autorizado</p>
      </div>
    );
  }

  if (carregandoDados) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        {onVoltar && (
          <Button variant="outline" size="sm" onClick={onVoltar}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        )}
        <h1 className="text-2xl font-semibold">Novo Agendamento</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Preencha os dados para criar um novo agendamento
      </p>

      <form onSubmit={handleSubmit} className="w-full">
        {/* linha superior */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Label className="block text-xs font-semibold mb-2 uppercase">N° do Agendamento</Label>
            <Input value={numeroAgendamento} readOnly />
          </div>
          <div>
            <Label className="block text-xs font-semibold mb-2 uppercase">Data da Abertura</Label>
            <Input type="date" value={dateInputValue(new Date())} readOnly />
          </div>
          <div>
            <Label className="block text-xs font-semibold mb-2 uppercase">Horário da Abertura</Label>
            <Input type="time" value={timeInputValue(new Date())} readOnly />
          </div>

          {/* NEW: Secretária exibido (somente leitura) */}
          <div className="md:col-span-2">
            <Label className="block text-xs font-semibold mb-2 uppercase">Secretária</Label>
            <Input value={secretariaNome || (secretariaId ? `Usuário ${secretariaId}` : "—")} readOnly />
          </div>
        </div>

        {/* Cliente autocomplete */}
        <div className="mb-6 relative" ref={sugestoesBoxRef}>
          <Label>Nome do Cliente *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value);
                setClienteSelecionado(null);
              }}
              placeholder="Digite para buscar (mín. 2 letras)"
              className="pl-9"
              autoComplete="off"
            />
            {sugestoes.length > 0 && (
              <div role="listbox" className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {sugestoes.map((c) => (
                  <div
                    key={c.id}
                    role="option"
                    className="cursor-pointer rounded px-2 py-1.5 hover:bg-accent"
                    onClick={() => selecionarCliente(c)}
                  >
                    <div className="font-medium text-sm">{c.id} - {c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.endereco}{c.enderecoNumero && `, ${c.enderecoNumero}`}{c.bairro && ` - ${c.bairro}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalhes */}
        <div className="border-b border-gray-900/10 pb-8">
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Label>Data da Visita *</Label>
              <Input type="date" value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} required />
            </div>
            <div className="sm:col-span-3">
              <Label>Horário da Visita *</Label>
              <Input type="time" value={horaVisita} onChange={(e) => setHoraVisita(e.target.value)} required />
            </div>

            <div className="sm:col-span-3">
              <Label>Tipo de Solicitação *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposAtendimento.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Label>Técnico Responsável *</Label>
              <Select value={tecnicoId} onValueChange={setTecnicoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* NEW: Quem solicitou e Carro */}
            <div className="sm:col-span-3">
              <Label>Quem está solicitando (responsável)</Label>
              <Input
                placeholder="Nome de quem ligou / responsável"
                value={contatoSolicitante}
                onChange={(e) => setContatoSolicitante(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Label>Carro (placa/descrição)</Label>
              <Input
                placeholder="Ex.: ABC-1D23"
                value={carro}
                onChange={(e) => setCarro(e.target.value.toUpperCase())}
              />
            </div>

            <div className="col-span-full">
              <Label>Abertura</Label>
              <Textarea
                rows={5}
                value={abertura}
                onChange={(e) => setAbertura(e.target.value)}
                placeholder="Descreva a abertura do atendimento"
              />
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-x-3">
          <Button type="button" variant="ghost" onClick={() => (onVoltar ? onVoltar() : window.history.back())}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button type="button" variant="secondary" onClick={limparFormulario} disabled={submitting}>
            <RotateCcw className="mr-2 h-4 w-4" /> Limpar
          </Button>
          <Button type="submit" disabled={submitting || !prontoParaSalvar} className="min-w-[140px]">
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : ("Salvar")}
          </Button>
        </div>
      </form>
    </div>
  );
}
