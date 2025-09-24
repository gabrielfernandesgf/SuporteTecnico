import { listarAgendamentos as listarAPI } from "@/services/agendamentos";
import { listarTecnicos as listarTecnicosAPI } from "@/services/usuarios";
import { AgendamentoFormatado } from "@/types/AgendamentoFormatado";

type StatusFront = "agendado" | "em_andamento" | "finalizado" | "cancelado" | "em_deslocamento" | "success";

function mapStatus(statusAg?: string): StatusFront {
  switch ((statusAg ?? "").toUpperCase()) {
    case "AB":
    case "PE": return "agendado";
    case "EM":
    case "ED": return "em_deslocamento";
    case "AN":
    case "EX": return "em_andamento";
    case "FI":
    case "CO": return "finalizado";
    case "CA":
    case "CN": return "cancelado";
    default: return "agendado";
  }
}

const norm = (v: any) => {
  const s = String(v ?? "").trim();
  const only = s.replace(/\D+/g, "");
  return only.replace(/^0+/, "") || only || s;
};

function toAgendamentoFormatado(a: any): AgendamentoFormatado {
  const hora = (a?.dataHoraInicial ?? "").split("T")[1]?.slice(0, 5) ?? "";
  return {
    id: String(a?.chave),
    cliente: a?.nomeCliente ?? "Cliente",
    endereco: a?.enderecoCliente ?? "",
    data: a?.dataAgendamento ?? "",
    horario: hora,
    tipo: a?.titulo ?? "Visita Técnica",
    tecnico:
      a?.tecnicoNome ??
      (a?.codigoResponsavel != null ? `Técnico ${a.codigoResponsavel}` : "Técnico não informado"),
    status: mapStatus(a?.statusAg),
    observacoes: a?.agendaAbertura ?? "",
  };
}

export async function fetchAgendamentos(ini?: string, fim?: string): Promise<AgendamentoFormatado[]> {
  const resp = await listarAPI(ini, fim);
  if (!resp.success) {
    console.error(resp.error);
    return [];
  }
  return (resp.data ?? []).map((row: any) => toAgendamentoFormatado(row));
}

export async function fetchTecnicosEmCampo(ini?: string, fim?: string) {
  const [tecnicos, ags] = await Promise.all([listarTecnicosAPI(), fetchAgendamentos(ini, fim)]);

  const ativos = new Set<string>();
  for (const a of ags) {
    if (a.status === "em_andamento") {
      const idTec = norm(a.tecnico.match(/\d+/)?.[0] ?? "");
      if (idTec) ativos.add(idTec);
    }
  }

  return (tecnicos ?? [])
    .map((t: any) => ({
      id: norm(t?.codigo ?? t?.id ?? t?.login ?? t?.CODIGO ?? t?.ID ?? t?.LOGIN ?? ""),
      nome: String(t?.nome ?? t?.NOME ?? "").trim(),
    }))
    .filter((t: any) => t.id && ativos.has(t.id))
    .map((t: any) => ({
      ...t,
      status: "em_andamento" as StatusFront,
      agendamentosHoje: ags.filter((a) => norm(a.tecnico.match(/\d+/)?.[0] ?? "") === t.id).length,
      proximoCliente:
        ags.find((a) => norm(a.tecnico.match(/\d+/)?.[0] ?? "") === t.id)?.cliente ?? "",
      localizacao: "Em rota",
    }));
}
