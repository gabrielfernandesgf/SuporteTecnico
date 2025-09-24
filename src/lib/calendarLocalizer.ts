import { dayjsLocalizer } from 'react-big-calendar'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

export const localizer = dayjsLocalizer(dayjs)

export const messagesPtBr = {
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  allDay: 'dia inteiro',
  week: 'Semana',
  work_week: 'Semana útil',
  day: 'Dia',
  month: 'Mês',
  previous: 'Anterior',
  next: 'Próximo',
  yesterday: 'Ontem',
  tomorrow: 'Amanhã',
  today: 'Hoje',
  agenda: 'Agenda',
  noEventsInRange: 'Sem eventos neste período.',
  showMore: (total: number) => `+ ${total} mais`,
}
