/**
 * 全局状态（zustand）
 *
 * 只放「跨页面共享 + 不属于数据库」的东西：
 *   - 启动状态与设置（设置本身持久化在 settings 表，这里只是内存镜像）
 *   - 今天是哪一天（跨天时统一刷新，页面跟着重算）
 *   - 轻提示 toast
 * 业务数据一律不进 store：真相在 IndexedDB，页面用 liveQuery 订阅。
 */
import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '../types'
import { ensureSeeded, loadSettings, resetProgress, saveSettings } from '../db'
import { catchUpDailyTasks, rebuildTodayTasks } from '../lib/tasks'
import { dayKey } from '../lib/date'
import { applyTheme } from '../lib/theme'

export type ToastTone = 'info' | 'success' | 'warn'

export interface Toast {
  id: number
  text: string
  tone: ToastTone
}

interface AppState {
  ready: boolean
  fatal: string | null
  settings: Settings
  /** 本地日期键；跨天时由 App 更新，所有页面据此重算 */
  today: string
  toast: Toast | null
  init: () => Promise<void>
  patchSettings: (patch: Partial<Settings>) => Promise<void>
  setToday: (day: string) => void
  flash: (text: string, tone?: ToastTone) => void
  dismissToast: () => void
  resetAll: () => Promise<void>
}

let toastSeq = 0

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  fatal: null,
  settings: { ...DEFAULT_SETTINGS },
  today: dayKey(),
  toast: null,

  init: async () => {
    try {
      await ensureSeeded()
      // 惰性补跑每日任务：这是「0 点定时任务」的真正驱动（详见 lib/tasks.ts 注释）
      await catchUpDailyTasks()
      const settings = await loadSettings()
      applyTheme(settings.theme)
      set({ settings, today: dayKey(), ready: true, fatal: null })
    } catch (e) {
      set({ ready: true, fatal: e instanceof Error ? e.message : String(e) })
    }
  },

  patchSettings: async (patch) => {
    const next = await saveSettings(patch)
    set({ settings: next })
    if (patch.theme) applyTheme(next.theme)

    // 影响任务数量的设置改动：重建今天还没开始的队列
    const kinds: ('learn' | 'review')[] = []
    if (patch.dailyNew !== undefined) kinds.push('learn')
    if (patch.dailyReviewLimit !== undefined) kinds.push('review')
    if (kinds.length) await rebuildTodayTasks(kinds, next)
  },

  setToday: (day) => {
    if (get().today !== day) set({ today: day })
  },

  flash: (text, tone = 'info') => {
    set({ toast: { id: ++toastSeq, text, tone } })
  },

  dismissToast: () => set({ toast: null }),

  resetAll: async () => {
    await resetProgress()
    await catchUpDailyTasks()
  },
}))

// ────────────────────────────── 学习会话（内存态） ──────────────────────────────

export type PendingAction = 'learned' | 'requeue' | null

interface StudySessionState {
  day: string | null
  bookId: string | null
  /** 从选择题跳到详情页时，详情页的「下一题」该执行哪个动作 */
  pending: PendingAction
  /** 本题从出现到作答的毫秒数，提交时一起落库（用于统计用时） */
  pendingElapsed: number
  /** 按单词计数的连错次数（作用域：该词本轮出现在队首期间） */
  wrong: Record<string, number>
  begin: (day: string, bookId: string) => void
  setPending: (p: PendingAction, elapsedMs?: number) => void
  bumpWrong: (wordId: string) => number
  resetWrong: (wordId: string) => void
  endSession: () => void
}

/**
 * 学习过程中的临时状态。
 *
 * 刻意不落库：连错次数是「这一次看到这个字」的过程量，重开 App 就该重来，
 * 落库反而会造成「一进页面就被弹到详情页」。缺失时最坏结果是重新作答，状态绝对安全。
 */
export const useStudySession = create<StudySessionState>((set, get) => ({
  day: null,
  bookId: null,
  pending: null,
  pendingElapsed: 0,
  wrong: {},

  begin: (day, bookId) => {
    const cur = get()
    if (cur.day === day && cur.bookId === bookId) return
    set({ day, bookId, pending: null, pendingElapsed: 0, wrong: {} })
  },
  setPending: (pending, elapsedMs) =>
    set({ pending, pendingElapsed: elapsedMs ?? get().pendingElapsed }),
  bumpWrong: (wordId) => {
    const next = (get().wrong[wordId] ?? 0) + 1
    set({ wrong: { ...get().wrong, [wordId]: next } })
    return next
  },
  resetWrong: (wordId) => {
    const next = { ...get().wrong }
    delete next[wordId]
    set({ wrong: next })
  },
  endSession: () => set({ day: null, bookId: null, pending: null, pendingElapsed: 0, wrong: {} }),
}))
