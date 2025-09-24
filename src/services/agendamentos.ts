import { Agendamento, ApiResponse, NovoAgendamentoRequest } from "@/types/types";
import { api } from "./api";

type ApiEnvelope<T = any> = { data?: T; res_data?: T } | T;


function unwrap<T = any>(resp: any): T {
  const raw = resp?.data;
  return (raw?.res_data ?? raw?.data ?? raw) as T;
}

class AgendamentoService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async getFirst(paths: string[]) {
    let lastError: any;
    for (const p of paths) {
      try {
        const r = await api.get(p);
        return unwrap(r);
      } catch (e: any) {
        if (e?.response?.status === 404) {
          lastError = e;
          continue;
        }
        throw e;
      }
    }
    throw lastError ?? new Error("Detalhes não encontrados");
  }

  async atualizarStatus(chave: number, status: string) {
    const body = { statusAg: status, STATUS_AG: status };
    const resp = await api.put(`/agendamentos/${chave}`, body);
    return unwrap(resp);
  }

  /** DETALHES (rota correta: /agendamentos/detalhes/:id) */
  async obterDetalhesAgendamento(id: number) {
    const resp = await api.get(`/agendamentos/detalhes/${id}`);
    const payload = (resp?.data ?? resp?.data ?? resp) as any;

    return {
      id: Number(payload.id ?? id),
      cliente: String(payload.cliente ?? ""),
      codigoCliente: payload.codigoCliente ?? null,
      enderecoCliente: payload.enderecoCliente ?? null,
      tecnicoCodigo: payload.tecnicoCodigo ?? null,
      tecnicoNome: payload.tecnicoNome ?? null,
      dataHoraAbertura: payload.dataHoraAbertura ?? null,
      dataHoraInicial: payload.dataHoraInicial ?? null,
      status: String(payload.status ?? "AB"),
      agenda_retorno: payload.agendaRetorno ?? null,
      titulo: payload.titulo ?? null,
      agendaAbertura: payload.agendaAbertura ?? payload.AGENDA_ABERTURA ?? null,
      tipo: payload.titulo ?? payload.tipo ?? payload.tipoServico ?? null,
      contatoSolicitante: payload.contatoSolicitante ?? null,
      secretariaNome: payload.secretariaNome ?? null,
      carro: payload.carro ?? null
    };
  }


  async listarAgendamentos(dataInicio?: string, dataFim?: string): Promise<ApiResponse<Agendamento[]>> {
    try {
      const params: any = {};
      if (dataInicio) params.ini = dataInicio;
      if (dataFim) params.fim = dataFim;

      const response = await api.get('/agendamentos', { params });
      const data: Agendamento[] = unwrap(response);

      return { success: true, data };

    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Erro ao buscar agendamentos' 
      };
    }
  }

  async listarLocalizacoesAgendamento(id: number) {
    const resp = await api.get(`/agendamentos/${id}/locs`);
    const arr = Array.isArray(resp.data) ? resp.data : [];

    return arr.map((x: any) => ({
      id: Number(x.id),
      tipo: String(x.tipo ?? "").toUpperCase(),
      dataHora: x.dataHora,
      lat: Number(x.lat),
      lng: Number(x.lng),
      precisao: x.precisao != null ? Number(x.precisao) : null,
      origem: x.origem ?? null,
    }));
  }

  async criarAgendamento(
    agendamento:NovoAgendamentoRequest | Record<string, unknown>
  ): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`/agendamentos`, agendamento);
      return { success: true, data: response.data };
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Erro ao criar agendamento";
      return { success: false, error: msg };
    }
  }


  async atualizarAgendamento(
    chave: number, 
    agendamento: Partial<Agendamento> | Record<string, unknown>
  ): Promise<ApiResponse<any>> {
    try {
      const response = await api.put(`/agendamentos/${chave}`, agendamento);
      return { success: true, data: response.data };
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Erro ao atualizar agendamento";
      return { success: false, error: msg };
    }
  }

  async excluirAgendamento(chave: number): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete(`/agendamentos/${chave}`);

      if (response.status < 200 || response.status >= 300) throw new Error(`Erro HTTP: ${response.status}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao excluir agendamento" };
    }
  }

  async proximoNumero(): Promise<ApiResponse<number>> {
    try {
      const response = await api.get(`/agendamentos/proximo-numero`);
      
      if (response.status < 200 || response.status >= 300) throw new Error(`Erro HTTP: ${response.status}`);
      const data: number = Number(response.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erro ao buscar próximo número" };
    }
  }

  /** Remarcar: define nova data/hora e salva observação no Retorno */
  async remarcarAgendamento(id: number, novaDataHoraISO: string, retorno?: string) {
    const body: Record<string, any> = {
      dataHoraInicial: novaDataHoraISO,
      DATA_HORA_INICIAL: novaDataHoraISO,
    };
    if (typeof retorno === "string" && retorno.trim()) {
      // enviamos todas as variações que o backend pode aceitar
      body.agendaRetorno = retorno;
      body.AGENDA_RETORNO = retorno;
      body.retorno = retorno;
      body.RETORNO = retorno;
    }

    const resp = await api.put(`/agendamentos/${id}`, body);
    return unwrap(resp);
  }

  /** Concluir: status CO + motivo no Retorno */
  async finalizarAgendamento(id: number, motivo?: string) {
    const agoraISO = new Date().toISOString().slice(0, 19);
    const body: Record<string, any> = {
      statusAg: "CO",
      STATUS_AG: "CO",
      dataHoraFinal: agoraISO,
      DATA_HORA_FINAL: agoraISO,
    };
    if (typeof motivo === "string") {
      body.agendaRetorno = motivo;
      body.AGENDA_RETORNO = motivo;
      body.retorno = motivo;
      body.RETORNO = motivo;
    }

    const resp = await api.put(`/agendamentos/${id}`, body);
    return unwrap(resp);
  }
}

export const agendamentoService = new AgendamentoService();
export const criarAgendamento = agendamentoService.criarAgendamento.bind(agendamentoService);
export const proximoNumeroAgendamento = agendamentoService.proximoNumero.bind(agendamentoService);
export const listarAgendamentos = agendamentoService.listarAgendamentos.bind(agendamentoService);
export const atualizarAgendamento = agendamentoService.atualizarAgendamento.bind(agendamentoService);
export const excluirAgendamento = agendamentoService.excluirAgendamento.bind(agendamentoService);
export const obterDetalhesAgendamento = agendamentoService.obterDetalhesAgendamento.bind(agendamentoService);
export const remarcarAgendamento = agendamentoService.remarcarAgendamento.bind(agendamentoService);
export const finalizarAgendamento = agendamentoService.finalizarAgendamento.bind(agendamentoService);
export const atualizarStatus = agendamentoService.atualizarStatus.bind(agendamentoService);
export const listarLocalizacoesAgendamento = agendamentoService.listarLocalizacoesAgendamento.bind(agendamentoService);