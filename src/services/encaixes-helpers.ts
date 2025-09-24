import { criarAgendamento } from "@/services/agendamentos";
import { atualizarEncaixe } from "@/services/encaixes";

export async function confirmarEncaixeEAgendar(chaveEncaixe: number, encaixe: {
  codigoCliente: number;
  nomeCliente: string;
  codigoResponsavel: number;    // aqui já deve ter técnico aceito
  titulo?: string;              // pode mapear do tipoSolicitacao
  agendaAbertura?: string;      // observação
  data: string;                 // YYYY-MM-DD
  horaIni: string;              // HH:mm:ss
  horaFim: string;              // HH:mm:ss
}) {
  const payloadAg = {
    codigoCliente: encaixe.codigoCliente,
    nomeCliente: encaixe.nomeCliente,
    codigoResponsavel: encaixe.codigoResponsavel,
    codigoGrupo: 52,
    statusAg: "AB",
    titulo: encaixe.titulo ?? "ENCAIXE",
    agendaAbertura: encaixe.agendaAbertura ?? "",
    dataHoraInicial: `${encaixe.data}T${encaixe.horaIni}`,
    dataHoraFinal: `${encaixe.data}T${encaixe.horaFim}`,
  };
  const r = await criarAgendamento(payloadAg);
  const criado = (r as any)?.data ?? r;
  const chaveAg = criado?.chave ?? criado?.CHAVE;

  // marca o encaixe como convertido e amarra a chave de agendamento
  await atualizarEncaixe(chaveEncaixe, { status: "C" as any, CHAVE_AGENDAMENTO: chaveAg } as any);
  return chaveAg;
}
