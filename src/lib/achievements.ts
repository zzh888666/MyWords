/**
 * 成就徽章
 *
 * 全部由统计数据派生（不落库）：导入备份、重置进度后自动一致，
 * 不需要单独维护「解锁记录」这种容易和真实数据打架的状态。
 */
import {
  BookMarked,
  Brain,
  CalendarCheck,
  CircleCheck,
  Flame,
  Gauge,
  Layers,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AchievementTone = 'indigo' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose'

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: LucideIcon
  tone: AchievementTone
  /** 当前进度 */
  current: number
  /** 解锁门槛 */
  target: number
  unlocked: boolean
}

export interface AchievementInput {
  /** 累计学会的单词数 */
  learned: number
  /** 累计复习结算次数 */
  reviews: number
  /** 连续打卡天数 */
  streak: number
  /** 总正确率 0~1 */
  accuracy: number
  /** 累计作答次数 */
  answered: number
  /** 全部词书总完成度 0~1 */
  overallPercent: number
  /** 已毕业（mastered）单词数 */
  mastered: number
  /** 有学习记录的天数 */
  activeDays: number
}

interface Def {
  id: string
  name: string
  desc: string
  icon: LucideIcon
  tone: AchievementTone
  target: number
  value: (i: AchievementInput) => number
}

const DEFS: Def[] = [
  { id: 'first', name: '初次启程', desc: '学会第一个单词', icon: Sparkles, tone: 'indigo', target: 1, value: (i) => i.learned },
  { id: 'learn50', name: '小有所成', desc: '累计学会 50 个单词', icon: Target, tone: 'cyan', target: 50, value: (i) => i.learned },
  { id: 'learn200', name: '词汇新星', desc: '累计学会 200 个单词', icon: TrendingUp, tone: 'violet', target: 200, value: (i) => i.learned },
  { id: 'learn500', name: '词汇达人', desc: '累计学会 500 个单词', icon: Trophy, tone: 'amber', target: 500, value: (i) => i.learned },
  { id: 'review100', name: '复习习惯', desc: '累计复习 100 次', icon: CalendarCheck, tone: 'emerald', target: 100, value: (i) => i.reviews },
  { id: 'review500', name: '过目不忘', desc: '累计复习 500 次', icon: Brain, tone: 'violet', target: 500, value: (i) => i.reviews },
  { id: 'streak7', name: '坚持一周', desc: '连续打卡 7 天', icon: Flame, tone: 'rose', target: 7, value: (i) => i.streak },
  { id: 'streak30', name: '月度恒心', desc: '连续打卡 30 天', icon: Medal, tone: 'amber', target: 30, value: (i) => i.streak },
  { id: 'days30', name: '日积月累', desc: '累计学习 30 天', icon: Layers, tone: 'cyan', target: 30, value: (i) => i.activeDays },
  { id: 'accurate', name: '百发百中', desc: '作答 100 次且正确率 90% 以上', icon: CircleCheck, tone: 'emerald', target: 1, value: (i) => (i.answered >= 100 && i.accuracy >= 0.9 ? 1 : 0) },
  { id: 'mastered50', name: '融会贯通', desc: '50 个单词毕业（间隔达 90 天）', icon: Gauge, tone: 'indigo', target: 50, value: (i) => i.mastered },
  { id: 'book100', name: '全书通关', desc: '某本词书完成度达到 100%', icon: BookMarked, tone: 'rose', target: 1, value: (i) => (i.overallPercent >= 1 ? 1 : 0) },
]

export function computeAchievements(input: AchievementInput): Achievement[] {
  return DEFS.map((d) => {
    const current = Math.max(0, d.value(input))
    return {
      id: d.id,
      name: d.name,
      desc: d.desc,
      icon: d.icon,
      tone: d.tone,
      current: Math.min(current, d.target),
      target: d.target,
      unlocked: current >= d.target,
    }
  })
}
