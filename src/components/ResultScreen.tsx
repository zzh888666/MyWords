/**
 * 今日任务完成页
 *
 * 学习页与复习页共用。三件事：告诉用户「今天这件事做完了」、
 * 给一组真实的数字（不夸张、不虚构）、给一个明确的下一步（回首页）。
 */
import { CircleCheck } from 'lucide-react'
import { Button } from './ui'
import { humanDuration } from '../lib/date'

export default function ResultScreen({
  title,
  desc,
  count,
  durationMs,
  accuracy,
  onHome,
}: {
  title: string
  desc: string
  count: number
  durationMs: number
  /** 0~1，作答为 0 次时不显示 */
  accuracy: number
  onHome: () => void
}) {
  return (
    <div className="result">
      <div className="result__mark" aria-hidden>
        <CircleCheck size={42} />
      </div>
      <h1 className="result__title">{title}</h1>
      <p className="result__desc">{desc}</p>
      <div className="result__stats">
        <div className="stat">
          <div className="stat__value num">{count}</div>
          <div className="stat__label">完成词数</div>
        </div>
        <div className="stat">
          <div className="stat__value num">{humanDuration(durationMs)}</div>
          <div className="stat__label">用时</div>
        </div>
        <div className="stat">
          <div className="stat__value num">{Math.round(accuracy * 100)}%</div>
          <div className="stat__label">正确率</div>
        </div>
      </div>
      <Button variant="primary" size="lg" onClick={onHome} style={{ marginTop: 8, minWidth: 200 }}>
        返回首页
      </Button>
    </div>
  )
}
