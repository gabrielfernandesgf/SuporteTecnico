import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Search, ArrowLeft, RotateCcw } from "lucide-react";

import { criarEncaixe, TipoSolic, Urgencia } from "@/services/encaixes";
import { buscarClientesArray as buscarClientes, Cliente } from "@/services/clientes";
import { listarTecnicos } from "@/services/usuarios";

type TecnicoUI = { id: string; nome: string };
type Props = { onVoltar?: () => void };

const TIPOS: { value: TipoSolic; label: string }[] = [
  { value: "T", label: "Treinamento" },
  { value: "C", label: "Cancelamento" },
  { value: "V", label: "Verificação de Sistema" },
  { value: "M", label: "Manutenção de Equipamentos" },
  { value: "I", label: "Instalação" },
  { value: "S", label: "Suporte Técnico" },
];

const URGENCIAS: { value: Urgencia; label: string }[] = [
  { value: "B", label: "Baixa" },
  { value: "M", label: "Média" },
  { value: "A", label: "Alta" },
];

export default function EncaixeNovoPage({ onVoltar} : Props) {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // cliente (autocomplete)
  const [clienteBusca, setClienteBusca] = useState<string>("");
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);

  // telefone opcional (pode vir do cliente ou ser digitado)
  const [fone, setFone] = useState<string>("");

  // técnico é OPCIONAL (regra: secretaria geralmente cria SEM técnico)
  const [tecnicoId, setTecnicoId] = useState<string>("");
  const [tecnicos, setTecnicos] = useState<TecnicoUI[]>([]);

  const [tipo, setTipo] = useState<TipoSolic | "" >("");
  const [urgencia, setUrgencia] = useState<Urgencia | "" >("");
  const [observacao, setObservacao] = useState<string>("");

  const buscaTimer = useRef<number | null>(null);
  const sugestoesBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setCarregando(true);
        const tecs = await listarTecnicos();
        const tecnicosValidos = (tecs ?? [])
          .map((t: any) => ({ id: String(t.user_id ?? ""), nome: String(t.nome ?? t.name ?? "") }))
          .filter((t) => t.id && t.nome);
        setTecnicos(tecnicosValidos);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  // autocomplete de clientes
  useEffect(() => {
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current);
    const q = clienteBusca.trim();
    if (q.length < 2) {
      setSugestoes([]);
      return;
    }
    buscaTimer.current = window.setTimeout(async () => {
      try { setSugestoes(await buscarClientes(q)); } catch {}
    }, 300);
    return () => { if (buscaTimer.current) window.clearTimeout(buscaTimer.current); };
  }, [clienteBusca]);

  // fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (sugestoesBoxRef.current && !sugestoesBoxRef.current.contains(ev.target as Node)) {
        setSugestoes([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selecionarCliente = (c: Cliente) => {
    setClienteSel(c);
    setClienteBusca(`${c.id} - ${c.nome}`);
    setSugestoes([]);
    if (!fone) setFone(c.fone ?? "");
  };

  const pronto = !!(clienteSel?.id && tipo && urgencia);

  const limpar = () => {
    setClienteBusca(""); setClienteSel(null); setSugestoes([]);
    setFone(""); setTecnicoId(""); setTipo(""); setUrgencia(""); setObservacao("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pronto || !clienteSel) {
      toast({ title: "Campos obrigatórios", description: "Preencha cliente, tipo e urgência.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const payload: any = {
        nomeCliente: clienteSel.nome,
        codigoCliente: Number(clienteSel.id),
        // regra: pode ir SEM técnico → não envie a propriedade se estiver vazia
        ...(tecnicoId ? { codigoResponsavel: Number(tecnicoId) } : {}),
        tipoSolicitacao: tipo,
        tipoUrgencia: urgencia,
        observacao,
        foneCliente: fone,
        status: "A", // em aberto
      };
      const resp = await criarEncaixe(payload);
      if ((resp as any)?.error) throw new Error((resp as any).error);
      toast({ title: "Encaixe criado!", description: "Ele aparecerá no painel para aceite do técnico." });
      limpar();
    } catch (err: any) {
      toast({ title: "Erro ao criar encaixe", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (userProfile?.role !== "secretaria") {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Acesso não autorizado</div>;
  }

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold">Novo Encaixe</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Cadastre o pré-atendimento (encaixe). O técnico poderá aceitar e, após confirmar com o cliente, você converte em agendamento.
      </p>

      <form onSubmit={onSubmit} className="w-full space-y-6">
        {/* Cliente */}
        <div className="relative" ref={sugestoesBoxRef}>
          <Label>Cliente *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={clienteBusca}
              onChange={(e) => { setClienteBusca(e.target.value); setClienteSel(null); }}
              placeholder="Digite para buscar (mín. 2 letras)"
              autoComplete="off"
            />
            {sugestoes.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {sugestoes.map((c) => (
                  <div key={c.id} className="cursor-pointer rounded px-2 py-1.5 hover:bg-accent" onClick={() => selecionarCliente(c)}>
                    <div className="font-medium text-sm">{c.id} — {c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.endereco}{c.enderecoNumero && `, ${c.enderecoNumero}`}{c.bairro && ` - ${c.bairro}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Telefone opcional */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Telefone do Cliente</Label>
            <Input value={fone} onChange={(e) => setFone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>

          {/* Técnico OPCIONAL */}
          <div>
            <Label>Técnico (opcional)</Label>
            <Select value={tecnicoId || undefined} 
            onValueChange={(v) => setTecnicoId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem técnico</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Urgência */}
          <div>
            <Label>Urgência *</Label>
            <Select
              value={urgencia || undefined} 
              onValueChange={(v) => setUrgencia(v as Urgencia)}
              >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {URGENCIAS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tipo + Observação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Tipo de Solicitação *</Label>
            <Select 
              value={tipo || undefined} 
              onValueChange={(v) => setTipo(v as TipoSolic)}
              >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Observação</Label>
            <Textarea rows={5} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Descreva a demanda do cliente..." />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-x-3">
          <Button variant="outline" size="sm" onClick={() => (onVoltar ? onVoltar() : window.history.back())}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button type="button" variant="secondary" onClick={limpar} disabled={submitting}>
            <RotateCcw className="mr-2 h-4 w-4" /> Limpar
          </Button>
          <Button type="submit" disabled={submitting || !pronto} className="min-w-[140px]">
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : ("Salvar")}
          </Button>
      
        </div>
      </form>
    </div>
  );
}
