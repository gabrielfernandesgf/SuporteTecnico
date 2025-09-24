import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, MapPin, CheckCircle, Play, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  listarMeusAgendamentos,
  registrarSaida,
  registrarChegada,
  finalizarComAssinatura,
  type Coords,
} from "@/services/tecnico";
import { listarEncaixesDoTecnico } from "@/services/encaixes";

/* ====== Assinatura (canvas) — mantido ====== */
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    function fit() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const parentW = canvas.parentElement?.clientWidth ?? 320;
      const w = Math.min(600, parentW);
      const h = Math.round(w * 0.4);
      canvas.width = w * ratio; canvas.height = h * ratio;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2;
      ctx.strokeStyle = "#111827";
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const pos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    return { x, y };
  };
  const start = (e: any) => { drawing.current = true; const { x, y } = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e: any) => { if (!drawing.current) return; const { x, y } = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); };
  const end = () => { drawing.current = false; onChange(canvasRef.current!.toDataURL("image/png")); };
  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="border rounded-md bg-white touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <div className="text-xs text-muted-foreground">Assine no quadro acima</div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={clear}>Limpar</Button>
      </div>
    </div>
  );
}

/* ==================== Página ==================== */
export default function TecnicoView() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const tecnicoId = Number(userProfile?.user_id ?? 0);

  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [encAbertos, setEncAbertos] = useState<any[]>([]);
  const [encPendentes, setEncPendentes] = useState<any[]>([]);

  // filtro de dia
  const [dia, setDia] = useState<"ontem" | "hoje" | "amanha">("hoje");

  // finalizar (modal)
  const [finOpen, setFinOpen] = useState(false);
  const [finId, setFinId] = useState<string | null>(null);
  const [finObs, setFinObs] = useState("");
  const [finAss, setFinAss] = useState<string | null>(null);

  const formatHora = (iso?: string) => iso ? iso.slice(11, 16) : "";
  const formatDataPt = (d?: string) => (!d ? "" : `${d.split("-")[2]}/${d.split("-")[1]}/${d.split("-")[0]}`);
  const statusColor = (s: string) =>
    s === "agendado" ? "agendado" :
    s === "em_deslocamento" ? "warning" :
    s === "em_andamento" ? "em_andamento" :
    s === "finalizado" ? "finalizado" : "default";
  const statusLabel = (s: string) =>
    s === "agendado" ? "agendado" :
    s === "em_deslocamento" ? "em deslocamento" :
    s === "em_andamento" ? "em andamento" :
    s === "finalizado" ? "finalizado" : s?.replace("_", " ");

  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  const hoje = new Date();
  const yOntem = toYMD(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1));
  const yHoje = toYMD(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const yAmanha = toYMD(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1));
  const alvoYMD = dia === "ontem" ? yOntem : dia === "amanha" ? yAmanha : yHoje;

  const agendamentosFiltrados = useMemo(
    () => agendamentos.filter(a => a.data === alvoYMD),
    [agendamentos, alvoYMD]
  );

  useEffect(() => {
    (async () => {
      if (!tecnicoId || userProfile?.role !== "tecnico") { setLoading(false); return; }
      try {
        // permissões de geoloc não bloqueiam a tela
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
        const [ags, abertos, pend] = await Promise.all([
          listarMeusAgendamentos(tecnicoId),
          listarEncaixesDoTecnico(tecnicoId, "A").catch(() => []),
          listarEncaixesDoTecnico(tecnicoId, "P").catch(() => []),
        ]);
        setAgendamentos(ags);
        setEncAbertos(abertos ?? []);
        setEncPendentes(pend ?? []);
      } catch (e) {
        console.error(e);
        toast({ title: "Erro", description: "Não foi possível carregar sua agenda", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [tecnicoId, userProfile?.role, toast]);

  // helpers localização
  async function getCoords(): Promise<Coords | undefined> {
    if (!navigator.geolocation) return undefined;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ações do agendamento (técnico ainda pode operar no agendamento)
  async function onSaida(id: string) {
    try {
      const geo = await getCoords();
      await registrarSaida(id, tecnicoId, geo);
      setAgendamentos(p => p.map(a => a.id === id ? { ...a, saida_horario: new Date().toISOString(), status: "em_deslocamento" } : a));
      toast({ title: "Saída registrada", description: "Boa rota!" });
    } catch {
      toast({ title: "Erro", description: "Falha ao registrar saída", variant: "destructive" });
    }
  }
  async function onChegada(id: string) {
    try {
      const geo = await getCoords();
      await registrarChegada(id, tecnicoId, geo);
      const now = new Date().toISOString();
      setAgendamentos(p => p.map(a => a.id === id ? { ...a, chegada_horario: now, status: "em_andamento" } : a));
      toast({ title: "Chegada registrada" });
    } catch {
      toast({ title: "Erro", description: "Falha ao registrar chegada", variant: "destructive" });
    }
  }
  function resetFinalizacaoState() { setFinId(null); setFinObs(""); setFinAss(null); }
  async function onFinalizar() {
    if (!finId) return;
    try {
      const geo = await getCoords();
      await finalizarComAssinatura(finId, tecnicoId, finObs, finAss ?? undefined, geo);
      setAgendamentos(prev => prev.map(a => a.id === finId ? { ...a, finalizacao_horario: new Date().toISOString(), status: "finalizado" } : a));
      resetFinalizacaoState();
      setFinOpen(false);
      toast({ title: "Atendimento finalizado" });
    } catch {
      toast({ title: "Erro", description: "Falha ao finalizar", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="p-6 min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (!userProfile || userProfile.role !== "tecnico") {
    return <div className="p-6 min-h-screen flex items-center justify-center text-muted-foreground">Acesso negado.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Olá, {userProfile.name || `Técnico ${userProfile.user_id}`}</h1>
        <p className="text-muted-foreground mt-1">Tenha um ótimo dia de trabalho!</p>
      </div>

      {/* ====== MEUS ENCAIXES (A e P) — SOMENTE VISUALIZAÇÃO ====== */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Encaixes</CardTitle>
          <CardDescription>Você só visualiza seus encaixes. Ações são feitas pela secretaria/gerência.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">Abertos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {encAbertos.map((e: any) => (
                <div key={`enc-a-${e.chave ?? e.id}`} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">#{`ENC-${e.chave ?? e.id}`}</div>
                      <div className="font-semibold">{e.nomeCliente ?? e.cliente}</div>
                      {e.foneCliente && <div className="text-sm text-muted-foreground">{e.foneCliente}</div>}
                    </div>
                    <Badge variant="secondary">aberto</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Abertura: {e.dataHoraAbertura ? new Date(e.dataHoraAbertura).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
              {encAbertos.length === 0 && <div className="text-sm text-muted-foreground col-span-full">Sem encaixes abertos.</div>}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Aguardando autorização</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {encPendentes.map((e: any) => (
                <div key={`enc-p-${e.chave ?? e.id}`} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">#{`ENC-${e.chave ?? e.id}`}</div>
                      <div className="font-semibold">{e.nomeCliente ?? e.cliente}</div>
                      {e.foneCliente && <div className="text-sm text-muted-foreground">{e.foneCliente}</div>}
                    </div>
                    <Badge variant="secondary">aguardando</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Abertura: {e.dataHoraAbertura ? new Date(e.dataHoraAbertura).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
              {encPendentes.length === 0 && <div className="text-sm text-muted-foreground col-span-full">Sem encaixes pendentes.</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== MEUS AGENDAMENTOS ====== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Meus Agendamentos</CardTitle>
              <CardDescription>Registre saída, chegada e finalização com assinatura</CardDescription>
            </div>
            <div className="inline-flex rounded-md shadow-sm overflow-hidden border">
              <Button type="button" variant={dia === "ontem" ? "default" : "ghost"} className="rounded-none" onClick={() => setDia("ontem")}>Ontem</Button>
              <Button type="button" variant={dia === "hoje" ? "default" : "ghost"} className="rounded-none" onClick={() => setDia("hoje")}>Hoje</Button>
              <Button type="button" variant={dia === "amanha" ? "default" : "ghost"} className="rounded-none" onClick={() => setDia("amanha")}>Amanhã</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {agendamentosFiltrados.map((ag) => {
              const podeSair = ag.status === "agendado";
              const podeChegada = ag.status === "em_deslocamento";
              const podeFinalizar = ag.status === "em_andamento";
              return (
                <div key={`${ag.id}-${ag.data}-${ag.horario}`} className="border rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">#{ag.id}</span>
                        <Badge variant={statusColor(ag.status)}>{statusLabel(ag.status)}</Badge>
                      </div>
                      <h3 className="text-lg font-medium">{ag.cliente}</h3>
                    </div>
                    <div className="sm:text-right">
                      <span className="block text-sm text-muted-foreground">{formatDataPt(ag.data)}</span>
                      <span className="text-2xl font-bold text-primary">{ag.horario}</span>
                      <p className="text-sm text-muted-foreground">{ag.tipo}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-start">
                      <MapPin className="mr-2 h-5 w-5 text-muted-foreground mt-0.5" />
                      <span>{ag.endereco}</span>
                    </div>
                    {ag.observacoes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-5 w-5 text-muted-foreground mt-0.5" />
                        <span>{ag.observacoes}</span>
                      </div>
                    )}
                  </div>

                  {(ag.saida_horario || ag.chegada_horario || ag.finalizacao_horario) && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <div className="space-y-1 text-sm">
                        {ag.saida_horario && <div className="flex items-center"><Clock className="mr-2 h-4 w-4" />Saída: {formatHora(ag.saida_horario)}</div>}
                        {ag.chegada_horario && <div className="flex items-center"><Clock className="mr-2 h-4 w-4" />Chegada: {formatHora(ag.chegada_horario)}</div>}
                        {ag.finalizacao_horario && <div className="flex items-center"><Clock className="mr-2 h-4 w-4" />Finalização: {formatHora(ag.finalizacao_horario)}</div>}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button className="w-full" onClick={() => onSaida(ag.id)} disabled={!podeSair}><Play className="mr-2 h-4 w-4" /> Saída</Button>
                    <Button className="w-full" variant="secondary" onClick={() => onChegada(ag.id)} disabled={!podeChegada}><MapPin className="mr-2 h-4 w-4" /> Chegada</Button>
                    <Button className="w-full" onClick={() => { setFinId(ag.id); setFinOpen(true); }} disabled={!podeFinalizar}><CheckCircle className="mr-2 h-4 w-4" /> Finalizar</Button>
                  </div>
                </div>
              );
            })}
            {agendamentosFiltrados.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">Nenhum agendamento nesse dia.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Finalização */}
      <Dialog open={finOpen} onOpenChange={(o) => { setFinOpen(o); if (!o) resetFinalizacaoState(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Finalizar atendimento {finId ? `#${finId}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Observações do atendimento (opcional)" value={finObs} onChange={(e) => setFinObs(e.target.value)} />
            <SignaturePad onChange={setFinAss} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setFinOpen(false); resetFinalizacaoState(); }}>Cancelar</Button>
              <Button onClick={onFinalizar} disabled={!finId}>Confirmar Finalização</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
