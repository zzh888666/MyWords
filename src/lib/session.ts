/**
 * 作答提交（对齐 docs/LOGIC_FLOW.md 第 4、5、8 章）
 *
 * 三条铁律，全部体现在这个文件里：
 *  1. 队列的「读—改—写」在同一个事务内完成；
 *  2. 队列、进度、统计、流水在同一次写入里落盘（v1 曾因并发写导致队列被回滚）；
 *  3. 所有出队一律按 wordId 定位，绝不按位置（slice(0,1) 会删错词）。
 */
import { db, mutateDaily } from '../db'
import type { QueueKind, SessionQueue } from '../types'
import { addDays, todayKey } from './date'
import { applyForgotten, applyKnown, newProgress } from './srs'

/** 学习：连续选错多少次自动跳到单词详情页（按单词计数） */
export const MAX_STUDY_WRONG = 3
/**
 * 同一个词当天最多出现几轮。
 * 学习：第 3 次错满 3 个选项 → 强制结算为已学会；复习：第 3 次点「不认识」→ 强制出队。
 * 没有这个上限，「错满 3 次 → 排队尾 → 再错 3 次」可以无限循环，当天永远结束不了。
 */
export const MAX_ROUNDS_PER_DAY = 3

export interface CommitOutcome {
  ok: boolean
  reason?: 'stale-day' | 'no-queue' | 'not-in-queue'
  /** 该词本次是否已结算（离开队列） */
  settled: boolean
  /** 是否因轮次到顶被强制结算 */
  forced: boolean
  /** 队列是否原地未动（只剩一个词时点「不认识」会出现） */
  repeated: boolean
  queue?: SessionQueue
}

const FAIL = (reason: CommitOutcome['reason']): CommitOutcome => ({
  ok: false,
  reason,
  settled: false,
  forced: false,
  repeated: false,
})

/** 提交前的跨天闸门：会话持有的 day 不是今天就拒绝，避免写到昨天的队列里 */
function guard(day: string): CommitOutcome | null {
  return day === todayKey() ? null : FAIL('stale-day')
}

/** 从队列里按 id 移除一个词 */
function without(q: SessionQueue, wordId: string): string[] {
  return q.wordIds.filter((id) => id !== wordId)
}

/** 把一个词挪到队尾（队列只剩它一个时保持原样） */
function moveToEnd(q: SessionQueue, wordId: string): string[] {
  const rest = without(q, wordId)
  return rest.length ? [...rest, wordId] : [...q.wordIds]
}

/**
 * 学习：答对 → 出队 + 记为已学会（明天进入复习池）
 */
export async function commitLearn(
  day: string,
  bookId: string,
  wordId: string,
  elapsedMs = 0,
): Promise<CommitOutcome> {
  const blocked = guard(day)
  if (blocked) return blocked

  return db.transaction('rw', [db.queues, db.progress, db.daily, db.logs], async () => {
    const q = await db.queues.get([day, 'learn', bookId])
    if (!q) return FAIL('no-queue')
    if (!q.wordIds.includes(wordId)) return FAIL('not-in-queue')

    const next: SessionQueue = {
      ...q,
      wordIds: without(q, wordId),
      done: q.done + 1,
      updatedAt: Date.now(),
    }
    await db.queues.put(next)

    const prev = await db.progress.get(wordId)
    await db.progress.put(
      prev
        ? { ...prev, state: 'learned', lastDay: day, updatedAt: Date.now() }
        : newProgress(wordId, bookId, day),
    )
    await mutateDaily(day, { learnedId: wordId, answered: 1, correct: 1, elapsedMs })
    await db.logs.add({
      day,
      wordId,
      bookId,
      kind: 'learn',
      result: 'known',
      elapsedMs,
      at: Date.now(),
    })
    return { ok: true, settled: true, forced: false, repeated: false, queue: next }
  })
}

/**
 * 学习：错满 3 次 → 移到队尾（不推进进度，也不改学习状态）。
 * 同一个词当天已经出现满 MAX_ROUNDS_PER_DAY 轮时改为强制结算。
 */
export async function commitRequeue(
  day: string,
  bookId: string,
  wordId: string,
  elapsedMs = 0,
): Promise<CommitOutcome> {
  const blocked = guard(day)
  if (blocked) return blocked

  return db.transaction('rw', [db.queues, db.progress, db.daily, db.logs], async () => {
    const q = await db.queues.get([day, 'learn', bookId])
    if (!q) return FAIL('no-queue')
    if (!q.wordIds.includes(wordId)) return FAIL('not-in-queue')

    const rounds = (q.rounds[wordId] ?? 0) + 1
    const forced = rounds >= MAX_ROUNDS_PER_DAY
    const next: SessionQueue = {
      ...q,
      wordIds: forced ? without(q, wordId) : moveToEnd(q, wordId),
      done: forced ? q.done + 1 : q.done,
      rounds: { ...q.rounds, [wordId]: rounds },
      updatedAt: Date.now(),
    }
    await db.queues.put(next)

    if (forced) {
      const prev = await db.progress.get(wordId)
      const base = prev ?? newProgress(wordId, bookId, day)
      await db.progress.put({
        ...base,
        // 强制结算也要进复习池，并留下遗忘记录，明天一定会再出现
        state: 'learned',
        streak: 0,
        lapses: base.lapses + 1,
        interval: 1,
        due: addDays(day, 1),
        lastDay: day,
        updatedAt: Date.now(),
      })
    }
    await mutateDaily(day, {
      learnedId: forced ? wordId : undefined,
      answered: 1,
      correct: 0,
      elapsedMs,
    })
    await db.logs.add({
      day,
      wordId,
      bookId,
      kind: 'learn',
      result: forced ? 'forced' : 'requeue',
      elapsedMs,
      at: Date.now(),
    })
    return { ok: true, settled: forced, forced, repeated: false, queue: next }
  })
}

/**
 * 复习：认识 → 出队并按间隔表推进；不认识 → 移到队尾，到顶则强制出队。
 *
 * 两种结果都算「今天这个词已经处理完了」的场景只有：认识、或轮次到顶。
 * 单纯点「不认识」不推进 done —— 那个词还会再出现，进度条不应该虚增。
 */
export async function commitReview(
  day: string,
  bookId: string,
  wordId: string,
  result: 'known' | 'forgotten',
  elapsedMs = 0,
): Promise<CommitOutcome> {
  const blocked = guard(day)
  if (blocked) return blocked

  return db.transaction('rw', [db.queues, db.progress, db.daily, db.logs], async () => {
    const q = await db.queues.get([day, 'review', bookId])
    if (!q) return FAIL('no-queue')
    if (!q.wordIds.includes(wordId)) return FAIL('not-in-queue')

    const prev = await db.progress.get(wordId)
    const base = prev ?? newProgress(wordId, bookId, day)

    let next: SessionQueue
    let forced = false
    let repeated = false

    if (result === 'known') {
      next = { ...q, wordIds: without(q, wordId), done: q.done + 1, updatedAt: Date.now() }
      await db.progress.put(applyKnown(base, day))
    } else {
      const rounds = (q.rounds[wordId] ?? 0) + 1
      forced = rounds >= MAX_ROUNDS_PER_DAY
      const rest = without(q, wordId)
      // 只有一个词时「移到队尾」等于原地不动，UI 需要据此给出「再记一次」的反馈
      repeated = !forced && rest.length === 0
      next = {
        ...q,
        wordIds: forced ? rest : moveToEnd(q, wordId),
        done: forced ? q.done + 1 : q.done,
        rounds: { ...q.rounds, [wordId]: rounds },
        updatedAt: Date.now(),
      }
      await db.progress.put(applyForgotten(base, day))
    }

    await db.queues.put(next)
    await mutateDaily(day, {
      reviewedId: forced || result === 'known' ? wordId : undefined,
      answered: 1,
      correct: result === 'known' ? 1 : 0,
      elapsedMs,
    })
    await db.logs.add({
      day,
      wordId,
      bookId,
      kind: 'review',
      result: result === 'known' ? 'known' : forced ? 'forced' : 'wrong',
      elapsedMs,
      at: Date.now(),
    })
    return {
      ok: true,
      settled: result === 'known' || forced,
      forced,
      repeated,
      queue: next,
    }
  })
}

/** 今天的队列（学习 / 复习） */
export async function loadQueue(
  day: string,
  kind: QueueKind,
  bookId: string,
): Promise<SessionQueue | undefined> {
  return db.queues.get([day, kind, bookId])
}
