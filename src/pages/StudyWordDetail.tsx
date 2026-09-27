/**
 * 学习流程的单词详情页
 *
 * 「下一题」是整条学习链路上**唯一**的写库点：
 *   答对 → 移出队列 + 记为已学会；连错 3 次 → 移到队尾（或第 3 轮强制结算）。
 * 「返回」= 不提交、位置不变，所以误点不会丢词、也不会记错进度。
 * 写入永远发生在跳转之前（先落盘、后跳转）。
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Volume2 } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp, useStudySession } from '../store/app'
import { useQuery } from '../lib/hooks'
import { getWord } from '../lib/derive'
import { commitLearn, commitRequeue } from '../lib/session'
import { speak, speechSupported } from '../lib/speech'
import WordBody from '../components/WordBody'
import { Button, Card, IconButton, TopBar } from '../components/ui'

export default function StudyWordDetail() {
  const { wordId = '' } = useParams()
  const navigate = useNavigate()
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const flash = useApp((s) => s.flash)
  const pending = useStudySession((s) => s.pending)
  const pendingElapsed = useStudySession((s) => s.pendingElapsed)
  const setPending = useStudySession((s) => s.setPending)
  const resetWrong = useStudySession((s) => s.resetWrong)
  const [busy, setBusy] = useState(false)

  const word = useQuery(() => getWord(wordId), [wordId], undefined)

  const backToQuestion = () => navigate(ROUTES.study)

  const onNext = async () => {
    if (!word || busy) return
    setBusy(true)
    try {
      if (pending === 'learned') {
        const r = await commitLearn(today, settings.currentBookId, word.id, pendingElapsed)
        if (!r.ok && r.reason === 'stale-day') {
          flash('已经跨天了，请回首页重新开始今天的任务', 'warn')
          navigate(ROUTES.home)
          return
        }
        resetWrong(word.id)
        flash('记住了，继续下一个', 'success')
      } else if (pending === 'requeue') {
        const r = await commitRequeue(today, settings.currentBookId, word.id, pendingElapsed)
        if (!r.ok && r.reason === 'stale-day') {
          flash('已经跨天了，请回首页重新开始今天的任务', 'warn')
          navigate(ROUTES.home)
          return
        }
        resetWrong(word.id)
        flash(r.forced ? '这个词先记为已学，明天会再见到它' : '已排到队尾，稍后再见')
      }
      setPending(null)
      backToQuestion()
    } finally {
      setBusy(false)
    }
  }

  if (!word) {
    return (
      <div className="screen">
        <TopBar title="单词详情" onBack={backToQuestion} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    )
  }

  const canSpeak = speechSupported()

  return (
    <div className="page page--flush" style={{ gap: 16, paddingTop: 0 }}>
      <TopBar
        title="单词详情"
        onBack={backToQuestion}
        actions={
          <IconButton
            icon={Volume2}
            label={canSpeak ? '播放发音' : '当前设备不支持发音'}
            disabled={!canSpeak}
            onClick={() => speak(word.word, settings)}
          />
        }
      />

      <Card className="card--pad detail-hero">
        <div className="detail-word">{word.word}</div>
        <div className="detail-sub">
          {word.phonetic?.us ? <span className="detail-phonetic">{word.phonetic.us}</span> : null}
          {word.pos ? <span className="chip chip--indigo">{word.pos}</span> : null}
          {word.tags.map((t) => (
            <span className="chip" key={t}>
              {t}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.75 }}>{word.translation}</p>
      </Card>

      <WordBody word={word} />

      <div className="screen-foot screen-foot--split" style={{ marginTop: 'auto' }}>
        <Button variant="outline" onClick={backToQuestion}>
          返回
        </Button>
        {pending ? (
          <Button variant="primary" onClick={onNext} disabled={busy}>
            {pending === 'requeue' ? '下一题（复习后再练）' : '下一题'}
            <ArrowRight size={17} aria-hidden />
          </Button>
        ) : (
          <Button variant="surface" onClick={backToQuestion}>
            回到学习
          </Button>
        )}
      </div>
    </div>
  )
}
