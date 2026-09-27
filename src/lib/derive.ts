/**
 * 派生视图与统计
 *
 * docs/LOGIC_FLOW.md 第 1.3 节：未学习 / 已学习 / 待学习 / 待复习四个「列表」
 * 全部是查询结果，不单独落库。这里就是那些查询。
 *
 * 好处：不会出现「从待学习移除后忘了加进已学习」这类多表同步 bug，
 * 去重由主键保证，闭环由 progress.state 保证。
 */
import { db } from '../db'
import type { Book, DailyStat, Progress, QueueKind, SessionQueue, Word } from '../types'
import { addDays } from './date'

/** 全部词书（内置在前，自建在后） */
export async function listBooks(): Promise<Book[]> {
  const books = await db.books.toArray()
  return books.sort((a, b) => Number(a.custom) - Number(b.custom) || a.createdAt - b.createdAt)
}

/** 词书内的单词 id，按书内顺序 */
export async function getBookWordIds(bookId: string): Promise<string[]> {
  const links = await db.bookWords.where('bookId').equals(bookId).toArray()
  return links.sort((a, b) => a.order - b.order).map((l) => l.wordId)
}

/** 词书内的完整词条 */
export async function getBookWords(bookId: string): Promise<Word[]> {
  const ids = await getBookWordIds(bookId)
  if (!ids.length) return []
  const words = await db.words.bulkGet(ids)
  return words.filter((w): w is Word => Boolean(w))
}

export async function getWord(wordId: string): Promise<Word | undefined> {
  return db.words.get(wordId)
}

/** 按 id 取词条，保持传入顺序（队列渲染用） */
export async function getWordsByIds(ids: readonly string[]): Promise<Word[]> {
  if (!ids.length) return []
  const words = await db.words.bulkGet([...ids])
  return words.filter((w): w is Word => Boolean(w))
}

/** 全部学习进度，key = wordId */
export async function getProgressMap(): Promise<Map<string, Progress>> {
  const rows = await db.progress.toArray()
  return new Map(rows.map((p) => [p.wordId, p]))
}

/** 已学会（含已毕业）的单词 id */
export async function getLearnedIds(bookId: string): Promise<string[]> {
  const [ids, map] = await Promise.all([getBookWordIds(bookId), getProgressMap()])
  return ids.filter((id) => {
    const p = map.get(id)
    return p?.state === 'learned' || p?.state === 'mastered'
  })
}

/** 未学习列表（派生视图）：词书单词表 − 已学习 */
export async function getUnlearnedIds(bookId: string): Promise<string[]> {
  const [ids, map] = await Promise.all([getBookWordIds(bookId), getProgressMap()])
  return ids.filter((id) => {
    const p = map.get(id)
    return !p || p.state === 'unlearned'
  })
}

/** 到期池：学过、且下次复习日期已到（当天新学的词 due 是明天，因此不会当天被抽到） */
export async function getDueIds(bookId: string, day: string): Promise<string[]> {
  const [ids, map] = await Promise.all([getBookWordIds(bookId), getProgressMap()])
  return ids.filter((id) => {
    const p = map.get(id)
    return p?.state === 'learned' && p.due <= day
  })
}

// ────────────────────────────── 进度统计 ──────────────────────────────

export interface BookProgress {
  book: Book
  total: number
  learned: number
  mastered: number
  /** 0~1，已 clamp */
  percent: number
}

/** 单本词书完成度 = 已学习数 / 词书总词数（clamp 到 0~1） */
export async function getBookProgress(bookId: string): Promise<BookProgress | null> {
  const book = await db.books.get(bookId)
  if (!book) return null
  const [ids, map] = await Promise.all([getBookWordIds(bookId), getProgressMap()])
  return toBookProgress(book, ids, map)
}

export async function getAllBookProgress(): Promise<BookProgress[]> {
  const [books, map] = await Promise.all([listBooks(), getProgressMap()])
  const out: BookProgress[] = []
  for (const book of books) {
    const ids = await getBookWordIds(book.id)
    out.push(toBookProgress(book, ids, map))
  }
  return out
}

function toBookProgress(book: Book, ids: string[], map: Map<string, Progress>): BookProgress {
  let learned = 0
  let mastered = 0
  for (const id of ids) {
    const p = map.get(id)
    if (p?.state === 'learned') learned++
    else if (p?.state === 'mastered') {
      learned++
      mastered++
    }
  }
  const total = ids.length
  return {
    book: { ...book, wordCount: total },
    total,
    learned,
    mastered,
    percent: total ? clamp01(learned / total) : 0,
  }
}

/** 全部词书合计：分母去重，避免共有词被重复计数 */
export async function getOverallProgress(): Promise<{
  total: number
  learned: number
  percent: number
}> {
  const [books, map] = await Promise.all([db.books.toArray(), getProgressMap()])
  const all = new Set<string>()
  for (const b of books) for (const id of await getBookWordIds(b.id)) all.add(id)
  let learned = 0
  for (const id of all) {
    const p = map.get(id)
    if (p?.state === 'learned' || p?.state === 'mastered') learned++
  }
  const total = all.size
  return { total, learned, percent: total ? clamp01(learned / total) : 0 }
}

// ────────────────────────────── 队列辅助 ──────────────────────────────

/** 队列里还没结算的单词（保持队列顺序） */
export async function getQueueWords(q: SessionQueue | undefined): Promise<Word[]> {
  if (!q || !q.wordIds.length) return []
  return getWordsByIds(q.wordIds)
}

/** 今天有任务（target > 0）。target 为 0 表示「今天没有任务」，不等于「已完成」 */
export function hasTask(q: SessionQueue | undefined | null): boolean {
  return Boolean(q && q.target > 0)
}

/** 今日任务已全部结算 */
export function isQueueDone(q: SessionQueue | undefined | null): boolean {
  return Boolean(q && q.target > 0 && q.wordIds.length === 0 && q.done >= q.target)
}

/** 进度百分比 0~1；分母是生成时冻结的快照 */
export function queuePercent(q: SessionQueue | undefined | null): number {
  if (!q || q.target <= 0) return 0
  return clamp01(q.done / q.target)
}

// ────────────────────────────── 统计 ──────────────────────────────

/** 连续打卡天数：从今天往回数，今天还没学则从昨天算起（避免白天显示断签） */
export async function getStreak(endDay: string): Promise<number> {
  const rows = await db.daily.toArray()
  const active = new Set(
    rows.filter((d) => d.learnedIds.length + d.reviewedIds.length > 0).map((d) => d.day),
  )
  let cursor = endDay
  if (!active.has(cursor)) cursor = addDays(cursor, -1)
  let streak = 0
  while (active.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** 最近 n 天的日统计，升序，缺失的日期补零 */
export async function getDailyRange(days: readonly string[]): Promise<DailyStat[]> {
  const rows = await db.daily.bulkGet([...days])
  return days.map((day, i) => rows[i] ?? emptyDaily(day))
}

function emptyDaily(day: string): DailyStat {
  return { day, learnedIds: [], reviewedIds: [], answered: 0, correct: 0, durationMs: 0 }
}

/**
 * 当日某一类任务（学习 / 复习）的作答统计。
 * 完成页要显示真实的用时与正确率，所以按流水现算，而不是拿 daily 的合计值。
 */
export async function getKindStats(
  day: string,
  kind: QueueKind,
): Promise<{ answered: number; correct: number; durationMs: number; accuracy: number }> {
  const rows = await db.logs
    .where('day')
    .equals(day)
    .filter((l) => l.kind === kind)
    .toArray()
  let answered = 0
  let correct = 0
  let durationMs = 0
  for (const r of rows) {
    answered++
    if (r.result === 'known') correct++
    durationMs += r.elapsedMs
  }
  return { answered, correct, durationMs, accuracy: answered ? clamp01(correct / answered) : 0 }
}

export interface TotalStats {
  learned: number
  reviews: number
  answered: number
  correct: number
  accuracy: number
  durationMs: number
  activeDays: number
}

/** 累计统计（来自 daily 表，跨设备导入后依然一致） */
export async function getTotalStats(): Promise<TotalStats> {
  const rows = await db.daily.toArray()
  let learned = 0
  let reviews = 0
  let answered = 0
  let correct = 0
  let durationMs = 0
  let activeDays = 0
  for (const d of rows) {
    learned += d.learnedIds.length
    reviews += d.reviewedIds.length
    answered += d.answered
    correct += d.correct
    durationMs += d.durationMs
    if (d.learnedIds.length + d.reviewedIds.length > 0) activeDays++
  }
  return {
    learned,
    reviews,
    answered,
    correct,
    accuracy: answered ? clamp01(correct / answered) : 0,
    durationMs,
    activeDays,
  }
}

/** 掌握分布：用于统计页展示学习质量 */
export async function getMasteryBuckets(): Promise<{
  fresh: number
  learning: number
  familiar: number
  mastered: number
}> {
  const rows = await db.progress.toArray()
  let fresh = 0
  let learning = 0
  let familiar = 0
  let mastered = 0
  for (const p of rows) {
    if (p.state === 'mastered') mastered++
    else if (p.streak >= 3) familiar++
    else if (p.streak >= 1) learning++
    else fresh++
  }
  return { fresh, learning, familiar, mastered }
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
