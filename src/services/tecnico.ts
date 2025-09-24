import { api } from "@/services/api";
import {
    atualizarAgendamento,
    finalizarAgendamento,
    listarAgendamentos
}
    from "@/services/agendamentos";

export type Coords = {
  lat: number;
  lng: number;
  accuracy?: number;
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const todayYMD = (d = new Date()) => ymd(d);
const statusFrontFromBack = (s?: string) => {
  switch (s) {
    case "AB":
    case "PE": 
      return "agendado";
    case "EM":
      return "em_deslocamento";
    case "AN":
      return "em_andamento";
    case "CO":
      return "finalizado";
    case "CA":
    case "CN":
      return "cancelado";
    default:
      return "agendado";
  }
}

function nowIsoLocal() {
    const now = new Date();
    const off = now.getTimezoneOffset() * 60000;
    return (new Date(now.getTime() - off)).toISOString().slice(0, 19);
}

export async function listarMeusAgendamentos(tecnicoId: number) {
    const d = new Date();
    const ini = ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
    const fim = ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));

    const resp = await api.get("/agendamentos/me", { params: { tecnicoId, ini, fim } });
    const data = Array.isArray(resp.data) ? resp.data : [];


    return data.map((raw: any) => {
        const dIni = raw.dataHoraInicial ?? raw.DATA_HORA_INICIAL ?? null;
        const dSaida = raw.dataHoraSaida ?? raw.DATA_HORA_SAIDA ?? null;
        const dChegada = raw.dataHoraChegada ?? raw.DATA_HORA_CHEGADA ?? null;
        const dFinal = raw.dataHoraFinal ?? raw.DATA_HORA_FINAL ?? null;
        return {
            id: String(raw.chave ?? raw.id ?? raw.CHAVE ?? ""),
            cliente: String(raw.nomeCliente ?? raw.NOME_CLIENTE ?? ""),
            endereco: raw.enderecoCliente ?? raw.ENDERECO_CLIENTE ?? "",
            tipo: raw.titulo ?? raw.TITULO ?? "Visita Técnica",
            data: dIni ? String(dIni).slice(0, 10) : todayYMD(),
            horario: dIni ? String(dIni).slice(11, 16) : "",
            statusBack: raw.statusAg ?? raw.STATUS_AG ?? "AB",
            status: statusFrontFromBack(raw.statusAg ?? raw.STATUS_AG),
            observacoes: raw.agendaRetorno ?? raw.AGENDA_RETORNO ?? "",
            saida_horario: raw.dataHoraSaida ?? raw.DATA_HORA_SAIDA ?? null,
            chegada_horario: dChegada,
            finalizacao_horario: dFinal,
        };
    });
}

export async function registrarSaida(agId: string, tecnicoId: number, coords?: Coords) {
    await api.put(`/agendamentos/${agId}/saida`,
        coords ? { lat: coords.lat, lng: coords.lng } : {},
        { params: { tecnicoId } }
    );
}

export async function registrarChegada(agId: string, tecnicoId: number, coords?: Coords) {
    await api.put(`/agendamentos/${agId}/chegada`,
        coords ? { lat: coords.lat, lng: coords.lng } : {},
        { params: { tecnicoId } }
    );
}

export async function finalizarComAssinatura(
  agId: string,
  tecnicoId: number,
  observacoes?: string,
  assinaturaBase64?: string,
  coords?: Coords
) {
  // 1) grava status/horário + localização FINAL no backend
  const locBody: any = {};
  if (coords) {
    locBody.lat = coords.lat;
    locBody.lng = coords.lng;
    if (coords.accuracy != null) locBody.precisao = coords.accuracy;
  }
  await api.put(`/agendamentos/${agId}/finalizar`, locBody, {
    params: { tecnicoId },
  });

  // 2) (opcional) atualiza retorno/assinatura no registro
  const patch: any = {};
  if (observacoes) patch.agendaRetorno = observacoes;
  if (assinaturaBase64) patch.assinaturaCliente = assinaturaBase64;

  if (Object.keys(patch).length) {
    await atualizarAgendamento(Number(agId), patch);
  }
}

export async function listarEncaixesDisponiveis() {
    // usa o mesmo endpoint já usado na tela de secretarias
    const r = await api.get("/encaixes", { params: { status: "A" } });

    const arr = Array.isArray(r.data) ? r.data : [];

    // normaliza campos para o TecnicoView
    return arr.map((x: any) => ({
        id: x.id ?? x.chave ?? x.CHAVE,
        cliente: x.cliente ?? x.nomeCliente ?? x.NOME_CLIENTE ?? "",
        endereco: x.endereco ?? x.enderecoCliente ?? x.ENDERECO_CLIENTE ?? "",
        urgencia: x.urgencia ?? x.URGENCIA ?? x.prioridade ?? "Normal",
        tipo: x.tipo ?? x.TIPO ?? x.titulo ?? "Encaixe",
        observacoes: x.observacoes ?? x.OBS ?? x.agendaRetorno ?? x.AGENDA_RETORNO ?? "",
    }));
}

export async function solicitarEncaixe(encaixeId: number, tecnicoId: number) {
    const r = await api.post(`/encaixes/${encaixeId}/solicitar`, { tecnicoId });
    return r.data;
}

export async function listarMeusEncaixesPendentes(tecnicoId: number) {
  if (!tecnicoId) return [];

  // normaliza urgência para 'A' | 'M' | 'B'
  const toSiglaUrg = (u: any): "A" | "M" | "B" | null => {
    if (u == null) return null;
    const s = String(u).trim().toUpperCase();
    if (s === "3" || s === "ALTA" || s === "A" || s === "HIGH" || s === "H") return "A";
    if (s === "2" || s === "MEDIA" || s === "MÉDIA" || s === "M" || s === "MEDIUM") return "M";
    if (s === "1" || s === "BAIXA" || s === "B" || s === "LOW" || s === "L") return "B";
    return null;
  };

  // tenta com filtro no servidor; se falhar, busca geral e filtra aqui
  let data: any[] = [];
  try {
    const r = await api.get("/encaixes/aguardando", { params: { tecnicoId } });
    data = Array.isArray(r.data) ? r.data : [];
  } catch {
    try {
      const r2 = await api.get("/encaixes/aguardando");
      data = Array.isArray(r2.data) ? r2.data : [];
    } catch {
      data = [];
    }
  }

  // função para extrair o id do responsável/técnico do item
  const getRespId = (x: any): number | null => {
    const v =
      x.codigoResponsavel ?? x.responsavelId ?? x.responsavel ?? x.tecnicoId ??
      x.CODIGO_RESPONSAVEL ?? x.RESPONSAVEL_ID ?? x.TECNICO_ID;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // se o backend não filtrou, filtra aqui quando o campo existir
  const filtered = data.filter((x) => {
    const rid = getRespId(x);
    return rid == null ? true : Number(rid) === Number(tecnicoId);
  });

  // normaliza para o formato usado no painel do técnico
  return filtered.map((x: any) => ({
    chave: Number(x.chave ?? x.id ?? x.CHAVE),
    nomeCliente: String(x.nomeCliente ?? x.cliente ?? x.NOME_CLIENTE ?? ""),
    foneCliente: x.foneCliente ?? x.telefone ?? x.TELEFONE ?? x.FONE ?? null,
    dataHoraAbertura:
      x.dataHoraAbertura ?? x.abertura ?? x.DATA_HORA_ABERTURA ?? x.DATA_ABERTURA ?? null,
    tipoUrgencia: toSiglaUrg(x.tipoUrgencia ?? x.urgencia ?? x.URGENCIA ?? x.prioridade ?? x.PRIORIDADE),
    // mantém também o código do responsável para debug/uso futuro
    codigoResponsavel: getRespId(x) ?? tecnicoId,
  }));
}