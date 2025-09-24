"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarAgendamentos as listarAPI,
  atualizarStatus,
  obterDetalhesAgendamento,
} from "@/services/agendamentos";
import { listarTecnicos } from "@/services/usuarios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Search,
  Plus,
  Pencil,
  Check,
  XCircle,
  Clock,
  User2,
  UserSquare2,
  Car,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/** ---------------- tipos ---------------- */
type Agendamento = {
  chave: number;
  codigoCliente: number | null;        
  nomeCliente: string | null;          
  enderecoCliente?: string | null;     
  titulo?: string | null;              
  codigoResponsavel: number;           
  statusAg: string | null;            
  dataHoraInicial: string | null;      
  dataHoraFinal?: string | null;       
  agendaAbertura?: string | null;     
  agendaRetorno?: string | null;       
  secretariaUsuarioId?: number | null;
  secretariaNome?: string | null;      
  contatoSolicitante?: string | null;  
  carro?: string | null;               
};

type TecnicoRow = { id: string; nome: string; color: string };

/** ---------------- configuração de horários ---------------- */
const SLOTS = [
  { id: 1, ini: "08:00", fim: "10:00", rotulo: "1º horário" },
  { id: 2, ini: "10:00", fim: "12:00", rotulo: "2º horário" },
  { id: 3, ini: "13:00", fim: "15:00", rotulo: "3º horário" },
  { id: 4, ini: "15:00", fim: "17:00", rotulo: "4º horário" },
] as const;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const firstName = (full?: string | null) =>
  (full ?? "").trim().split(/\s+/)[0] ?? "";

function getSlotId(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [hh, mm] = iso.slice(11, 16).split(":").map(Number);
  const total = hh * 60 + mm;
  for (const s of SLOTS) {
    const [h1, m1] = s.ini.split(":").map(Number);
    const [h2, m2] = s.fim.split(":").map(Number);
    const t1 = h1 * 60 + m1, t2 = h2 * 60 + m2;
    if (total >= t1 && total < t2) return s.id;
  }
  return null;
}

const STATUS_LABEL: Record<string, string> = {
  AB: "Aberto",
  AM: "Andamento",
  PE: "Pendente",
  CO: "Concluído",
  EM: "Em Análise",
  CA: "Cancelado",
};
const STATUS_BADGE: Record<string, string> = {
  AB: "bg-blue-500 text-white",
  PE: "bg-yellow-500 text-white",
  EX: "bg-indigo-500 text-white",
  CO: "bg-green-600 text-white",
  FI: "bg-green-600 text-white",
  CA: "bg-red-500 text-white",
};

/** ---------------- componente ---------------- */
export default function AgendaTabela() {
  const navigate = useNavigate();

  const [data, setData] = useState<string>(ymd(new Date())); // dia atual
  const [tecnicos, setTecnicos] = useState<TecnicoRow[]>([]);
  const [tecFiltro, setTecFiltro] = useState<string | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(false);

  // modal detalhes
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [detalheLoading, setDetalheLoading] = useState(false);
  const [detalhe, setDetalhe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const tec = await listarTecnicos();
      const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-yellow-500"];
      const list = tec.map((t: any, i: number) => ({
        id: String(t.user_id ?? t.id ?? t.codigo ?? t.login ?? ""),
        nome: String(t.nome ?? t.name ?? ""),
        color: colors[i % colors.length],
      }));
      setTecnicos(list);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try {
        const r = await listarAPI(data, data);
        const lista: Agendamento[] = (r?.success ? r.data : r) ?? [];
        setItens(lista.filter((a) => a?.dataHoraInicial));
      } finally {
        setCarregando(false);
      }
    })();
  }, [data]);

  const porTecnicoSlot = useMemo(() => {
    const map = new Map<string, Map<number, Agendamento>>();
    const termo = busca.toLowerCase();

    itens
      .filter(a => tecFiltro === "todos" ? true : String(a.codigoResponsavel) === tecFiltro)
      .filter(a =>
        (a.nomeCliente ?? "").toLowerCase().includes(termo) ||
        (a.titulo ?? "").toLowerCase().includes(termo) ||
        (a.contatoSolicitante ?? "").toLowerCase().includes(termo) ||
        (a.enderecoCliente ?? "").toLowerCase().includes(termo)
      )
      .forEach(a => {
        const tecId = String(a.codigoResponsavel);
        const slot = getSlotId(a.dataHoraInicial) ?? 0;
        if (!map.has(tecId)) map.set(tecId, new Map());
        map.get(tecId)!.set(slot, a);
      });

    return map;
  }, [itens, tecFiltro, busca]);

  function onAdicionar(tecId: string, slotId: number) {
    const s = SLOTS.find(s => s.id === slotId)!;
    const horaIni = s.ini + ":00";
    const horaFim = s.fim + ":00";
    navigate(`/agendamentos/novo?tec=${encodeURIComponent(tecId)}&data=${data}&horaIni=${horaIni}&horaFim=${horaFim}`);
  }

  async function abrirDetalhes(id: number) {
    setDetalheOpen(true);
    setDetalheLoading(true);
    try {
      const full = await obterDetalhesAgendamento(id);
      setDetalhe(full);
    } finally {
      setDetalheLoading(false);
    }
  }

  // ações dentro do diálogo
  async function concluir(id: number) {
    await atualizarStatus(id, "CO");
    setItens(prev => prev.map(a => a.chave === id ? { ...a, statusAg: "CO" } : a));
    setDetalhe((d: any) => d ? { ...d, status: "CO" } : d);
  }
  async function cancelar(id: number) {
    await atualizarStatus(id, "CA");
    setItens(prev => prev.map(a => a.chave === id ? { ...a, statusAg: "CA" } : a));
    setDetalhe((d: any) => d ? { ...d, status: "CA" } : d);
  }
  function remarcar(id: number) {
    navigate(`/agendamentos/novo?edit=${id}`);
  }
  function editar(id: number) {
    navigate(`/agendamentos/novo?edit=${id}`);
  }

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Topbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-slate-900 text-xl font-semibold flex-1">Agenda dos Tecnicos</h1>

          <input
            type="date"
            className="rounded-md bg-white text-slate-900 px-3 py-2 border border-slate-300"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <select
            className="rounded-md bg-white text-slate-900 px-3 py-2 border border-slate-300"
            value={tecFiltro}
            onChange={(e) => setTecFiltro(e.target.value as any)}
            title="Filtrar Técnico"
          >
            <option value="todos">Todos técnicos</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="rounded-md bg-white text-slate-900 pl-10 pr-3 py-2 border border-slate-300 placeholder:text-slate-400"
              placeholder="Buscar (cliente / solicitação / contato / local)…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabela (sem scroll lateral) */}
      <div className="max-w-[1400px] mx-auto p-4">
        {carregando ? (
          <div className="text-slate-600 py-16 text-center">Carregando…</div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-hidden">
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-slate-50 text-slate-700">
                <tr className="text-left text-sm">
                  <th className="px-3 py-2 w-[14%] border-l first:border-l-0 border-slate-200">Técnico</th>
                  <th className="px-3 py-2 w-[10%] border-l border-slate-200">Horário</th>
                  <th className="px-3 py-2 w-[7%]  border-l border-slate-200">Código</th>
                  <th className="px-3 py-2 w-[14%] border-l border-slate-200">Razão Social</th>
                  <th className="px-3 py-2 w-[20%] border-l border-slate-200">Local</th>
                  <th className="px-3 py-2 w-[11%] border-l border-slate-200">Solicitação</th>
                  <th className="px-3 py-2 w-[10%] border-l border-slate-200">Responsável</th>
                  <th className="px-3 py-2 w-[8%]  border-l border-slate-200">Secretária</th>
                  <th className="px-3 py-2 w-[6%]  border-l border-slate-200">Carro</th>
                  <th className="px-3 py-2 w-[7%]  border-l border-slate-200">Confirmado</th>
                  <th className="px-3 py-2 w-[6%]  border-l border-slate-200 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="text-slate-900 text-sm">
                {tecnicos
                  .filter(t => tecFiltro === "todos" ? true : t.id === tecFiltro)
                  .map((tec) => (
                    <FragmentByTec
                      key={tec.id}
                      tec={tec}
                      mapSlots={porTecnicoSlot.get(tec.id) ?? new Map()}
                      onAdicionar={onAdicionar}
                      onAbrirDetalhes={abrirDetalhes}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {detalheOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDetalheOpen(false)}
        >
          <Card className="w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            {detalheLoading ? (
              <div className="text-slate-600">Carregando detalhes…</div>
            ) : detalhe ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  {detalhe.cliente}
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 rounded px-2 py-0.5">
                    AG #{detalhe.id ?? detalhe.chave}
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><b>Endereço:</b> <span className="whitespace-pre-wrap">{detalhe.enderecoCliente || "—"}</span></div>
                  <div className="flex items-center gap-2"><UserSquare2 className="h-4 w-4" /><b>Técnico:</b> {detalhe.tecnicoNome || "—"}</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><b>Data/Hora:</b> {detalhe.dataHoraInicial || "—"}</div>
                  <div><b>Status:</b> {STATUS_LABEL[detalhe.status] ?? detalhe.status ?? "—"}</div>
                  <div><b>Agenda Abertura:</b> {detalhe.agendaAbertura || "—"}</div>
                  <div><b>Retorno:</b> {detalhe.agendaRetorno || "—"}</div>
                  <div><b>Solicitação:</b> {detalhe.titulo || "—"}</div>
                  <div className="flex items-center gap-2"><User2 className="h-4 w-4" /><b>Responsável:</b> {detalhe.contatoSolicitante || "—"}</div>
                  <div><b>Secretária:</b> {detalhe.secretariaNome || "—"}</div>
                  <div className="flex items-center gap-2"><Car className="h-4 w-4" /><b>Carro:</b> {detalhe.carro || "—"}</div>
                  <div><b>Confirmado:</b> {(detalhe.status && ["EX", "CO", "FI"].includes(detalhe.status)) ? "Sim" : "Não"}</div>
                  <div><b>Código do cliente:</b> {detalhe.codigoCliente ?? "—"}</div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="secondary" className="bg-slate-100 hover:bg-slate-200" onClick={() => remarcar(detalhe.id)}>
                    <Pencil className="h-4 w-4 mr-1" /> Remarcar
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => concluir(detalhe.id)}>
                    <Check className="h-4 w-4 mr-1" /> Concluir
                  </Button>
                  <Button variant="destructive" onClick={() => cancelar(detalhe.id)}>
                    <XCircle className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                  <Button variant="default" onClick={() => editar(detalhe.id)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="secondary" onClick={() => setDetalheOpen(false)}>Fechar</Button>
                </div>
              </div>
            ) : (
              <div className="text-slate-600">Não foi possível carregar os dados.</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/** ---- subcomponente: bloco por técnico (4 linhas de horários) ---- */
function FragmentByTec({
  tec, mapSlots, onAdicionar, onAbrirDetalhes,
}: {
  tec: TecnicoRow;
  mapSlots: Map<number, Agendamento>;
  onAdicionar: (tecId: string, slotId: number) => void;
  onAbrirDetalhes: (id: number) => void;
}) {
  return (
    <>
      {SLOTS.map((slot, idx) => {
        const a = mapSlots.get(slot.id);
        const primeira = idx === 0;
        const clicavel = Boolean(a);

        return (
          <tr
            key={slot.id}
            className={`border-t border-slate-200 ${clicavel ? "hover:bg-slate-50 cursor-pointer" : ""}`}
            onClick={() => a && onAbrirDetalhes(a.chave)}
          >
            {/* Técnico (primeiro nome) */}
            <td className="px-3 py-3 align-top border-l first:border-l-0 border-slate-200">
              {primeira && (
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-sm ${tec.color}`} />
                  <span className="font-medium">{firstName(tec.nome)}</span>
                </div>
              )}
            </td>

            {/* Horário */}
            <td className="px-3 py-3 align-top border-l border-slate-200">
              {slot.rotulo}
              <div className="text-xs text-slate-500">{slot.ini}–{slot.fim}</div>
            </td>

            {/* Código (cliente) */}
            <td className="px-3 py-3 align-top border-l border-slate-200">{a?.codigoCliente ?? "—"}</td>

            {/* Razão Social */}
            <td className="px-3 py-3 align-top border-l border-slate-200">
              <span className="block max-w-[230px] whitespace-nowrap overflow-hidden text-ellipsis">
                {a?.nomeCliente ?? "—"}
              </span>
            </td>

            {/* Local — truncado com … */}
            <td className="px-3 py-3 align-top border-l border-slate-200">
              <span className="block max-w-[320px] whitespace-nowrap overflow-hidden text-ellipsis">
                {a?.enderecoCliente ?? <Vago />}
              </span>
            </td>

            {/* Solicitação */}
            <td className="px-3 py-3 align-top border-l border-slate-200">
              <span className="block max-w-[210px] whitespace-nowrap overflow-hidden text-ellipsis">
                {a?.titulo ?? "—"}
              </span>
            </td>

            {/* Responsável */}
            <td className="px-3 py-3 align-top border-l border-slate-200">
              <span className="block max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
                {a?.contatoSolicitante ?? "—"}
              </span>
            </td>

            {/* Secretária */}
            <td className="px-3 py-3 align-top border-l border-slate-200">{a?.secretariaNome ?? "—"}</td>

            {/* Carro */}
            <td className="px-3 py-3 align-top border-l border-slate-200">{a?.carro ?? "—"}</td>

            {/* Confirmado / Status (badge) */}
            <td className="px-3 py-3 align-top border-l border-slate-200">
              {a ? (
                <span className={`inline-block px-2 py-1 rounded text-xs ${STATUS_BADGE[a.statusAg ?? "AB"] || "bg-slate-500 text-white"}`}>
                  {STATUS_LABEL[a.statusAg ?? "AB"] ?? a.statusAg}
                </span>
              ) : "—"}
            </td>

            {/* Ações: só “+” quando vago */}
            <td className="px-3 py-3 align-top border-l border-slate-200 text-right">
              {!a ? (
                <Button
                  size="icon"
                  className="h-8 w-8 bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => { e.stopPropagation(); onAdicionar(tec.id, slot.id); }}
                  aria-label="Adicionar agendamento"
                  title="Adicionar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              ) : null}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function Vago() {
  return <span className="text-slate-400 italic">Vago</span>;
}
