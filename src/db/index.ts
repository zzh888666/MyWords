/**
 * 数据层（Dexie / IndexedDB）
 *
 * 表结构对齐 docs/LOGIC_FLOW.md 第 1 章：
 *   words      词条内容（只读）
 *   bookWords  词书单词表，[bookId+wordId] 联合主键 → 天然去重
 *   progress   学习进度，wordId 单主键 → 同一单词全局只学一次
 *   queues     当日队列快照，[day+kind+bookId] 联合主键 → 天然幂等
 *   daily      当日聚合统计
 *   logs       作答流水
 *   settings   全局设置（单行）
 *   runState   每日任务幂等键
 *
 * 数据库名带 -v2 后缀：v1 的表结构完全不同，换名字比写迁移更安全，
 * 也避免旧库里的脏数据影响新逻辑。
 */
import Dexie, { type Table } from 'dexie'
import type {
  Book,
  DailyStat,
  Progress,
  RunState,
  SessionQueue,
  Settings,
  StudyLog,
  Word,
} from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { CET4_BOOK_WITH_COUNT, CET4_WORDS } from '../data/cet4'
import { EXTRA_WORDS, IELTS_BOOK_WITH_COUNT, IELTS_WORDS } from '../data/extra'

/** 词书单词表：把词条挂到词书上，order 决定书内顺序 */
export interface BookWord {
  bookId: string
  wordId: string
  order: number
}

export class WordLearnDB extends Dexie {
  books!: Table<Book, string>
  words!: Table<Word, string>
  bookWords!: Table<BookWord, [string, string]>
  progress!: Table<Progress, string>
  queues!: Table<SessionQueue, [string, string, string]>
  daily!: Table<DailyStat, string>
  logs!: Table<StudyLog, number>
  settings!: Table<Settings, string>
  runState!: Table<RunState, string>

  constructor() {
    // 显式注入 indexedDB：测试环境需要在模块加载前完成 fake-indexeddb 桥接，
    // 不显式注入时 Dexie 可能读到 undefined 并静默降级。
    super('wordlearn-v2', {
      indexedDB: globalThis.indexedDB,
      IDBKeyRange: globalThis.IDBKeyRange,
    })
    this.version(1).stores({
      books: 'id, createdAt, custom',
      words: 'id, rank, pos',
      bookWords: '[bookId+wordId], bookId, wordId, order',
      progress: 'wordId, bookId, state, due, [bookId+state]',
      queues: '[day+kind+bookId], day, bookId, kind',
      daily: 'day',
      logs: '++id, day, wordId, kind, at',
      settings: 'id',
      runState: 'id',
    })
  }
}

export const db = new WordLearnDB()

// ────────────────────────────── 播种 ──────────────────────────────

/**
 * 首次启动时写入内置词库。
 * 用 runState.seeded 做幂等键：重复调用不会重复写，也不会覆盖用户数据。
 */
export async function ensureSeeded(): Promise<void> {
  const state = await db.runState.get('app')
  if (state?.seeded) return

  await db.transaction(
    'rw',
    [db.books, db.words, db.bookWords, db.settings, db.runState],
    async () => {
      // 雅思词书之外的扩展词归入「四级进阶」，避免出现不属于任何词书的孤儿词
      const ieltsIds = new Set(IELTS_WORDS.map((w) => w.id))
      const extraForCet4 = EXTRA_WORDS.filter((w) => !ieltsIds.has(w.id))

      const seen = new Set<string>()
      const cet4Words: Word[] = []
      for (const w of [...CET4_WORDS, ...extraForCet4]) {
        if (seen.has(w.id)) continue
        seen.add(w.id)
        cet4Words.push(w)
      }

      const allWords = new Map<string, Word>()
      for (const w of [...cet4Words, ...IELTS_WORDS]) allWords.set(w.id, w)

      await db.words.bulkPut([...allWords.values()])
      await db.books.bulkPut([
        { ...CET4_BOOK_WITH_COUNT, wordCount: cet4Words.length },
        IELTS_BOOK_WITH_COUNT,
      ])
      await db.bookWords.bulkPut(
        cet4Words.map((w, i) => ({ bookId: 'cet4', wordId: w.id, order: i })),
      )
      await db.bookWords.bulkPut(
        IELTS_WORDS.map((w, i) => ({ bookId: 'ielts', wordId: w.id, order: i })),
      )

      if (!(await db.settings.get('app'))) await db.settings.put({ ...DEFAULT_SETTINGS })
      await db.runState.put({
        id: 'app',
        lastRunDay: null,
        lastRemindedDay: null,
        seeded: true,
      })
    },
  )
}

// ────────────────────────────── 设置 ──────────────────────────────

export async function loadSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? { ...DEFAULT_SETTINGS }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await loadSettings()
  const next: Settings = { ...cur, ...patch, id: 'app' }
  await db.settings.put(next)
  return next
}

// ────────────────────────────── 运行状态 ──────────────────────────────

export async function getRunState(): Promise<RunState> {
  return (
    (await db.runState.get('app')) ?? {
      id: 'app',
      lastRunDay: null,
      lastRemindedDay: null,
      seeded: true,
    }
  )
}

export async function patchRunState(patch: Partial<RunState>): Promise<void> {
  const cur = await getRunState()
  await db.runState.put({ ...cur, ...patch, id: 'app' })
}

// ────────────────────────────── 当日队列 ──────────────────────────────

export async function getQueue(
  day: string,
  kind: SessionQueue['kind'],
  bookId: string,
): Promise<SessionQueue | undefined> {
  return db.queues.get([day, kind, bookId])
}

export async function putQueue(q: SessionQueue): Promise<void> {
  await db.queues.put({ ...q, updatedAt: Date.now() })
}

export async function deleteQueue(
  day: string,
  kind: SessionQueue['kind'],
  bookId: string,
): Promise<void> {
  await db.queues.delete([day, kind, bookId])
}

// ────────────────────────────── 当日统计 ──────────────────────────────

export interface DailyPatch {
  /** 今日学会的单词（自动去重） */
  learnedId?: string
  /** 今日复习结算的单词（自动去重） */
  reviewedId?: string
  answered?: number
  correct?: number
  elapsedMs?: number
}

/**
 * 累加当日统计。
 *
 * 必须在调用方的事务里执行（提交函数把队列、进度、统计、流水写在同一个事务中），
 * 所以这里自己不开事务 —— 嵌套事务与并发写正是 v1「队列被回滚」的根因。
 */
export async function mutateDaily(day: string, patch: DailyPatch): Promise<void> {
  const cur: DailyStat =
    (await db.daily.get(day)) ?? {
      day,
      learnedIds: [],
      reviewedIds: [],
      answered: 0,
      correct: 0,
      durationMs: 0,
    }

  const learnedIds = new Set(cur.learnedIds)
  const reviewedIds = new Set(cur.reviewedIds)
  if (patch.learnedId) learnedIds.add(patch.learnedId)
  if (patch.reviewedId) reviewedIds.add(patch.reviewedId)

  await db.daily.put({
    day,
    learnedIds: [...learnedIds],
    reviewedIds: [...reviewedIds],
    answered: cur.answered + (patch.answered ?? 0),
    correct: cur.correct + (patch.correct ?? 0),
    durationMs: cur.durationMs + (patch.elapsedMs ?? 0),
  })
}

// ────────────────────────────── 词书与词条维护 ──────────────────────────────

/** 新建自建词书 */
export async function addCustomBook(
  name: string,
  description: string,
  words: Word[],
  color: Book['color'] = 'violet',
): Promise<Book> {
  const id = `custom-${Date.now().toString(36)}`
  const book: Book = {
    id,
    name,
    description,
    wordCount: words.length,
    group: '我的',
    tagline: '自建词书',
    custom: true,
    builtin: false,
    createdAt: Date.now(),
    color,
  }
  await db.transaction('rw', [db.books, db.words, db.bookWords], async () => {
    await db.books.put(book)
    await db.words.bulkPut(words.map((w) => ({ ...w, custom: true })))
    await db.bookWords.bulkPut(words.map((w, i) => ({ bookId: id, wordId: w.id, order: i })))
  })
  return book
}

/**
 * 删除词书：只删词书与关联关系，保留单词与学习进度。
 * 单词可能同时属于别的词书，删掉它或删掉进度都是不可逆的数据损失。
 */
export async function deleteBook(bookId: string): Promise<void> {
  await db.transaction('rw', [db.books, db.bookWords, db.queues], async () => {
    await db.books.delete(bookId)
    const links = await db.bookWords.where('bookId').equals(bookId).toArray()
    await db.bookWords.bulkDelete(links.map((l) => [l.bookId, l.wordId] as [string, string]))
    const rows = await db.queues.where('bookId').equals(bookId).toArray()
    await db.queues.bulkDelete(rows.map((r) => [r.day, r.kind, r.bookId] as [string, string, string]))
  })
}

/** 修改词条内容 */
export async function updateWord(word: Word): Promise<void> {
  await db.words.put(word)
}

// ────────────────────────────── 数据管理 ──────────────────────────────

/** 清空学习数据，保留词库与设置 */
export async function resetProgress(): Promise<void> {
  await db.transaction(
    'rw',
    [db.progress, db.queues, db.daily, db.logs, db.runState],
    async () => {
      await db.progress.clear()
      await db.queues.clear()
      await db.daily.clear()
      await db.logs.clear()
      await db.runState.put({
        id: 'app',
        lastRunDay: null,
        lastRemindedDay: null,
        seeded: true,
      })
    },
  )
}

export interface ExportPayload {
  app: 'wordlearn'
  version: 2
  exportedAt: number
  books: Book[]
  words: Word[]
  bookWords: BookWord[]
  progress: Progress[]
  queues: SessionQueue[]
  daily: DailyStat[]
  logs: StudyLog[]
  settings: Settings
}

export async function exportAll(): Promise<ExportPayload> {
  const [books, words, bookWords, progress, queues, daily, logs, settings] = await Promise.all([
    db.books.toArray(),
    db.words.toArray(),
    db.bookWords.toArray(),
    db.progress.toArray(),
    db.queues.toArray(),
    db.daily.toArray(),
    db.logs.toArray(),
    loadSettings(),
  ])
  return {
    app: 'wordlearn',
    version: 2,
    exportedAt: Date.now(),
    books,
    words,
    bookWords,
    progress,
    queues,
    daily,
    logs,
    settings,
  }
}

/** 导入备份：整库覆盖 */
export async function importAll(payload: ExportPayload): Promise<void> {
  if (!payload || payload.app !== 'wordlearn') throw new Error('文件格式不正确')
  await db.transaction(
    'rw',
    [db.books, db.words, db.bookWords, db.progress, db.queues, db.daily, db.logs, db.settings, db.runState],
    async () => {
      await Promise.all([
        db.books.clear(),
        db.words.clear(),
        db.bookWords.clear(),
        db.progress.clear(),
        db.queues.clear(),
        db.daily.clear(),
        db.logs.clear(),
      ])
      await db.books.bulkPut(payload.books ?? [])
      await db.words.bulkPut(payload.words ?? [])
      await db.bookWords.bulkPut(payload.bookWords ?? [])
      await db.progress.bulkPut(payload.progress ?? [])
      await db.queues.bulkPut(payload.queues ?? [])
      await db.daily.bulkPut(payload.daily ?? [])
      await db.logs.bulkPut(payload.logs ?? [])
      if (payload.settings) await db.settings.put({ ...payload.settings, id: 'app' })
      await db.runState.put({
        id: 'app',
        lastRunDay: null,
        lastRemindedDay: null,
        seeded: true,
      })
    },
  )
}
