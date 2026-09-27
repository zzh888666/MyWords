/**
 * 单词学习（选择题 / 拼写）
 *
 * 关键实现约束（对应 docs/LOGIC_FLOW.md §4）：
 *  - 当前题目 = 队列的第一个词。没有 index、没有占位、没有恢复逻辑，
 *    重开 App 天然回到原处 —— v1 的一整类「回到上次的题」bug 由此消失。
 *  - 答对 → 0.5s 后进详情页；详情页的「下一题」才真正写库（先落盘后跳转）。
 *  - 连错 3 次按**单词**计数，作用域是「该词本轮出现在队首期间」，
 *    进入卡片时不检查历史计数，否则从详情页返回会被立刻弹走。
 *  - 答错的词当天最多重排 2 次，第 3 轮错满强制结算，保证当天一定结束。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, ChevronLeft, Lightbulb, Volume2, X } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp, useStudySession } from '../store/app'
import { EMPTY_LIST, useQuery } from '../lib/hooks'
import {
  getBookWordIds,
  getQueueWords,
  getKindStats,
  getWordsByIds,
  hasTask,
  isQueueDone,
  queuePercent,
} from '../lib/derive'
import { getQueue } from '../db'
import { ensureDailyTask } from '../lib/tasks'
import { buildChoices, shuffle } from '../lib/srs'
import { speak, speechSupported } from '../lib/speech'
import { MAX_STUDY_WRONG } from '../lib/session'
import type { SessionQueue, Word } from '../types'
import { Button, Card, EmptyState, IconButton, ProgressBar } from '../components/ui'
import ResultScreen from '../components/ResultScreen'

const LETTERS = ['A', 'B', 'C', 'D']

/** 干扰项候选池大小：够凑出 3 个不同释义即可，没必要把整本书读进内存 */
const DISTRACTOR_POOL = 120

export default function Study() {
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const flash = useApp((s) => s.flash)
  const bookId = settings.currentBookId
  const navigate = useNavigate()
  const { pending, setPending, bumpWrong } = useStudySession()

  const view = useQuery(
    async () => {
      const queue = await getQueue(today, 'learn', bookId)
      const words = await getQueueWords(queue)
      const stats = await getKindStats(today, 'learn')
      return { loaded: true, queue, words, stats }
    },
    [today, bookId],
    {
      loaded: false,
      queue: undefined as SessionQueue | undefined,
      words: EMPTY_LIST as Word[],
      stats: { answered: 0, correct: 0, durationMs: 0, accuracy: 0 },
    },
  )

  /**
   * 干扰项候选池。
   *
   * 不必把整本 600+ 词读进内存：按固定步长均匀取 120 个就足够凑出干扰项，
   * 而且步长固定 → 池子跨渲染稳定，选项不会跳来跳去。
   */
  const bookWords = useQuery(
    async () => {
      const ids = await getBookWordIds(bookId)
      if (ids.length <= DISTRACTOR_POOL) return getWordsByIds(ids)
      const step = ids.length / DISTRACTOR_POOL
      const picked: string[] = []
      for (let i = 0; i < DISTRACTOR_POOL; i++) picked.push(ids[Math.floor(i * step)])
      return getWordsByIds(picked)
    },
    [bookId],
    EMPTY_LIST as Word[],
  )

  const current = view.words[0]
  const queue = view.queue
  const target = queue?.target ?? 0
  const done = queue?.done ?? 0
  const pct = Math.round(queuePercent(queue) * 100)
  const mode = settings.studyMode

  // 队列缺失（例如直接打开 /study）时补生成一次，幂等
  useEffect(() => {
    if (view.loaded && !view.queue) void ensureDailyTask(bookId, 'learn', today)
  }, [view.loaded, view.queue, bookId, today])

  /**
   * 只负责初始化会话，**不能**在卸载时清空 pending：
   * 跳到详情页时本页会卸载，而详情页正是靠 pending 决定「下一题」要做什么。
   */
  useEffect(() => {
    useStudySession.getState().begin(today, bookId)
  }, [today, bookId])

  // ── 选项：按单词缓存，避免任何一次重渲染导致 ABCD 换位 ──
  // 正确答案可能不在候选池里（池是抽样），所以查表要带上当前词
  const wordsById = useMemo(() => {
    const m = new Map(bookWords.map((w) => [w.id, w]))
    if (current) m.set(current.id, current)
    return m
  }, [bookWords, current])
  const choicesRef = useRef(new Map<string, string[]>())
  const [choices, setChoices] = useState<string[]>([])
  useEffect(() => {
    const w = current
    if (!w || !bookWords.length) {
      setChoices(EMPTY_LIST)
      return
    }
    const cached = choicesRef.current.get(w.id)
    if (cached) {
      setChoices(cached)
      return
    }
    const list = shuffle([w.id, ...buildChoices(w, bookWords, 4)])
    choicesRef.current.set(w.id, list)
    setChoices(list)
  }, [current, bookWords])

  // ── 一次作答后的锁定：解锁条件 = 换到下一个词，兜底 1.2s ──
  const [pick, setPick] = useState<{ wordId: string; optionId: string; correct: boolean } | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [spell, setSpell] = useState('')
  const lockedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  /** 本题出现的时间：用于统计真实用时 */
  const shownAtRef = useRef(Date.now())

  useEffect(() => {
    lockedRef.current = false
    shownAtRef.current = Date.now()
    setShowHint(false)
    setSpell('')
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [current?.id])

  const activePick = pick && pick.wordId === current?.id ? pick : null

  // 自动发音：依赖只放单词 id 与发音相关设置，避免每次数据发射都重念一遍
  useEffect(() => {
    const w = view.words[0]
    if (!settings.autoPronounce || !w) return
    speak(w.word, settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, settings.autoPronounce, settings.accent, settings.speechRate])

  /** 单题耗时上限 2 分钟：避免切到后台很久后算出一个离谱的数字 */
  const elapsed = () => Math.min(Date.now() - shownAtRef.current, 120_000)

  const goDetail = (wordId: string, action: 'learned' | 'requeue', delay: number) => {
    setPending(action, elapsed())
    lockedRef.current = true
    timerRef.current = window.setTimeout(() => navigate(ROUTES.studyWord(wordId)), delay)
  }

  /** 判定作答结果：答对进详情；错满 3 次进详情并标记重排 */
  const judge = (correct: boolean, optionId: string) => {
    if (!current || lockedRef.current) return
    const wordId = current.id
    setPick({ wordId, optionId, correct })
    if (correct) {
      flash('答对了', 'success')
      goDetail(wordId, 'learned', 500)
      return
    }
    const count = bumpWrong(wordId)
    if (mode === 'spell') setSpell('')
    const reachedLimit = count >= MAX_STUDY_WRONG
    flash(reachedLimit ? '连着错了 3 次，看看这个词怎么记' : '选错了哟', 'warn')
    if (reachedLimit) goDetail(wordId, 'requeue', 700)
  }

  const onPickOption = (optionId: string) => judge(optionId === current?.id, optionId)

  const onSubmitSpell = () => {
    if (!current || lockedRef.current) return
    const typed = spell.trim().toLowerCase()
    if (!typed) return
    judge(typed === current.word.toLowerCase(), typed)
  }

  // 键盘操作：1-4 选项 / 回车提交
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return
      if (mode === 'choice' && /^[1-4]$/.test(e.key)) {
        const id = choices[Number(e.key) - 1]
        if (id) onPickOption(id)
      }
      if (mode === 'spell' && e.key === 'Enter') onSubmitSpell()
      if (e.key === 'Escape') navigate(ROUTES.home)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── 各种空态 ──
  if (!view.loaded) {
    return (
      <div className="screen">
        <div className="skeleton" style={{ height: 44 }} />
        <div className="skeleton" style={{ height: 200, marginTop: 'auto' }} />
      </div>
    )
  }

  if (queue && isQueueDone(queue)) {
    return (
      <div className="screen">
        <ResultScreen
          title="今日学习已完成 🎉"
          desc="今天的新词都过了一遍，明天它们会进入复习队列。"
          count={done}
          durationMs={view.stats.durationMs}
          accuracy={view.stats.accuracy}
          onHome={() => navigate(ROUTES.home)}
        />
      </div>
    )
  }

  if (!hasTask(queue) || !current) {
    return (
      <div className="screen page--center">
        <EmptyState
          icon={BookOpen}
          tone="indigo"
          title={settings.dailyNew <= 0 ? '每日学习数量为 0' : '今日暂无学习任务'}
          desc={
            settings.dailyNew <= 0
              ? '可以到「学习计划」里把每日学习数量调大一些。'
              : '明天再来，或者换一本词书继续。'
          }
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
              返回首页
            </Button>
          }
        />
      </div>
    )
  }

  const canSpeak = speechSupported()
  const hintText =
    current.etymology?.roots?.length || current.etymology?.rootNote || current.etymology?.suffix
      ? [current.etymology?.roots.join('  +  '), current.etymology?.rootNote, current.etymology?.suffix]
          .filter(Boolean)
          .join('　·　')
      : ''

  return (
    <div className="screen">
      <div className="study-top">
        <div className="study-top__row">
          <IconButton icon={ChevronLeft} label="返回首页" onClick={() => navigate(ROUTES.home)} />
          <span className="study-top__text">
            今日要学习 <b className="study-top__count num">{target}</b> 个单词，已学习{' '}
            <b className="study-top__count num">{done}</b>
          </span>
          <span className="study-top__pct num">{pct}%</span>
        </div>
        <ProgressBar value={queuePercent(queue)} label="今日学习进度" size="lg" />
      </div>

      <div className="study-stage">
        <Card className="wordcard">
          <div className="wordcard__word">{current.word}</div>
          {mode === 'spell' ? (
            <div className="wordcard__phonetic">{current.translation}</div>
          ) : current.phonetic?.us ? (
            <div className="wordcard__phonetic">{current.phonetic.us}</div>
          ) : null}
          <button
            type="button"
            className="speak-btn"
            disabled={!canSpeak}
            title={canSpeak ? '播放发音' : '当前设备不支持发音'}
            onClick={() => speak(current.word, settings)}
          >
            <Volume2 size={16} aria-hidden />
            {canSpeak ? '发音' : '设备不支持发音'}
          </button>
          {showHint ? (
            <div className="wordcard__hint" role="status">
              {hintText || '该词暂无词根词缀，可以试着拆一拆拼写'}
            </div>
          ) : null}
        </Card>

        {mode === 'choice' && choices.length === 0 ? (
          // 选项还在生成（词库首次读取）时给骨架，避免出现「有题面没选项」的空窗
          <div className="options" aria-hidden>
            <div className="skeleton" style={{ height: 56 }} />
            <div className="skeleton" style={{ height: 56 }} />
            <div className="skeleton" style={{ height: 56 }} />
            <div className="skeleton" style={{ height: 56 }} />
          </div>
        ) : mode === 'choice' ? (
          <div className="options" role="group" aria-label="选择正确释义">
            {choices.map((id, i) => {
              const w = wordsById.get(id)
              /**
               * 答对：高亮正确项。
               * 答错：只把选错的那项标红，其余变暗 —— **不提前亮出正确答案**。
               * 否则用户第一次选错就看到绿色选项，直接点它即可，
               * 「连续选错 3 次进详情页」这个教学设计就形同虚设了。
               */
              const state = !activePick
                ? ''
                : activePick.correct
                  ? id === current.id
                    ? 'is-correct'
                    : 'is-dimmed'
                  : id === activePick.optionId
                    ? 'is-wrong'
                    : 'is-dimmed'
              return (
                <button
                  type="button"
                  key={id}
                  className={`option ${state}`.trim()}
                  // 只有答对后才锁住选项：答错要能继续尝试，否则「连续选错 3 次」永远触发不了
                  disabled={Boolean(activePick?.correct)}
                  onClick={() => onPickOption(id)}
                >
                  <span className="option__key serif" aria-hidden>
                    {LETTERS[i]}
                  </span>
                  <span className="option__text">{w?.translation ?? '—'}</span>
                  {state === 'is-correct' ? (
                    <>
                      <Check className="option__icon" size={18} aria-hidden />
                      <span className="sr-only">正确答案</span>
                    </>
                  ) : state === 'is-wrong' ? (
                    <>
                      <X className="option__icon" size={18} aria-hidden />
                      <span className="sr-only">你选的答案，不正确</span>
                    </>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="field">
            <label className="field__label" htmlFor="spell-input">
              根据释义拼写单词
            </label>
            <input
              id="spell-input"
              className="input serif"
              style={{ fontSize: 20, letterSpacing: '0.02em' }}
              value={spell}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={Boolean(activePick?.correct)}
              onChange={(e) => setSpell(e.target.value)}
              aria-label="输入单词拼写"
            />
          </div>
        )}
      </div>

      <div className="screen-foot screen-foot--center">
        <Button
          variant="surface"
          onClick={() => setShowHint((v) => !v)}
          aria-expanded={showHint}
          style={{ minWidth: 160 }}
        >
          <Lightbulb size={17} aria-hidden />
          提示
        </Button>
        {mode === 'spell' ? (
          <Button variant="primary" onClick={onSubmitSpell} disabled={!spell.trim()} style={{ minWidth: 160 }}>
            提交
          </Button>
        ) : null}
      </div>

      {pending ? (
        <p className="dim" style={{ textAlign: 'center', fontSize: 12 }} role="status">
          正在打开单词详情…
        </p>
      ) : null}
    </div>
  )
}
