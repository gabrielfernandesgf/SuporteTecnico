export interface AgendamentoFormatado {
  id: string;
  cliente: string;
  endereco: string;
  tipo: string;
  tecnico: string;
  observacoes: string;
  status: string;
  data: string;
  horario: string;
  titulo?: string;
  agendaAbertura?: string;
}