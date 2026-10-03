import { differenceInMinutes, format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns'

export function relative(date: string | Date | null | undefined) {
  if (!date) return '—'
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true })
}

/** "Today, 6:52 PM" — pass inline=true when it sits mid-sentence ("needed by today, …"). */
export function dayLabel(date: string | Date | null | undefined, inline = false) {
  if (!date) return '—'
  const d = new Date(date)
  if (isToday(d)) return `${inline ? 'today' : 'Today'}, ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `${inline ? 'tomorrow' : 'Tomorrow'}, ${format(d, 'h:mm a')}`
  return format(d, 'd MMM, h:mm a')
}

export function shortDate(date: string | Date | null | undefined) {
  if (!date) return '—'
  return format(new Date(date), 'd MMM yyyy')
}

export function countdown(date: string | Date, now = Date.now()) {
  const mins = differenceInMinutes(new Date(date), now)
  if (mins <= 0) return 'now'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  return h < 48 ? `${h}h ${mins % 60}m` : `${Math.round(h / 24)} days`
}

export const pct = (n: number) => `${Math.round(n * 100)}%`
