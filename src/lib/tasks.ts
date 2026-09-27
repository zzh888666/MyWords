/**
 * 每日任务生成（对齐 docs/LOGIC_FLOW.md 第 2 章）
 *
 * 核心规则只有一条：**幂等键是 [day, kind, bookId]，不是「列表是否为空」**。
 *
 * v1 用「待学习列表为空 → 生成任务」做判据，而「空」同时表示
 * 「今天还没发过任务」和「今天发过了并且学完了」两件事，
 * 于是用户在首页与词书之间来回切换就能无限刷词、绕过每日上限。
 * 现在生成函数可以被无限次调用，结果始终一致。
 */
import { db, getRunState, loadSettings, patchRunState } from '../db'
import type { QueueKind, SessionQueue, Settings } from '../types'
import { addDays, dayKey } from './date'
import { getDueIds, getLearnedIds, getUnlearnedIds, listBooks } from './derive'
import { learnTargetFor, reviewTargetFor, sample } from './srs'

/** 队列记录保留天数：只用于清理陈年记录，不影响任何逻辑 */
const QUEUE_RETENTION_DAYS = 7

/**
 * 确保某本书某类任务的当日队列存在。
 *
 * - 已存在 → 原样返回（绝不重抽、绝不覆盖、绝不追加）
 * - 不存在 → 按当前设置计算目标数量并抽取，写入快照
 */
export async function ensureDailyTask(
  bookId: string,
  kind: QueueKind,
  day: string,
  preset?: Settings,
): Promise<SessionQueue> {
  const existing = await db.queues.get([day, kind, bookId])
  if (existing) return existing

  const settings = preset ?? (await loadSettings())
  const wordIds = await pickWordIds(bookId, kind, day, settings)

  // 二次检查放在事务里：两个入口同时触发时也只会写入一条
  return db.transaction('rw', db.queues, async () => {
    const again = await db.queues.get([day, kind, bookId])
    if (again) return again
    const now = Date.now()
    const q: SessionQueue = {
      day,
      kind,
      bookId,
      wordIds,
      // target 是生成时冻结的快照，进度条分母永远用它，不重算
      target: wordIds.length,
      done: 0,
      rounds: {},
      createdAt: now,
      updatedAt: now,
    }
    await db.queues.put(q)
    return q
  })
}

async function pickWordIds(
  bookId: string,
  kind: QueueKind,
  day: string,
  settings: Settings,
): Promise<string[]> {
  if (kind === 'learn') {
    // 未学习列表 = 词书单词表 − 已学习（派生视图，不需要手动维护）
    const unlearned = await getUnlearnedIds(bookId)
    const target = learnTargetFor(unlearned.length, settings.dailyNew)
    // 随机「抽取」，但「展示顺序」按书内顺序（词频由高到低），由易到难更符合学习习惯。
    // 注意这两步不是互相抵消：随机决定抽哪些，排序决定先学哪个。
    const picked = sample(unlearned, target)
    const orderIndex = new Map(unlearned.map((id, i) => [id, i]))
    picked.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
    return picked
  }

  // 复习：先按档位比例算应复习数，再用「到期池」截断
  const learned = await getLearnedIds(bookId)
  const target = reviewTargetFor(learned.length, settings.dailyReviewLimit)
  if (target <= 0) return []
  const due = await getDueIds(bookId, day)
  // 顺序随机，避免固定顺序带来的位置记忆
  return sample(due, Math.min(target, due.length))
}

/** 所有词书都生成一遍（今天首次打开 App 时调用） */
export async function ensureAllDailyTasks(
  day: string,
  settings?: Settings,
): Promise<SessionQueue[]> {
  const preset = settings ?? (await loadSettings())
  const books = await listBooks()
  const out: SessionQueue[] = []
  for (const book of books) {
    out.push(await ensureDailyTask(book.id, 'learn', day, preset))
    out.push(await ensureDailyTask(book.id, 'review', day, preset))
  }
  return out
}

/**
 * 惰性补跑每日任务。
 *
 * 纯前端 App 无法保证「每天 0 点」真的执行（网页关着、App 被杀、手机休眠时定时器都不会跑），
 * 所以真正的驱动是「打开 App 时检查 lastRunDay，跨天就补跑一次」。
 * 定时器只用于「App 正开着跨过 0 点」的场景，幂等保证两者不会互相干扰。
 */
export async function catchUpDailyTasks(): Promise<{ day: string; ran: boolean }> {
  const day = dayKey(new Date())
  const state = await getRunState()
  if (state.lastRunDay === day) return { day, ran: false }

  await ensureAllDailyTasks(day)
  // 成功后才写幂等键：中途失败下次启动会重跑，而重跑不会产生重复队列
  await patchRunState({ lastRunDay: day })
  await pruneOldQueues(day)
  return { day, ran: true }
}

/** 删除若干天前的队列记录，避免无限增长（不影响任何业务逻辑） */
async function pruneOldQueues(day: string): Promise<void> {
  const cutoff = addDays(day, -QUEUE_RETENTION_DAYS)
  const stale = await db.queues.where('day').below(cutoff).toArray()
  if (!stale.length) return
  await db.queues.bulkDelete(
    stale.map((r) => [r.day, r.kind, r.bookId] as [string, string, string]),
  )
}

/**
 * 按新设置重建今天「还没开始」的队列。
 *
 * 用在「改每日新词 / 每日复习上限」之后：
 * - 已经开始的队列（done > 0）保持冻结 —— 进度不能倒退，做过的事不能被改
 * - 还没开始的队列删掉重建，让新设置立刻生效
 *   （否则用户把复习上限从 0 调到 50，当天却依然没有复习任务，会以为设置坏了）
 */
export async function rebuildTodayTasks(
  kinds: readonly QueueKind[],
  settings?: Settings,
): Promise<number> {
  const day = dayKey(new Date())
  const rows = await db.queues.where('day').equals(day).toArray()
  const fresh = rows.filter((r) => r.done === 0 && kinds.includes(r.kind))
  if (fresh.length) {
    await db.queues.bulkDelete(
      fresh.map((r) => [r.day, r.kind, r.bookId] as [string, string, string]),
    )
  }
  const preset = settings ?? (await loadSettings())
  const books = await listBooks()
  for (const book of books) {
    for (const kind of kinds) await ensureDailyTask(book.id, kind, day, preset)
  }
  return fresh.length
}
