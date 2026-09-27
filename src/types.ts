/**
 * 领域模型定义（v2 · 对齐 docs/LOGIC_FLOW.md）
 *
 * 设计要点：
 * 1. 「词条内容」与「学习进度」彻底分离：words 是只读词库，progress 随作答变化。
 * 2. 四个列表（未学习 / 已学习 / 待学习 / 待复习）都不是实体表：
 *    - 未学习列表 = 词书单词表 − 已学习（派生视图）
 *    - 已学习列表 = 词书单词表 ∩ progress(state ∈ learned|mastered)（派生视图）
 *    - 待学习 / 待复习 = 当天的 sessionQueues 快照
 *    这样「去重」由主键保证，「闭环」由状态机保证，不存在多表同步漏写的问题。
 * 3. 日期一律用本地日期键 YYYY-MM-DD（字符串），跨天判断、比较、索引都简单。
 */

// ────────────────────────────── 词条内容 ──────────────────────────────

/** 例句 */
export interface Example {
  en: string
  zh?: string
}

/** 义项：一个单词的某一种词性 + 释义 */
export interface Sense {
  /** 词性，如 n. / v. / adj. */
  pos: string
  /** 中文释义 */
  zh: string
  /** 英文释义（可选，进阶用户用） */
  en?: string
  /** 专业领域标签；有值时在详情页单独成块 */
  domain?: string
  /** 该义项下的例句 */
  examples?: Example[]
}

/** 词形变化 */
export interface WordForms {
  third?: string
  past?: string
  pastParticiple?: string
  ing?: string
  plural?: string
  comparative?: string
  superlative?: string
}

/** 词根词缀拆解 */
export interface Etymology {
  roots: string[]
  /** 词根含义与来源说明 */
  rootNote?: string
  /** 后缀说明，如「-ity 构成抽象名词」 */
  suffix?: string
}

/** 同族词：由同一词根派生出的其他单词 */
export interface WordFamily {
  /** 代表词，如 serendipitous */
  key: string
  /** 代表词的词性 */
  pos?: string
  /** 代表词释义 */
  meaning: string
  /** 全家族词（含代表词与派生词） */
  words: string[]
}

/** 单词词条（只读词库数据） */
export interface Word {
  /** 主键：小写单词原文 */
  id: string
  /** 展示用原文（保留大小写） */
  word: string
  /** 音标 */
  phonetic?: { us?: string; uk?: string }
  /** 主要词性（列表展示用） */
  pos: string
  /** 简明中文释义（多个义项用「；」分隔） */
  translation: string
  /** 详细义项 */
  senses?: Sense[]
  /** 顶层例句（不在 senses 里时的兜底） */
  examples?: Example[]
  forms?: WordForms
  etymology?: Etymology
  /** 同族词（详情页「词根与词族」区块） */
  family?: WordFamily
  collocations?: string[]
  synonyms?: string[]
  antonyms?: string[]
  /** 所属词书 id 列表 */
  tags: string[]
  /** 词频排名，数字越小越常用 */
  rank: number
  /** 用户自建词条 */
  custom?: boolean
}

// ────────────────────────────── 词书 ──────────────────────────────

export interface Book {
  /** 主键，如 cet4 */
  id: string
  name: string
  description: string
  /** 词条数量（播种时写入；派生统计以 bookWords 实际数量为准） */
  wordCount: number
  /** 分组：考试 / 教材 / 主题 */
  group?: string
  /** 卡片上的一句话说明 */
  tagline?: string
  /** 用户自建词书 */
  custom: boolean
  /** 内置词书 */
  builtin: boolean
  createdAt: number
  /** 词书配色主题（决定卡片与图标底色） */
  color?: BookColor
}

/** 词书配色：只需挑一个名字，具体色值在 styles.css 里定义 */
export type BookColor = 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'

// ────────────────────────────── 学习进度 ──────────────────────────────

/**
 * 单词学习状态
 * - unlearned：没学过 / 还没结算为学会
 * - learned  ：学过，按 due 参与复习
 * - mastered ：已毕业（间隔达到 90 天），不再进复习池
 */
export type LearnState = 'unlearned' | 'learned' | 'mastered'

/** 单词学习进度（每个单词全局唯一一条，跨词书共享） */
export interface Progress {
  /** 主键：单词 id */
  wordId: string
  /** 首次学会时所在的词书（统计归属用） */
  bookId: string
  state: LearnState
  /** 下次复习日期 YYYY-MM-DD */
  due: string
  /** 当前复习间隔（天） */
  interval: number
  /** 连续答对次数 */
  streak: number
  /** 遗忘次数 */
  lapses: number
  /** 首次学会的日期 */
  learnedDay: string
  /** 最后作答日期 */
  lastDay: string
  updatedAt: number
}

// ────────────────────────────── 当日会话队列 ──────────────────────────────

export type QueueKind = 'learn' | 'review'

/**
 * 当日队列快照。
 *
 * 主键 [day+kind+bookId] 就是幂等键：同一天同一本书同一类任务只会有一条记录。
 * 「今天要不要生成任务」只看这条记录存不存在，**不看列表是否为空**
 * —— 列表为空既可能是「还没生成」，也可能是「已经学完了」，用空判断会无限刷词。
 */
export interface SessionQueue {
  day: string
  kind: QueueKind
  bookId: string
  /** 还没结算的单词 id（顺序即出题顺序） */
  wordIds: string[]
  /** 今日任务总量（生成时冻结的快照），进度条分母 */
  target: number
  /** 今日已结算数量（单调递增），进度条分子 */
  done: number
  /** 每个词当日的轮次：学习＝被重排次数，复习＝被标记不认识的次数 */
  rounds: Record<string, number>
  createdAt: number
  updatedAt: number
}

// ────────────────────────────── 统计 ──────────────────────────────

export interface DailyStat {
  /** 主键：YYYY-MM-DD */
  day: string
  /** 当日学会的单词 id（去重） */
  learnedIds: string[]
  /** 当日复习结算的单词 id（去重） */
  reviewedIds: string[]
  /** 当日作答次数 */
  answered: number
  /** 当日答对次数 */
  correct: number
  /** 当日学习时长（毫秒） */
  durationMs: number
}

export type LogResult = 'known' | 'wrong' | 'requeue' | 'forced'

/** 一次作答记录 */
export interface StudyLog {
  id?: number
  day: string
  wordId: string
  bookId: string
  kind: QueueKind
  result: LogResult
  elapsedMs: number
  at: number
}

// ────────────────────────────── 设置 ──────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'
export type StudyMode = 'choice' | 'spell'

/** 头像用 emoji 表示，避免引入图片资源 */
export type AvatarId = '🧑‍🎓' | '👩‍🎓' | '👨‍💻' | '🐱' | '🐼' | '🦊' | '🌟' | '📚'

export interface Settings {
  id: 'app'
  nickname: string
  avatar: AvatarId
  /** 每日新词目标 */
  dailyNew: number
  /** 每日复习上限（0 表示今天不复习） */
  dailyReviewLimit: number
  /** 当前词书 id */
  currentBookId: string
  /** 默认学习方式 */
  studyMode: StudyMode
  /** 卡片默认自动播放发音 */
  autoPronounce: boolean
  /** 发音口音 */
  accent: 'us' | 'uk'
  /** 语速 */
  speechRate: number
  theme: ThemeMode
  /** 每日提醒 */
  reminderEnabled: boolean
  /** 提醒时间 HH:mm */
  reminderTime: string
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  nickname: '同学',
  avatar: '🧑‍🎓',
  dailyNew: 20,
  dailyReviewLimit: 200,
  currentBookId: 'cet4',
  studyMode: 'choice',
  autoPronounce: true,
  accent: 'us',
  speechRate: 0.95,
  theme: 'system',
  reminderEnabled: false,
  reminderTime: '20:00',
}

/** 全局运行状态（定时任务幂等键、提醒去重） */
export interface RunState {
  id: 'app'
  /** 最近一次成功执行每日任务的日期 */
  lastRunDay: string | null
  /** 最近一次弹提醒的日期 */
  lastRemindedDay: string | null
  /** 是否已播种 */
  seeded: boolean
}
