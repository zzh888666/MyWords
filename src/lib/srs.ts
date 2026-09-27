/**
 * 记忆调度规则（对齐 docs/LOGIC_FLOW.md 第 2.3 节与第 5.5 节）
 *
 * 两件事：
 *  1. 今日任务量怎么算 —— 档位比例 + 每日上限 + 到期池截断
 *  2. 一次作答之后这个单词什么时候再出现 —— 间隔表
 */
import type { Progress } from '../types'
import { addDays } from './date'

/** 间隔表：下标 = 连续答对次数 streak */
export const INTERVALS = [1, 2, 4, 7, 15, 30, 60, 90]

/** 达到该间隔即毕业（不再进复习池） */
export const MASTERED_INTERVAL = 90

/**
 * 复习抽样档位（v2 定稿，最后一项是兜底档，必须存在）
 *   已学习 ≤ 10        → 100%
 *   > 10 且 ≤ 60       → 80%
 *   > 60 且 ≤ 150      → 60%
 *   > 150              → 50%
 */
export const REVIEW_TIERS: { max: number; ratio: number }[] = [
  { max: 10, ratio: 1 },
  { max: 60, ratio: 0.8 },
  { max: 150, ratio: 0.6 },
]

/** 按已学习总数取比例；超出所有档位时走兜底 50% */
export function reviewRatioFor(learnedCount: number): number {
  return REVIEW_TIERS.find((t) => learnedCount <= t.max)?.ratio ?? 0.5
}

/**
 * 今日应复习数量 = min(ceil(已学习数 × 档位比例), 每日上限)
 * 每日上限为 0 时返回 0（今天不复习）。
 */
export function reviewTargetFor(learnedCount: number, dailyLimit: number): number {
  if (learnedCount <= 0) return 0
  if (dailyLimit <= 0) return 0
  return Math.min(Math.ceil(learnedCount * reviewRatioFor(learnedCount)), dailyLimit)
}

/** 今日应学习数量 = min(每日新词数, 未学习数) */
export function learnTargetFor(unlearnedCount: number, dailyNew: number): number {
  if (unlearnedCount <= 0) return 0
  if (dailyNew <= 0) return 0
  return Math.min(dailyNew, unlearnedCount)
}

/** streak → 间隔天数 */
export function intervalFor(streak: number): number {
  const idx = Math.max(0, Math.min(streak, INTERVALS.length - 1))
  return INTERVALS[idx]
}

/** 是否达到毕业线 */
export function isMasteredInterval(interval: number): boolean {
  return interval >= MASTERED_INTERVAL
}

/** 首次学会一个单词时的初始进度：明天复习一次 */
export function newProgress(wordId: string, bookId: string, day: string): Progress {
  return {
    wordId,
    bookId,
    state: 'learned',
    due: addDays(day, 1),
    interval: 1,
    streak: 0,
    lapses: 0,
    learnedDay: day,
    lastDay: day,
    updatedAt: Date.now(),
  }
}

/**
 * 复习答「认识」：连续答对 +1，间隔按表推进，达到毕业线转为 mastered。
 * mastered 之后不再进复习池，但仍算在「已学习列表」里（完成度会计入）。
 */
export function applyKnown(p: Progress, day: string): Progress {
  const streak = p.streak + 1
  const interval = intervalFor(streak)
  return {
    ...p,
    state: isMasteredInterval(interval) ? 'mastered' : 'learned',
    streak,
    interval,
    due: addDays(day, interval),
    lastDay: day,
    updatedAt: Date.now(),
  }
}

/** 复习答「不认识」（含轮次到顶被强制出队）：连续归零、遗忘 +1、明天再来 */
export function applyForgotten(p: Progress, day: string): Progress {
  return {
    ...p,
    state: 'learned',
    streak: 0,
    lapses: p.lapses + 1,
    interval: 1,
    due: addDays(day, 1),
    lastDay: day,
    updatedAt: Date.now(),
  }
}

/** Fisher–Yates 洗牌（不修改原数组，支持注入随机源便于测试） */
export function shuffle<T>(list: readonly T[], rnd: () => number = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 随机抽取 n 个不重复元素 */
export function sample<T>(list: readonly T[], n: number, rnd: () => number = Math.random): T[] {
  if (n <= 0) return []
  if (n >= list.length) return shuffle(list, rnd)
  return shuffle(list, rnd).slice(0, n)
}

/**
 * 生成单词的干扰项：从词库里挑释义不重复的词。
 *
 * 必须排除释义重复的选项 —— 否则会出现「一题两个正确答案」，
 * 这是背单词 App 的经典事故，用户会直接认为软件是坏的。
 */
export function buildChoices(
  answer: { id: string; translation: string },
  pool: readonly { id: string; translation: string }[],
  count = 4,
  rnd: () => number = Math.random,
): string[] {
  const seen = new Set([normalizeMeaning(answer.translation)])
  const picked: string[] = []
  for (const w of shuffle(pool, rnd)) {
    if (w.id === answer.id) continue
    const key = normalizeMeaning(w.translation)
    if (!key || seen.has(key)) continue
    seen.add(key)
    picked.push(w.id)
    if (picked.length >= count - 1) break
  }
  return picked
}

/**
 * 释义归一化：去掉词性前缀与标点，并把多个义项排序后拼接。
 *
 * 排序这一步很关键：「放弃；抛弃」和「抛弃；放弃」是同一个意思，
 * 不排序就会被当成两个不同的选项，出现「一题两个正确答案」。
 */
function normalizeMeaning(text: string): string {
  return text
    .replace(/\b(n|v|adj|adv|prep|conj|pron|num|art|int)\./gi, '')
    .split(/[；;，,、/|]/)
    .map((part) => part.replace(/[\s。.()（）]/g, '').toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|')
}
