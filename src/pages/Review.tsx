/**
 * 单词复习（翻转卡）
 *
 * 关键实现约束（对应 docs/LOGIC_FLOW.md §5）：
 *  - 当前卡片 = 复习队列的第一个词；「认识」出队、「不认识」移到队尾，卡片自动换下一张。
 *  - 同一个词当天最多出现 3 轮，第 3 次「不认识」强制出队并记为明天再练 ——
 *    没有这个上限，用户一直点「不认识」就永远结束不了，这是 v1 的死循环。
 *  - 出队一律按 wordId，避免「跨天时删错词」。
 *  - 卡片锁在「换到下一个词」时才释放，防止连点把同一张卡记两次。
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RotateCcw, Volume2 } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { EMPTY_LIST, useQuery } from '../lib/hooks'
import { getKindStats, getQueueWords, hasTask, isQueueDone, queuePercent } from '../lib/derive'
import { db, getQueue } from '../db'
import { ensureDailyTask } from '../lib/tasks'
import { commitReview } from '../lib/session'
import { speak, speechSupported } from '../lib/speech'
import type { SessionQueue, Word } from '../types'
import { Button, EmptyState, IconButton, ProgressBar } from '../components/ui'
import ResultScreen from '../components/ResultScreen'

export default function Review() {
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const flash = useApp((s) => s.flash)
  const bookId = settings.currentBookId
  const navigate = useNavigate()

  const view = useQuery(
    async () => {
      const queue = await getQueue(today, 'review', bookId)
      const words = await getQueueWords(queue)
      const book = await db.books.get(bookId)
      const stats = await getKindStats(today, 'review')
      return { loaded: true, queue, words, bookName: book?.name ?? '', stats }
    },
    [today, bookId],
    {
      loaded: false,
      queue: undefined as SessionQueue | undefined,
      words: EMPTY_LIST as Word[],
      bookName: '',
      stats: { answered: 0, correct: 0, durationMs: 0, accuracy: 0 },
    },
  )

  const queue = view.queue
  const current = view.words[0]
  const target = queue?.target ?? 0
  const done = queue?.done ?? 0
  const pct = Math.round(queuePercent(queue) * 100)

  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const headRef = useRef<string | undefined>(undefined)
  const unlockRef = useRef<number | null>(null)
  const shownAtRef = useRef(Date.now())

  useEffect(() => {
    if (view.loaded && !view.queue) void ensureDailyTask(bookId, 'review', today)
  }, [view.loaded, view.queue, bookId, today])

  // 换词：翻回正面、重新计时、释放卡片锁
  useEffect(() => {
    setFlipped(false)
    shownAtRef.current = Date.now()
    if (headRef.current !== current?.id) {
      headRef.current = current?.id
      setBusy(false)
      if (unlockRef.current) window.clearTimeout(unlockRef.current)
    }
  }, [current?.id])

  useEffect(
    () => () => {
      if (unlockRef.current) window.clearTimeout(unlockRef.current)
    },
    [],
  )

  const act = async (result: 'known' | 'forgotten') => {
    if (busy || !current) return
    setBusy(true)
    // 兜底解锁：队列只剩一个词时队头不会变，锁必须自己放开
    unlockRef.current = window.setTimeout(() => setBusy(false), 900)

    const elapsed = Math.min(Date.now() - shownAtRef.current, 120_000)
    const r = await commitReview(today, bookId, current.id, result, elapsed)
    if (!r.ok) {
      if (r.reason === 'stale-day') {
        flash('已经跨天了，请回首页重新开始今天的任务', 'warn')
        navigate(ROUTES.home)
      } else {
        setBusy(false)
      }
      return
    }
    if (result === 'forgotten') {
      if (r.forced) flash('这个词今天先放下，明天会优先出现')
      else if (r.repeated) flash('再记一次，这是今天最后一个词')
      else flash('已排到队尾')
    }
  }

  // 键盘：空格/回车翻卡，←不认识，→认识
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((v) => !v)
      } else if (e.key === 'ArrowLeft') void act('forgotten')
      else if (e.key === 'ArrowRight') void act('known')
      else if (e.key === 'Escape') navigate(ROUTES.home)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!view.loaded) {
    return (
      <div className="screen">
        <div className="skeleton" style={{ height: 44 }} />
        <div className="skeleton" style={{ height: 260, marginTop: 'auto' }} />
      </div>
    )
  }

  if (queue && isQueueDone(queue)) {
    return (
      <div className="screen">
        <ResultScreen
          title="今日复习已完成 🎉"
          desc="到期的单词都过了一遍，记住的会隔更久再出现。"
          count={done}
          durationMs={view.stats.durationMs}
          accuracy={view.stats.accuracy}
          onHome={() => navigate(ROUTES.home)}
        />
      </div>
    )
  }

  if (!hasTask(queue) || !current) {
    const noLimit = settings.dailyReviewLimit <= 0
    return (
      <div className="screen page--center">
        <EmptyState
          icon={RotateCcw}
          tone="violet"
          title={noLimit ? '每日复习上限为 0' : '今天没有需要复习的单词'}
          desc={
            noLimit
              ? '可以到「学习计划」里把每日复习上限调大一些。'
              : '学过的单词会在合适的间隔后回到这里，明天再来看看。'
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

  return (
    <div className="screen">
      <div className="study-top">
        <div className="study-top__row">
          <IconButton icon={ChevronLeft} label="返回首页" onClick={() => navigate(ROUTES.home)} />
          <span className="study-top__text">
            今日要复习 <b className="study-top__count num">{target}</b> 个单词，已复习{' '}
            <b className="study-top__count num">{done}</b>
          </span>
          <span className="study-top__pct num">{pct}%</span>
        </div>
        <ProgressBar value={queuePercent(queue)} label="今日复习进度" size="thin" />
      </div>

      <div className="study-stage">
        <div className="flipwrap">
          <div
            className={`flipcard${flipped ? ' is-flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={flipped ? '收起释义' : '查看释义'}
            onClick={() => setFlipped((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setFlipped((v) => !v)
              }
            }}
          >
            {/* 正面：词书 + 单词 + 音标 + 发音 */}
            <div className="flipcard__face">
              <div className="flipcard__book">{view.bookName}</div>
              <div className="flipcard__word">{current.word}</div>
              {current.phonetic?.us ? (
                <div className="flipcard__phonetic">{current.phonetic.us}</div>
              ) : null}
              <button
                type="button"
                className="speak-btn speak-btn--round"
                disabled={!canSpeak}
                aria-label={canSpeak ? '播放发音' : '当前设备不支持发音'}
                title={canSpeak ? '播放发音' : '当前设备不支持发音'}
                onClick={(e) => {
                  e.stopPropagation()
                  speak(current.word, settings)
                }}
              >
                <Volume2 size={19} aria-hidden />
              </button>
              <div className="flipcard__tip">点击卡片查看释义</div>
            </div>

            {/* 背面：释义 + 例句 */}
            <div className="flipcard__face flipcard__face--back">
              <div className="flipcard__book">{current.word}</div>
              <div className="flipcard__scroll">
                <div className="flipcard__meaning">
                  {current.pos ? (
                    <span className="chip chip--indigo" style={{ marginRight: 8 }}>
                      {current.pos}
                    </span>
                  ) : null}
                  {current.translation}
                </div>
                {current.examples?.[0] ? (
                  <div className="example">
                    <div className="example__en display">{current.examples[0].en}</div>
                    {current.examples[0].zh ? (
                      <div className="example__zh">{current.examples[0].zh}</div>
                    ) : null}
                  </div>
                ) : null}
                {current.etymology?.roots?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {current.etymology.roots.map((r, i) => (
                      <span className="chip chip--amber" key={i}>
                        {r}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flipcard__tip">点击卡片返回正面</div>
            </div>
          </div>
        </div>
      </div>

      <div className="screen-foot screen-foot--split">
        <Button variant="outline" size="lg" onClick={() => void act('forgotten')} disabled={busy}>
          不认识
        </Button>
        <Button variant="primary" size="lg" onClick={() => void act('known')} disabled={busy}>
          认识
        </Button>
      </div>
      <p className="dim" style={{ textAlign: 'center', fontSize: 12 }}>
        不认识的词会排到队尾，稍后再出现一次
      </p>
    </div>
  )
}
