/**
 * 学习成就
 *
 * 徽章完全由统计数据派生（见 lib/achievements.ts），所以重置进度、导入备份之后
 * 状态自动一致，不需要单独维护「解锁记录」。
 *
 * 排序即 DEFS 的定义顺序（由易到难），未解锁的也照常显示：让用户知道还有什么可拿，
 * 并用 current / target 告诉他差多少。
 */
import { CircleCheck, Lock } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { useGo, useGoBack } from '../lib/nav'
import { useQuery } from '../lib/hooks'
import { computeAchievements } from '../lib/achievements'
import type { Achievement } from '../lib/achievements'
import { getMasteryBuckets, getOverallProgress, getStreak, getTotalStats } from '../lib/derive'
import { Button, Card, IconBadge, ProgressBar, TopBar } from '../components/ui'

export default function Achievements() {
  const today = useApp((s) => s.today)
  const go = useGo()
  // 学习成就从「首页」和「我的」都能进来，返回时回到来的那一页
  const goBack = useGoBack(ROUTES.home)

  const data = useQuery(
    async () => {
      const [total, overall, streak, buckets] = await Promise.all([
        getTotalStats(),
        getOverallProgress(),
        getStreak(today),
        getMasteryBuckets(),
      ])
      const list = computeAchievements({
        learned: total.learned,
        reviews: total.reviews,
        streak,
        accuracy: total.accuracy,
        answered: total.answered,
        overallPercent: overall.percent,
        mastered: buckets.mastered,
        activeDays: total.activeDays,
      })
      return { loaded: true, list, unlocked: list.filter((a) => a.unlocked).length }
    },
    [today],
    { loaded: false, list: [] as Achievement[], unlocked: 0 },
  )

  if (!data.loaded) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 64 }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    )
  }

  const all = data.list.length
  const percent = all ? data.unlocked / all : 0

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <TopBar title="学习成就" onBack={goBack} />

      <Card ink className="hero">
        <div className="hero__top">
          <div>
            <div className="hero__name">
              已解锁 {data.unlocked} / {all}
            </div>
            <div className="hero__meta">
              {data.unlocked === all ? '全部徽章已集齐' : '继续学习就能拿到剩下的徽章'}
            </div>
          </div>
        </div>
        <div>
          <div className="hero__foot">
            <span className="hero__pct num">{Math.round(percent * 100)}%</span>
            <span>还差 {all - data.unlocked} 枚</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <ProgressBar
              value={percent}
              onInk
              size="lg"
              label={`已解锁 ${data.unlocked} / ${all} 枚徽章`}
            />
          </div>
        </div>
      </Card>

      <div className="badge-grid">
        {data.list.map((a) => (
          <Badge key={a.id} achievement={a} />
        ))}
      </div>

      {data.unlocked === 0 ? (
        <Button variant="primary" block onClick={() => go(ROUTES.home, { replace: true })}>
          去首页开始学习
        </Button>
      ) : null}
    </div>
  )
}

function Badge({ achievement }: { achievement: Achievement }) {
  const { name, desc, icon, tone, current, target, unlocked } = achievement
  const percent = target > 0 ? current / target : 0

  return (
    <div className={`badge${unlocked ? '' : ' is-locked'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconBadge icon={icon} tone={tone} />
        <span className="badge__name" style={{ flex: 1, minWidth: 0 }}>
          {name}
        </span>
        {unlocked ? (
          <CircleCheck size={17} color="var(--ok)" aria-hidden />
        ) : (
          <Lock size={15} className="dim" aria-hidden />
        )}
      </div>

      <div className="badge__desc">{desc}</div>

      {unlocked ? (
        <span className="chip chip--ok" style={{ alignSelf: 'flex-start' }}>
          <CircleCheck size={14} aria-hidden />
          已解锁
        </span>
      ) : (
        <>
          <ProgressBar value={percent} label={`${name}：${current} / ${target}`} />
          <div className="dim num" style={{ fontSize: 12 }}>
            {current} / {target}
          </div>
        </>
      )}
    </div>
  )
}
