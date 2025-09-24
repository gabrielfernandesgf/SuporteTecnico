import { useEffect, useMemo, useState } from "react";
import {
  listarEncaixes,
  removerEncaixe,
  StatusEncaixe,
  EncaixeListItem,
  atribuirTecnicoEncaixe,
  listarEncaixesAguardando,
  converterEncaixe,
} from "@/services/encaixes";
import { listarTecnicos } from "@/services/usuarios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import EncaixeEditDialog from "@/components/EncaixeEditDialog";
import { useAuth } from "@/hooks/useAuth";

type Encaixe = EncaixeListItem;
type Tecnico = { id: string; nome: string };

const urgLabel = (u?: string | null) => (u === "A" ? "Alta" : u === "M" ? "Média" : u === "B" ? "Baixa" : "—");
const urgPeso = (u?: string | null) => (u === "A" ? 3 : u === "M" ? 2 : u === "B" ? 1 : 0);

const tipoLabel: Record<string, string> = {
  T: "Treinamento",
  C: "Cancelamento",
  V: "Verificação de Sistema",
  M: "Manutenção de Equipamentos",
  I: "Instalação",
  S: "Suporte Técnico",
};

export default function EncaixesListPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { userProfile } = useAuth();
  const isTecnico = (userProfile?.role === "tecnico");
  const tecnicoId = Number(userProfile?.user_id ?? 0);

  const [lista, setLista] = useState<Encaixe[]>([]);
  const [loading, setLoading] = useState(false);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusEncaixe | "TODOS">("A"); // <- inclui "P"
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [atribuindo, setAtribuindo] = useState<{ chave: number; tecId?: string }>({ chave: 0 });

  const [mapTec, setMapTec] = useState<Record<string, string>>({});

  const [editOpen, setEditOpen] = useState(false);
  const [editChave, setEditChave] = useState<number | null>(null);

  // técnicos
  useEffect(() => {
    (async () => {
      const tecs = await listarTecnicos();
      const arr: Tecnico[] = (tecs ?? [])
        .map((t: any) => ({ id: String(t.user_id ?? t.id ?? ""), nome: String(t.nome ?? t.name ?? "").trim() }))
        .filter((t) => t.id && t.nome);
      setTecnicos(arr);
      const m: Record<string, string> = {};
      arr.forEach((t) => (m[t.id] = t.nome));
      setMapTec(m);
    })();
  }, []);

  // se veio com ?f=pendentes -> status "P"
  useEffect(() => {
    if (sp.get("f") === "pendentes") setStatus("P");
  }, [sp]);

  const primeiroNome = (id?: number | null) => {
    if (!id) return "—";
    const nome = mapTec[String(id)] || "";
    return nome ? nome.split(" ")[0] : "—";
  };

  // listar encaixes
  async function fetchData() {
    setLoading(true);
    try {
      let data: Encaixe[] = [];
      if (status === "P") {
        data = await listarEncaixesAguardando();
      } else {
        data = await listarEncaixes(!isTecnico && status === "TODOS" ? undefined : { status: status as StatusEncaixe });
      }
      // se técnico → somente os dele
      if (isTecnico) data = (data ?? []).filter((e: any) => Number(e.codigoResponsavel) === tecnicoId);

      setLista(data);
    } catch (e: any) {
      toast({ title: "Erro ao listar encaixes", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { 
    fetchData(); 
  }, [status, isTecnico, tecnicoId]);

  // filtro local + ordenação
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = [...lista];
    const ordenar = (arr: Encaixe[]) => arr.sort((a, b) => urgPeso(b.tipoUrgencia) - urgPeso(a.tipoUrgencia));
    if (!q) return ordenar(base);
    return ordenar(
      base.filter(
        (e) =>
          (e.nomeCliente ?? "").toLowerCase().includes(q) ||
          (e.foneCliente ?? "").toLowerCase().includes(q) ||
          (tipoLabel[String(e.tipoSolicitacao ?? "")] ?? "").toLowerCase().includes(q)
      )
    );
  }, [lista, busca]);

  async function handleAtribuir(chave: number, tecId: string) {
    try {
      if (!tecId) return;
      setAtribuindo({ chave, tecId });
      await atribuirTecnicoEncaixe(chave, Number(tecId)); // serviço com fallback (ver passo 2)
      toast({ title: "Técnico atribuído" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro ao atribuir", description: e?.message, variant: "destructive" });
    } finally {
      setAtribuindo({ chave: 0, tecId: undefined });
    }
  }

  async function handleExcluir(chave: number) {
    if (!confirm(`Excluir encaixe #${chave}?`)) return;
    try {
      await removerEncaixe(chave);
      toast({ title: "Encaixe excluído" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e?.message, variant: "destructive" });
    }
  }

  async function handleConverter(e: Encaixe) {
    if (status === "P") {
      try {
        await converterEncaixe(e.chave);
        toast({ title: "Encaixe convertido", description: "Agendamento criado com sucesso." });
        fetchData();
      } catch (err: any) {
        toast({ title: "Erro ao converter", description: err?.message ?? "Tente novamente.", variant: "destructive" });
      }
      return;
    }

    if (!Number(e.codigoCliente)) {
      toast({
        title: "Encaixe sem cliente",
        description: "Associe um cliente ao encaixe antes de converter.",
        variant: "destructive",
      });
      return;
    }

    const params = new URLSearchParams({
      clienteId: String(e.codigoCliente!),
      clienteNome: String(e.nomeCliente ?? ""),
      tec: String(e.codigoResponsavel ?? ""),
      tipo: tipoLabel[String(e.tipoSolicitacao ?? "")] ?? "",
      encaixe: String(e.chave),
    });

    navigate(`/agendamentos/novo?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isTecnico ? (
                <>
                <SelectItem value="A">Abertos</SelectItem>
                <SelectItem value="P">Aguardando autorização</SelectItem>
                </>
              ) : (
                <>
                <SelectItem value="A">Abertos</SelectItem>
                <SelectItem value="P">Aguardando autorização</SelectItem>
                <SelectItem value="C">Convertidos</SelectItem>
                <SelectItem value="E">Excluídos</SelectItem>
                <SelectItem value="TODOS">Todos</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="w-80">
          <Label>Buscar</Label>
          <Input placeholder="Cliente, telefone ou tipo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            Atualizar
          </Button>
          {!isTecnico && <Button onClick={() => navigate("/encaixes/novo")}>+ Novo Encaixe</Button> }
        </div>
      </div>

      <Card className="p-0 overflow-auto">
        <table className="min-w-[900px] w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 border">#</th>
              <th className="text-left p-3 border">Cliente</th>
              <th className="text-left p-3 border">Tipo</th>
              <th className="text-left p-3 border">Urgência</th>
              <th className="text-left p-3 border">Telefone</th>
              <th className="text-left p-3 border">Técnico</th>
              <th className="text-left p-3 border">Abertura</th>
              <th className="text-left p-3 border w-[240px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Nenhum encaixe encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              filtrados.map((e) => (
                <tr key={e.chave} className="hover:bg-muted/30">
                  <td className="p-3 border font-mono">#{e.chave}</td>
                  <td className="p-3 border">
                    <div className="font-medium">{e.nomeCliente ?? "—"}</div>
                  </td>
                  <td className="p-3 border">{tipoLabel[String(e.tipoSolicitacao ?? "")] ?? "—"}</td>
                  <td className="p-3 border">
                    <Badge
                      variant={e.tipoUrgencia === "A" ? "destructive" : e.tipoUrgencia === "M" ? "default" : "secondary"}
                    >
                      {urgLabel(e.tipoUrgencia)}
                    </Badge>
                  </td>
                  <td className="p-3 border">{e.foneCliente ?? "—"}</td>
                  <td className="p-3 border">
                    {e.codigoResponsavel ? primeiroNome(e.codigoResponsavel) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 border">
                    {e.dataHoraAbertura ? e.dataHoraAbertura.replace("T", " ").slice(0, 16) : "—"}
                  </td>
                  <td className="p-3 border">
                    {isTecnico ? (
                      <span className="text-muted-foreground">—</span>
                    ) : status === "P" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => { setEditChave(e.chave); setEditOpen(true); }}>Editar</Button>
                        <Button variant="secondary" onClick={() => handleConverter(e)}>Converter</Button>
                        <Button variant="outline" onClick={() => handleExcluir(e.chave)}>Excluir</Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                      {/* Atribuir técnico */}
                      <Select
                        value={atribuindo.chave === e.chave ? atribuindo.tecId : undefined}
                        onValueChange={(v) => handleAtribuir(e.chave, v)}
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue placeholder={e.codigoResponsavel ? "Reatribuir técnico" : "Atribuir técnico"} />
                        </SelectTrigger>
                        <SelectContent>
                          {tecnicos.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => { setEditChave(e.chave); setEditOpen(true); }}
                      >
                        Editar
                      </Button>

                      <Button variant="secondary" onClick={() => handleConverter(e)}>
                        Converter
                      </Button>

                      <Button variant="outline" onClick={() => handleExcluir(e.chave)}>
                        Excluir
                      </Button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
      {/* Dialog de edição */}
      {!isTecnico && (
        <EncaixeEditDialog
        open={editOpen}
        encaixeChave={editChave}
        onOpenChange={setEditOpen}
        onSaved={fetchData}
      />
      )}
    </div>
  );
}
