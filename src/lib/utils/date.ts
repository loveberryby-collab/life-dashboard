import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDateRu(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'd MMMM yyyy', { locale: ru })
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'd MMM', { locale: ru })
}
