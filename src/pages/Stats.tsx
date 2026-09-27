/**
 * 统计
 *
 * 内容顺序＝用户看数据的顺序：先看总量，再看趋势，最后看质量。
 *   1. 2×2 累计指标（累计学会 / 累计复习 / 平均正确率 / 学习天数）
 *   2. 近 7 天 / 近 30 天趋势（每天两根柱：新学 / 复习）
 *   3. 近 35 天打卡日历（按当日学习量分 4 档）
 *   4. 掌握分布（新学 / 熟悉中 / 熟练 / 已毕业）
 *
 * 数据全部由 daily / progress 派生（页面自己不落库、不缓存），因此重置进度或
 * 导入备份后这里会自动跟着变。完全没有作答记录时整页让位给空态引导，
 * 避免新用户看到一屏「0」。
 */
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChartColumn, Layers } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { useQuery } from '../lib/hooks'
import { formatDayCn, formatDayShort, humanDuration, lastNDays } from '../lib/date'
import { getDailyRange, getMasteryBuckets, getOverallProgress, getTotalStats } from '../lib/derive'
import type { TotalStats } from '../lib/derive'
import type { DailyStat } from '../types'
import { Button, Card, EmptyState, ProgressBar, Section, Segmented } from '../components/ui'

/** 趋势区间：只影响渲染，数据始终来自同一个 35 天窗口 */
type TrendRange = '7' | '30'

/** 日历天数：比最长趋势多 5 天，切换区间时不必重新查库 */
const CAL_DAYS = 35

export default function Stats() {
  const today = useApp((s) => s.today)
  const navigate = useNavigate()
  const [range, setRange] = useState<TrendRange>('7')

  const data = useQuery(
    async () => {
      const [total, overall, buckets, daily] = await Promise.all([
        getTotalStats(),
        getOverallProgress(),
        getMasteryBuckets(),
        getDailyRange(lastNDays(CAL_DAYS, today)),
      ])
      return { loaded: true, total, overall, buckets, daily }
    },
    [today],
    {
      loaded: false,
      total: {
        learned: 0,
        reviews: 0,
        answered: 0,
        correct: 0,
        accuracy: 0,
        durationMs: 0,
        activeDays: 0,
      } as TotalStats,
      overall: { total: 0, learned: 0, percent: 0 },
      buckets: { fresh: 0, learning: 0, familiar: 0, mastered: 0 },
      daily: [] as DailyStat[],
    },
  )

  if (!data.loaded) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 64 }} />
        <div className="skeleton" style={{ height: 132 }} />
        <div className="skeleton" style={{ height: 180 }} />
      </div>
    )
  }

  // 「没有任何作答」才整页空态：只是最近几天没学的话，下面的历史数据仍然有意义
  if (data.total.answered === 0) {
    return (
      <div className="page page--center">
        <EmptyState
          icon={ChartColumn}
          tone="indigo"
          title="还没有学习数据"
          desc="完成一次学习或复习后，这里会出现正确率、打卡日历与掌握分布。"
          action={
            <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
              去首页开始学习
            </Button>
          }
        />
      </div>
    )
  }

  const { total, overall, buckets } = data
  const rangeNum = range === '7' ? 7 : 30
  // data.daily 就是 lastNDays(35, today) 的升序结果，尾部即「近 N 天」
  const trend = data.daily.slice(-rangeNum)
  const maxBar = trend.reduce(
    (m, d) => Math.max(m, d.learnedIds.length, d.reviewedIds.length),
    0,
  )
  const activeInWindow = data.daily.filter(
    (d) => d.learnedIds.length + d.reviewedIds.length > 0,
  ).length
  const accuracyPct = Math.round(total.accuracy * 100)

  /** 柱高百分比：0 交给 CSS 的 min-height，非 0 至少 6% 保证看得见 */
  const barHeight = (v: number) => (v <= 0 ? 0 : Math.max(6, Math.round((v / Math.max(1, maxBar)) * 100)))

  const mastery = [
    { key: 'fresh', label: '新学', value: buckets.fresh, color: 'var(--tone-indigo)' },
    { key: 'learning', label: '熟悉中', value: buckets.learning, color: 'var(--tone-cyan)' },
    { key: 'familiar', label: '熟练', value: buckets.familiar, color: 'var(--tone-violet)' },
    { key: 'mastered', label: '已毕业', value: buckets.mastered, color: 'var(--tone-emerald)' },
  ]
  const masteryTotal = mastery.reduce((sum, m) => sum + m.value, 0)

  const masteryLabel = mastery.map((m) => `${m.label} ${m.value}`).join('，')

  return (
    <div className="page">
      <header className="section__head">
        <h1 className="section__title">统计</h1>
        <div className="section__more num">{formatDayCn(today)}</div>
      </header>

      {/* 累计指标 */}
      <div className="metric-grid">
        <Metric value={total.learned} unit="词" label="累计学会" />
        <Metric value={total.reviews} unit="次" label="累计复习" />
        <Metric
          value={accuracyPct}
          unit="%"
          label="平均正确率"
          hint={`共作答 ${total.answered} 次`}
        />
        <Metric
          value={total.activeDays}
          unit="天"
          label="学习天数"
          hint={`累计用时 ${humanDuration(total.durationMs)}`}
        />
      </div>

      {/* 全部词书总进度：给「累计学会」一个分母 */}
      <Card className="card--pad">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span className="muted">全部词书总进度</span>
          <span className="num" style={{ fontWeight: 700 }}>
            {Math.round(overall.percent * 100)}%
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={overall.percent} size="lg" label="全部词书总进度" />
        </div>
        <p className="dim" style={{ fontSize: 12, marginTop: 6 }}>
          已学 {overall.learned} / {overall.total} 词（多本词书共有的词只算一次）
        </p>
      </Card>

      {/* 趋势 */}
      <Section title="学习趋势" icon={ChartColumn} tone="cyan">
        <Card className="card--pad">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: '近 7 天' },
                { value: '30', label: '近 30 天' },
              ]}
              ariaLabel="趋势时间范围"
            />
            <div className="legend">
              <span className="legend__item">
                <span className="legend__dot" aria-hidden />
                新学
              </span>
              <span className="legend__item">
                <span className="legend__dot legend__dot--review" aria-hidden />
                复习
              </span>
            </div>
          </div>

          {maxBar === 0 ? (
            <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>
              近 {rangeNum} 天没有学习记录，换一段时间看看。
            </p>
          ) : (
            <div className="trend" style={{ marginTop: 12, gap: rangeNum === 7 ? 6 : 3 }}>
              {trend.map((d) => {
                const learned = d.learnedIds.length
                const reviewed = d.reviewedIds.length
                const text = `${formatDayCn(d.day)}：新学 ${learned} 词，复习 ${reviewed} 词`
                return (
                  <div
                    className="trend__col"
                    key={d.day}
                    role="img"
                    aria-label={text}
                    title={text}
                    style={{ minWidth: 0 }}
                  >
                    <div className="trend__bars" style={{ gap: rangeNum === 7 ? 3 : 2 }}>
                      <div
                        className="trend__bar"
                        style={{ height: `${barHeight(learned)}%`, width: rangeNum === 7 ? undefined : 5 }}
                      />
                      <div
                        className="trend__bar trend__bar--review"
                        style={{ height: `${barHeight(reviewed)}%`, width: rangeNum === 7 ? undefined : 5 }}
                      />
                    </div>
                    {/* 30 天视图不逐柱标日期：列宽只有几像素，文字会压到相邻柱子上 */}
                    <div className="trend__label">{rangeNum === 7 ? formatDayShort(d.day) : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
          {maxBar === 0 ? null : (
            <div
              className="legend"
              style={{ marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }}
            >
              {rangeNum === 30 ? <span>{formatDayShort(trend[0].day)}</span> : <span aria-hidden />}
              <span className="dim">单日最高 {maxBar} 词</span>
              {rangeNum === 30 ? (
                <span>{formatDayShort(trend[trend.length - 1].day)}</span>
              ) : (
                <span aria-hidden />
              )}
            </div>
          )}
        </Card>
      </Section>

      {/* 打卡日历 */}
      <Section title="打卡日历" icon={CalendarDays} tone="amber">
        <Card className="card--pad">
          <div className="calendar">
            {data.daily.map((d) => {
              const count = d.learnedIds.length + d.reviewedIds.length
              const level = heatLevel(count)
              const isToday = d.day === today
              const text = `${formatDayCn(d.day)}：学习 ${count} 词${isToday ? '（今天）' : ''}`
              return (
                <div
                  key={d.day}
                  className={`cal-cell${level ? ` is-l${level}` : ''}${isToday ? ' is-today' : ''}`}
                  role="img"
                  aria-label={text}
                  title={text}
                >
                  {Number(d.day.slice(8, 10))}
                </div>
              )
            })}
          </div>
          <div className="legend" style={{ marginTop: 12, alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>少</span>
            <span className="cal-cell is-l1" style={{ width: 12, height: 12 }} aria-hidden />
            <span className="cal-cell is-l2" style={{ width: 12, height: 12 }} aria-hidden />
            <span className="cal-cell is-l3" style={{ width: 12, height: 12 }} aria-hidden />
            <span className="cal-cell is-l4" style={{ width: 12, height: 12 }} aria-hidden />
            <span>多</span>
          </div>
          <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>
            近 {CAL_DAYS} 天里有 {activeInWindow} 天留下了学习记录，灰色表示当天没有学习。
          </p>
        </Card>
      </Section>

      {/* 掌握分布 */}
      <Section title="掌握分布" icon={Layers} tone="violet">
        <Card className="card--pad">
          {masteryTotal === 0 ? (
            <p className="dim" style={{ fontSize: 13 }}>
              还没有学过的单词。
            </p>
          ) : (
            <>
              <div
                className="progress progress--lg"
                style={{ display: 'flex' }}
                role="img"
                aria-label={`掌握分布：${masteryLabel}`}
              >
                {mastery.map((m) => (
                  <div
                    key={m.key}
                    className="progress__fill"
                    // borderRadius: 0：每段自己不做圆角，整条的公允圆角交给外层 .progress 裁切
                    style={{ width: `${(m.value / masteryTotal) * 100}%`, background: m.color, borderRadius: 0 }}
                  />
                ))}
              </div>
              <div className="legend" style={{ marginTop: 12, flexWrap: 'wrap', rowGap: 8 }}>
                {mastery.map((m) => (
                  <span className="legend__item" key={m.key}>
                    <span className="legend__dot" style={{ background: m.color }} aria-hidden />
                    {m.label} <b className="num">{m.value}</b>
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </Section>
    </div>
  )
}

/** 2×2 指标卡 */
function Metric({
  value,
  unit,
  label,
  hint,
}: {
  value: ReactNode
  unit: string
  label: string
  hint?: string
}) {
  return (
    <div className="metric">
      <div className="metric__value num">
        {value}
        <span className="metric__unit">{unit}</span>
      </div>
      <div className="metric__label">{label}</div>
      {hint ? (
        <div className="dim" style={{ fontSize: 11 }}>
          {hint}
        </div>
      ) : null}
    </div>
  )
}

/**
 * 当日学习量分档（学会 + 复习的单词数）。
 * 用固定门槛而不是「按窗口最大值等比」：这样同一档在 7 天与 30 天视图里含义一致，
 * 也不会因为某天暴学一次就把其余天全压成浅色。
 */
function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count < 10) return 1
  if (count < 25) return 2
  if (count < 50) return 3
  return 4
}
