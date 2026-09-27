/**
 * 本地日期工具
 *
 * 全应用只认「本地日期键」YYYY-MM-DD：跨天判断、队列幂等键、到期比较都用它。
 * 绝不把毫秒时间戳直接当日期用 —— 那样 23:59 与 00:01 会落在同一天。
 */

const DAY_MS = 86_400_000

/** 时间戳/Date → 本地日期键 YYYY-MM-DD */
export function dayKey(input: Date | number = new Date()): string {
  const d = typeof input === 'number' ? new Date(input) : input
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今天的日期键 */
export function todayKey(): string {
  return dayKey(new Date())
}

/** YYYY-MM-DD → 本地零点的 Date */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 日期键加减天数（跨月、跨年、闰年都由 Date 处理） */
export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** b − a 的天数差（正数表示 b 在 a 之后） */
export function diffDays(a: string, b: string): number {
  const ta = parseDay(a).getTime()
  const tb = parseDay(b).getTime()
  // 用四舍五入消除夏令时导致的 ±1 小时偏差
  return Math.round((tb - ta) / DAY_MS)
}

/** 从 end 往前数 n 天（含 end），返回升序数组 */
export function lastNDays(n: number, end: string = todayKey()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i))
  return out
}

/** 距离下一个零点还有多少毫秒（用于跨天定时器） */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2)
  return Math.max(1000, next.getTime() - now.getTime())
}

/** 3月5日 */
export function formatDayCn(day: string): string {
  const d = parseDay(day)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 周三 */
export function weekdayCn(day: string): string {
  return '日一二三四五六'[parseDay(day).getDay()] ? `周${'日一二三四五六'[parseDay(day).getDay()]}` : ''
}

/** 3/5 */
export function formatDayShort(day: string): string {
  const d = parseDay(day)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 当前时间 HH:mm */
export function nowHm(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** 把毫秒时长说成人话：1 小时 20 分 / 20 分钟 / 45 秒 */
export function humanDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total} 秒`
  const min = Math.floor(total / 60)
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${h} 小时 ${rest} 分` : `${h} 小时`
}
