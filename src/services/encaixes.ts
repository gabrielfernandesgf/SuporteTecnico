import { api } from "./api";

export type StatusEncaixe = "A" | "E" | "C" | "P";
export type TipoSolic = "T" | "C" | "V" | "M" | "I" | "S";
export type Urgencia = "B" | "M" | "A";
export type FiltroEncaixe = { status?: StatusEncaixe };

export interface EncaixeListItem {
  chave: number;
  codigoCliente: number | null;
  nomeCliente: string | null;
  foneCliente?: string | null;
  codigoResponsavel?: number | null;
  tipoSolicitacao?: TipoSolic | null;
  tipoUrgencia?: Urgencia | null;
  status: StatusEncaixe;
  dataHoraAbertura?: string | null;
  observacao?: string | null;
}

export interface EncaixePost {
  nomeCliente: string;
  codigoCliente: number;
  codigoResponsavel?: number;
  tipoSolicitacao: TipoSolic;
  tipoUrgencia?: Urgencia;
  observacao?: string;
  foneCliente?: string;
  status?: StatusEncaixe;
}

/** ---- helpers de normalização ---- */
const toNum = (v: any) =>
  v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

function mapItem(x: any): EncaixeListItem {
  return {
    chave: Number(pick(x, "chave", "CHAVE", "id", "ID")),
    codigoCliente: toNum(
      pick(x, "codigoCliente", "CODIGO_CLIENTE", "codCliente", "clienteCodigo", "COD_CLIENTE")
    ),
    nomeCliente: (pick(x, "nomeCliente", "NOME_CLIENTE", "cliente", "CLIENTE") ?? null) as string | null,
    foneCliente: (pick(x, "foneCliente", "FONE", "telefone") ?? null) as string | null,
    codigoResponsavel: toNum(
      pick(x, "codigoResponsavel", "CODIGO_RESPONSAVEL", "responsavelCodigo", "tecnico", "TECNICO")
    ),
    tipoSolicitacao: (pick(x, "tipoSolicitacao", "TIPO_SOLICITACAO", "tipo", "TIPO") ??
      null) as TipoSolic | null,
    tipoUrgencia: (pick(x, "tipoUrgencia", "TIPO_URGENCIA", "urgencia", "URGENCIA") ??
      "M") as Urgencia | null,
    status: (pick(x, "status", "STATUS") ?? "A") as StatusEncaixe,
    dataHoraAbertura:
      (pick(x, "dataHoraAbertura", "DATA_HORA_ABERTURA", "dataAbertura", "DATA_ABERTURA") as
        | string
        | undefined) ?? null,
    observacao: (pick(x, "observacao", "OBSERVACAO", "descricao") ?? null) as string | null,
  };
}

function mapArray(raw: any): EncaixeListItem[] {
  const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
  return arr.map(mapItem);
}

// ---- CRUD / ações ----
export async function criarEncaixe(payload: EncaixePost) {
  const { data } = await api.post("/encaixes", payload);
  return data;
}

export async function atualizarEncaixe(chave: number, body: Partial<EncaixePost>) {
  const { data } = await api.put(`/encaixes/${chave}`, body);
  return data;
}

export async function removerEncaixe(chave: number) {
  await api.delete(`/encaixes/${chave}`);
}

export async function listarEncaixes(f?: FiltroEncaixe): Promise<EncaixeListItem[]> {
  const params = f?.status ? { status: f.status } : {};
  const { data } = await api.get("/encaixes", { params });
  return mapArray(data);
}

export async function listarEncaixesDisponiveis(): Promise<EncaixeListItem[]> {
  try {
    const { data } = await api.get("/encaixes/disponiveis");
    return mapArray(data);
  } catch {
    return listarEncaixes({ status: "A" });
  }
}

export async function listarEncaixesAguardando(): Promise<EncaixeListItem[]> {
  try {
    const { data } = await api.get("/encaixes/aguardando");
    return mapArray(data);
  } catch {
    return listarEncaixes({ status: "P" });
  }
}

export async function listarEncaixesDoTecnico(tecnicoId: number, status: StatusEncaixe = "A") {
  const { data } = await api.get(`/encaixes/meus?tecnicoId=${encodeURIComponent(tecnicoId)}&status=${status}`);
  return data;
}

export async function aceitarEncaixe(chave: number, tecnicoId: number) {
  return atribuirTecnicoEncaixe(chave, tecnicoId);
}
export async function solicitarEncaixe(chave: number, tecnicoId: number) {
  try {
    await api.post(`/encaixes/${chave}/solicitar`, { tecnicoId });
  } catch {
    await api.post(`/encaixes/${chave}/solicitar`, null, { params: { tecnicoId } });
  }
}

export async function atribuirTecnicoEncaixe(chave: number, tecnicoId: number) {
  try {
    const { data } = await api.put(`/encaixes/${chave}/atribuir`, { tecnicoId });
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const { data } = await api.post(`/encaixes/${chave}/aceitar`, { tecnicoId });
      return data;
    }
    throw err;
  }
}

export async function converterEncaixe(chave: number, agendamentoId?: number) {
  const path = agendamentoId
    ? `/encaixes/${chave}/converter?agendamentoId=${agendamentoId}`
    : `/encaixes/${chave}/converter`;
  const { data } = await api.post(path);
  return data;
}
