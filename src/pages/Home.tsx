/**
 * 首页
 *
 * 三块信息，顺序就是用户的决策顺序：
 *   1. 我在学哪本书、学到哪了（墨蓝块）
 *   2. 今天要做什么（学习 / 复习两张任务卡，点进去就是全部流程）
 *   3. 坚持得怎么样（连续打卡）＋ 所有词书的完成度
 *
 * 「按钮点了没反应」是这个页面最容易犯的错，所以每个入口都按
 * docs/LOGIC_FLOW.md §3.1 / §3.2 区分了四种「没有任务」的原因，各给各的提示。
 */
import { useGo } from '../lib/nav'
import { BookMarked, CalendarDays, Check, ChevronRight, Flame, GraduationCap, RotateCcw } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { useQuery } from '../lib/hooks'
import { formatDayCn, weekdayCn } from '../lib/date'
import { db, getQueue } from '../db'
import { ensureDailyTask } from '../lib/tasks'
import {
  getBookProgress,
  getAllBookProgress,
  getLearnedIds,
  getStreak,
  getUnlearnedIds,
  isQueueDone,
  queuePercent,
} from '../lib/derive'
import { Button, Card, IconBadge, ProgressBar, Section } from '../components/ui'

export default function Home() {
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const flash = useApp((s) => s.flash)
  const go = useGo()
  const bookId = settings.currentBookId

  const data = useQuery(
    async () => {
      const [learn, review, books, streak, current, todayStat, learnedIds, unlearnedIds] =
        await Promise.all([
          getQueue(today, 'learn', bookId),
          getQueue(today, 'review', bookId),
          getAllBookProgress(),
          getStreak(today),
          getBookProgress(bookId),
          db.daily.get(today),
          getLearnedIds(bookId),
          getUnlearnedIds(bookId),
        ])
      return {
        loaded: true,
        learn,
        review,
        books,
        streak,
        current,
        learned: learnedIds.length,
        unlearned: unlearnedIds.length,
        learnedToday: todayStat?.learnedIds.length ?? 0,
        reviewedToday: todayStat?.reviewedIds.length ?? 0,
      }
    },
    [today, bookId],
    {
      loaded: false,
      learn: undefined,
      review: undefined,
      books: [] as Awaited<ReturnType<typeof getAllBookProgress>>,
      streak: 0,
      current: null as Awaited<ReturnType<typeof getBookProgress>>,
      learned: 0,
      unlearned: 0,
      learnedToday: 0,
      reviewedToday: 0,
    },
  )

  /** 学习入口：区分「没设置」「书学完了」「今天做完了」三种“没任务” */
  const onLearn = async () => {
    const q = await ensureDailyTask(bookId, 'learn', today)
    if (q.target === 0) {
      if (settings.dailyNew <= 0) flash('你已把每日学习数量设为 0，可在学习计划里调整', 'warn')
      else if (data.unlearned === 0) flash('这本书的单词已经全部学完啦 🎉', 'success')
      else flash('今日暂无学习任务，明日再来吧！')
      return
    }
    if (isQueueDone(q)) {
      flash('今日学习已完成 🎉', 'success')
      return
    }
    go(ROUTES.study)
  }

  /** 复习入口：区分「上限为 0」「还没学过词」「今天没有到期的词」 */
  const onReview = async () => {
    const q = await ensureDailyTask(bookId, 'review', today)
    if (q.target === 0) {
      if (settings.dailyReviewLimit <= 0) flash('你已把每日复习上限设为 0，可在学习计划里调整', 'warn')
      else if (data.learned === 0) flash('还没有学过的单词，先去学几个新词吧')
      else flash('今天没有到期的单词，明天再来')
      return
    }
    if (isQueueDone(q)) {
      flash('今日复习已完成 🎉', 'success')
      return
    }
    go(ROUTES.review)
  }

  const learn = data.learn
  const review = data.review
  const learnDone = isQueueDone(learn)
  const reviewDone = isQueueDone(review)
  const book = data.current
  const dateText = `${formatDayCn(today)} ${weekdayCn(today)}`

  return (
    <div className="page">
      <header className="home-head">
        <div>
          <div className="home-head__hi">你好，{settings.nickname}</div>
          <div className="home-head__date">{dateText} · 今天也来记几个词</div>
        </div>
        <button
          type="button"
          className="avatar"
          aria-label="打开我的页面"
          onClick={() => go(ROUTES.profile)}
        >
          <span aria-hidden>{settings.avatar}</span>
        </button>
      </header>

      {/* 当前词书 */}
      <Card ink className="hero">
        <div className="hero__top">
          <div>
            <div className="hero__name">{book?.book.name ?? '—'}</div>
            <div className="hero__meta">{book?.book.tagline ?? '当前词书'}</div>
          </div>
          <button type="button" className="hero__change" onClick={() => go(ROUTES.books)}>
            切换词书
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>
        <div>
          <div className="hero__foot">
            <span className="hero__pct num">{Math.round((book?.percent ?? 0) * 100)}%</span>
            <span>
              已学 {book?.learned ?? 0} / {book?.total ?? 0} 词
              {book && book.mastered > 0 ? ` · 毕业 ${book.mastered}` : ''}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <ProgressBar
              value={book?.percent ?? 0}
              onInk
              size="lg"
              label={`《${book?.book.name ?? ''}》学习进度`}
            />
          </div>
        </div>
      </Card>

      {/* 今日任务 */}
      <Section title="今日任务" icon={CalendarDays} tone="cyan">
        <div className="task-grid">
          <button type="button" className="task-card" onClick={onLearn}>
            <div className="task-card__top">
              <IconBadge icon={GraduationCap} tone="indigo" />
              <span className="task-card__name">学习</span>
            </div>
            {learnDone ? (
              <div className="task-card__done">
                <Check size={15} aria-hidden />
                今日已完成
              </div>
            ) : (
              <div className="task-card__count num">
                {learn ? Math.max(0, learn.target - learn.done) : (data.loaded ? 0 : '—')}
                <span className="task-card__unit">词待学</span>
              </div>
            )}
            <ProgressBar
              value={queuePercent(learn)}
              label="今日学习进度"
              size="md"
            />
            <div className="task-card__foot num">
              {learn ? `${learn.done} / ${learn.target}` : '—'}
            </div>
          </button>

          <button type="button" className="task-card" onClick={onReview}>
            <div className="task-card__top">
              <IconBadge icon={RotateCcw} tone="violet" />
              <span className="task-card__name">复习</span>
            </div>
            {reviewDone ? (
              <div className="task-card__done">
                <Check size={15} aria-hidden />
                今日已完成
              </div>
            ) : (
              <div className="task-card__count num">
                {review ? Math.max(0, review.target - review.done) : (data.loaded ? 0 : '—')}
                <span className="task-card__unit">词待复习</span>
              </div>
            )}
            <ProgressBar value={queuePercent(review)} label="今日复习进度" size="md" />
            <div className="task-card__foot num">
              {review ? `${review.done} / ${review.target}` : '—'}
            </div>
          </button>
        </div>
      </Section>

      {/* 坚持 */}
      <Card className="streak">
        <IconBadge icon={Flame} tone="rose" size="lg" />
        <div>
          <div className="streak__value num">{data.streak} 天</div>
          <div className="streak__label">连续打卡</div>
        </div>
        <div className="streak__right num">
          今日已学 {data.learnedToday} · 已复习 {data.reviewedToday}
        </div>
      </Card>

      {/* 词书完成度 */}
      <Section
        title="词书完成度"
        icon={BookMarked}
        tone="amber"
        more={
          <button type="button" onClick={() => go(ROUTES.books)} style={{ color: 'inherit' }}>
            全部词书
            <ChevronRight size={13} aria-hidden style={{ verticalAlign: -2 }} />
          </button>
        }
      >
        <Card className="card--pad">
          <div className="list">
            {data.books.map((b) => (
              <div className={`book-row${b.book.id === bookId ? ' is-current' : ''}`} key={b.book.id}>
                <IconBadge icon={BookMarked} tone={b.book.color ?? 'indigo'} />
                <div className="book-row__main">
                  <div className="book-row__name">{b.book.name}</div>
                  <div className="book-row__meta num">
                    已学 {b.learned} / {b.total} 词
                  </div>
                  <ProgressBar value={b.percent} label={`《${b.book.name}》完成度`} />
                </div>
                <div className="book-row__pct num">{Math.round(b.percent * 100)}%</div>
              </div>
            ))}
            {!data.books.length ? <p className="dim">还没有词书</p> : null}
          </div>
        </Card>
      </Section>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" block onClick={() => go(ROUTES.achievements)}>
          学习成就
        </Button>
        <Button variant="ghost" block onClick={() => go(ROUTES.plan)}>
          学习计划
        </Button>
      </div>
    </div>
  )
}
