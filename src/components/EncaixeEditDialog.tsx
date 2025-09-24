import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { atualizarEncaixe, TipoSolic, Urgencia } from "@/services/encaixes";
import { buscarClientesArray as buscarClientes, Cliente } from "@/services/clientes";

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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chave: number;
  onSaved?: () => void;
};

export default function EncaixeEditDialog({ open, onOpenChange, chave, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clienteBusca, setClienteBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [codigoCliente, setCodigoCliente] = useState<number | null>(null);
  const [nomeCliente, setNomeCliente] = useState<string>("");

  const [fone, setFone] = useState<string>("");
  const [tipo, setTipo] = useState<TipoSolic | "">("");
  const [urgencia, setUrgencia] = useState<Urgencia | "">("");
  const [observacao, setObservacao] = useState<string>("");

  // autocomplete cliente
  useEffect(() => {
    if (!open) return;
    const q = clienteBusca.trim();
    if (q.length < 2) { setSugestoes([]); return; }
    const t = setTimeout(async () => {
      try { setSugestoes(await buscarClientes(q)); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [open, clienteBusca]);

  function selecionar(c: Cliente) {
    setCodigoCliente(Number(c.id));
    setNomeCliente(c.nome);
    setClienteBusca(`${c.id} - ${c.nome}`);
    setSugestoes([]);
    if (!fone) setFone(c.fone ?? "");
  }

  async function salvar() {
    if (!codigoCliente) return;
    setSaving(true);
    try {
      await atualizarEncaixe(chave, {
        codigoCliente,
        nomeCliente,
        foneCliente: fone,
        tipoSolicitacao: tipo || undefined,
        tipoUrgencia: urgencia || undefined,
        observacao,
      });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Encaixe #{chave}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-4 text-muted-foreground">Carregando…</div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input
                value={clienteBusca}
                onChange={(e) => { setClienteBusca(e.target.value); setCodigoCliente(null); }}
                placeholder="Digite para buscar (mín. 2 letras)"
              />
              {sugestoes.length > 0 && (
                <div className="mt-1 border rounded-md max-h-60 overflow-auto bg-popover p-1">
                  {sugestoes.map((c) => (
                    <div key={c.id}
                      className="px-2 py-1.5 rounded cursor-pointer hover:bg-accent"
                      onClick={() => selecionar(c)}>
                      <div className="text-sm font-medium">{c.id} — {c.nome}</div>
                      <div className="text-xs text-muted-foreground">{c.endereco}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Telefone</Label>
              <Input value={fone} onChange={(e) => setFone(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={tipo || undefined} onValueChange={(v) => setTipo(v as TipoSolic)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgência</Label>
                <Select value={urgencia || undefined} onValueChange={(v) => setUrgencia(v as Urgencia)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {URGENCIAS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observação</Label>
              <Textarea rows={5} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !codigoCliente}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
