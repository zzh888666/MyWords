/**
 * 学习计划
 *
 * 这页只改三个值：每日新词数、每日复习上限、默认学习方式，外加一个跳去「词书管理」的入口。
 *
 * 关键语义（docs/LOGIC_FLOW.md §2.5 / §7.2）：
 *  - 保存走 patchSettings；它会调用 rebuildTodayTasks，把今天「还没开始」（done === 0）的队列
 *    删掉重建，让新设置当天就生效；
 *  - 已经开始的任务（done > 0）保持冻结 —— 进度不能倒退，做过的事不能被改；
 *  - 所以页面必须把这件事说清楚，否则用户会以为「改了没生效」或者「进度被重置了」。
 *
 * 页面用本地 state 暂存，点「保存计划」才落库；这是唯一会写设置的地方。
 */
import { useState, type ReactNode } from 'react'
import { BookOpen, ChevronRight, Info, ListChecks, Target } from 'lucide-react'
import { ROUTES } from '../routes'
import { useGo, useGoBack } from '../lib/nav'
import { useApp } from '../store/app'
import { useQuery } from '../lib/hooks'
import { getBookProgress, getLearnedIds, getUnlearnedIds } from '../lib/derive'
import type { BookProgress } from '../lib/derive'
import { getQueue } from '../db'
import { learnTargetFor, reviewTargetFor } from '../lib/srs'
import type { SessionQueue, Settings, StudyMode } from '../types'
import { Button, Card, ListRow, Section, Segmented, Stepper, TopBar } from '../components/ui'

/** 队列状态文案：把「哪些会被重排、哪些不会」直接写在界面上 */
function queueStateText(q: SessionQueue | undefined): string {
  if (!q) return '今天还没生成，保存后会按新设置生成'
  if (q.done > 0) return `已开始 ${q.done} / ${q.target}，保持原样`
  return '还没开始，会按新设置重新安排'
}

/** 子页面外壳：贴顶的 TopBar + 正常留出底部标签栏间距的内容区 */
function PageShell({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 'var(--page-max)',
        margin: '0 auto',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar title={title} onBack={onBack} />
      <div className="page" style={{ paddingTop: 4 }}>
        {children}
      </div>
    </div>
  )
}

export default function Plan() {
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const patch = useApp((s) => s.patchSettings)
  const flash = useApp((s) => s.flash)
  const goBack = useGoBack(ROUTES.home)
  const go = useGo()

  const bookId = settings.currentBookId

  const [dailyNew, setDailyNew] = useState(settings.dailyNew)
  const [dailyReviewLimit, setDailyReviewLimit] = useState(settings.dailyReviewLimit)
  const [studyMode, setStudyMode] = useState<StudyMode>(settings.studyMode)
  const [busy, setBusy] = useState(false)

  const view = useQuery(
    async () => {
      const [book, unlearned, learned, learn, review] = await Promise.all([
        getBookProgress(bookId),
        getUnlearnedIds(bookId),
        getLearnedIds(bookId),
        getQueue(today, 'learn', bookId),
        getQueue(today, 'review', bookId),
      ])
      return {
        book,
        unlearned: unlearned.length,
        learned: learned.length,
        learn,
        review,
      }
    },
    [today, bookId],
    {
      book: null as BookProgress | null,
      unlearned: 0,
      learned: 0,
      learn: undefined as SessionQueue | undefined,
      review: undefined as SessionQueue | undefined,
    },
  )

  const dirty =
    dailyNew !== settings.dailyNew ||
    dailyReviewLimit !== settings.dailyReviewLimit ||
    studyMode !== settings.studyMode

  const onSave = async () => {
    if (busy) return
    if (!dirty) {
      flash('计划没有变化')
      return
    }
    // 只提交真正改过的字段：没改的字段不写库，也就不会白白重建今天的队列
    const next: Partial<Settings> = {}
    if (dailyNew !== settings.dailyNew) next.dailyNew = dailyNew
    if (dailyReviewLimit !== settings.dailyReviewLimit) next.dailyReviewLimit = dailyReviewLimit
    if (studyMode !== settings.studyMode) next.studyMode = studyMode

    setBusy(true)
    try {
      await patch(next)
      flash('学习计划已保存，今天还没开始的任务已按新设置调整', 'success')
    } catch {
      flash('保存失败，请重试', 'warn')
    } finally {
      setBusy(false)
    }
  }

  const learnPreview = learnTargetFor(view.unlearned, dailyNew)
  const reviewPreview = reviewTargetFor(view.learned, dailyReviewLimit)

  return (
    <PageShell title="学习计划" onBack={goBack}>
      {/* 每日任务量 */}
      <Section title="每日任务量" icon={Target} tone="indigo">
        <Card className="card--pad">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <span className="field__label">每日学习数量</span>
              <Stepper
                value={dailyNew}
                onChange={setDailyNew}
                min={0}
                max={200}
                step={5}
                suffix="词"
              />
              <span className="dim" style={{ fontSize: 12, lineHeight: 1.6 }}>
                设为 0 表示不安排新词。还没开始的今日任务会立刻重排，已经开始的不受影响。
              </span>
            </div>

            <div className="field">
              <span className="field__label">每日复习上限</span>
              <Stepper
                value={dailyReviewLimit}
                onChange={setDailyReviewLimit}
                min={0}
                max={500}
                step={10}
                suffix="词"
              />
              <span className="dim" style={{ fontSize: 12, lineHeight: 1.6 }}>
                设为 0 表示今天不复习。实际数量还会受到期单词数的限制，不一定能达到上限。
              </span>
            </div>
          </div>
        </Card>
      </Section>

      {/* 学习方式 */}
      <Section title="学习方式" icon={ListChecks} tone="violet">
        <Card className="card--pad">
          <div className="field">
            <span className="field__label">新词怎么学</span>
            <Segmented
              value={studyMode}
              onChange={setStudyMode}
              ariaLabel="学习方式"
              options={[
                { value: 'choice', label: '选择题' },
                { value: 'spell', label: '拼写' },
              ]}
            />
            <span className="dim" style={{ fontSize: 12, lineHeight: 1.6 }}>
              {studyMode === 'choice'
                ? '看单词，从四个释义里选一个。'
                : '看释义，把单词拼出来；拼错会按答错处理。'}
            </span>
          </div>
        </Card>
      </Section>

      {/* 当前词书 */}
      <Section title="当前词书" icon={BookOpen} tone="amber">
        <Card className="card--pad">
          <div className="list">
            <ListRow
              icon={BookOpen}
              tone={view.book?.book.color ?? 'amber'}
              title={view.book?.book.name ?? '还没有选择词书'}
              sub={
                view.book
                  ? `${view.book.book.tagline ?? '当前词书'} · 已学 ${view.book.learned} / ${view.book.total} 词`
                  : '去词书管理里选一本'
              }
              trail={<ChevronRight size={16} aria-hidden />}
              onClick={() => go(ROUTES.books)}
            />
          </div>
        </Card>
      </Section>

      {/* 改动如何生效 */}
      <Section title="改动如何生效" icon={Info} tone="cyan">
        <Card className="card--pad">
          <p style={{ fontSize: 14, lineHeight: 1.8 }}>
            保存后，今天
            <b>「还没开始」</b>
            的任务会立刻按新设置重新安排；
            <b>已经开始</b>
            的任务保持原样，进度不会倒退。
          </p>
          <hr className="divider" style={{ margin: '14px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              今日学习任务：{queueStateText(view.learn)}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              今日复习任务：{queueStateText(view.review)}
            </div>
            <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
              按当前设置：今天计划新词 {learnPreview} 个，复习上限 {reviewPreview} 个
            </div>
          </div>
        </Card>
      </Section>

      <div className="screen-foot">
        <Button variant="primary" size="lg" block onClick={() => void onSave()} disabled={busy}>
          保存计划
        </Button>
      </div>
    </PageShell>
  )
}
