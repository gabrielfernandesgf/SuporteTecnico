export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Resposta de API com data opcional (evita erro em deleções etc.)
export type ApiResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

/* --------------------- ENCAIXE (mantido) --------------------- */
export interface Encaixe {
  CHAVE: number
  CHAVE_AGENDAMENTO: number | null
  CODIGO_CLIENTE: number | null
  NOME_CLIENTE: string | null
  FONE_CLIENTE: string | null
  CODIGO_RESPONSAVEL: number | null
  TIPO_SOLICITACAO: string | null
  TIPO_URGENCIA: string | null
  OBSERVACAO: string | null
  STATUS: string | null
  USUARIO_ABERTURA: number | null
  USUARIO_EXCLUSAO: number | null
  DATA_HORA_ABERTURA: string | null
  DATA_HORA_FINAL: string | null
  DATA_HORA_EXCLUSAO: string | null
}
/* ------------------------------------------------------------- */

export interface Usuario {
  user_id: string
  name: string
  role: string
}

export interface LoginRequest { usuario: string; senha: string }
export interface LoginResponse { user_id: string; name: string; role: string }

export interface Agendamento {
  chave: number
  codigoCliente: number
  nomeCliente?: string | null
  foneCliente?: string | null
  enderecoCliente?: string | null
  titulo?: string | null
  codigoResponsavel: number
  statusAg?: string | null
  agendaAbertura?: string | null
  agendaRetorno?: string | null

  tecnicoCodigo?: number | null
  tecnicoNome?: string | null

  inativo?: "S" | "N" | null
  codigoGrupo: number
  numPedido?: number | null
  codLoja?: number | null
  
  numOrdemServico?: number | null
  prioridade?: string | null
  dataHoraAbertura?: string | null
  dataHoraInicial?: string | null
  dataHoraFinal?: string | null
  dataHoraIntDias?: number | null
  dataHoraIntHoras?: number | null
  dataHoraIntMinutos?: number | null
  diasAtrasoCtaRec?: number | null
  diasAtrasoMensalid?: number | null
  codChecklist?: number | null

  secretariaUsuarioId?: number | null
  secretariaNome?: string | null
  contatoSolicitante?: string | null
  carro?: string | null
}

export interface NovoAgendamentoRequest {
  codigoCliente: number
  nomeCliente?: string
  foneCliente?: string
  codigoResponsavel: number
  codigoGrupo: number
  statusAg: "AB" | "NA" | "CO" | "PE" | "EM"
  agendaAbertura?: string
  agendaRetorno?: string
  titulo: string
  dataHoraAbertura: string   // "YYYY-MM-DDTHH:mm:ss" (local, sem Z)
  dataHoraInicial: string    // idem
  dataHoraFinal?: string     // opcional (técnico encerra depois)
  inativo: "S" | "N"
  codLoja: number
  prioridade?: string
  diasAtrasoCtaRec?: number
  diasAtrasoMensalid?: number
  codChecklist?: number
  intervaloDias?: number
  intervaloHoras?: number
  intervaloMinutos?: number
}

export const API_ENDPOINTS = {
  LOGIN: 'http://localhost:8081/api/auth',
  AGENDAMENTOS: 'http://localhost:8081/api/agendamentos',
  ENCAIXES: 'http://localhost:8081/api/encaixes',
  USUARIOS: 'http://localhost:8081/api/usuarios',
  FUNCIONARIOS: 'http://localhost:8081/api/funcionarios'
} as const
