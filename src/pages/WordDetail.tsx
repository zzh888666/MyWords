/**
 * 单词本 · 单词详情
 *
 * 从单词本进来，所以返回一定回单词本（来源记在 location.state，见 lib/nav.ts）。
 * 底部「上一个 / 下一个」沿**进详情时的范围顺序**走：
 *   全部 → 书内 order；待复习 / 待学习 → 当天队列的 wordIds 顺序。
 * 切换用 navigate(..., { replace: true })，否则连点几十次会在历史栈里堆满详情页、返回要按很多次。
 * 词条正文复用 WordBody，与学习流程的详情页共用同一份渲染（不重复实现）。
 *
 * 刻意不做「修改词条」入口：给自建词书改词条属于边缘需求，界面里删掉更干净；
 * 发音也只有一个入口（顶栏），不在正文里再放一个重复按钮。
 */
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { useQuery } from '../lib/hooks'
import { navState, useGoBack } from '../lib/nav'
import type { NavState } from '../lib/nav'
import { getBookWordIds, getWord } from '../lib/derive'
import { getQueue } from '../db'
import { speak, speechSupported } from '../lib/speech'
import type { Word } from '../types'
import WordBody from '../components/WordBody'
import { Button, Card, EmptyState, IconButton, TopBar } from '../components/ui'

/** 进来时所在的列表范围，与单词本三个筛选一一对应 */
type Scope = 'all' | 'review' | 'learn'

const SCOPE_LABEL: Record<Scope, string> = { all: '全部', review: '待复习', learn: '待学习' }

const EMPTY_IDS: string[] = []

interface WordView {
  loaded: boolean
  /** 这份结果对应的 wordId：换词时上一份结果会短暂残留，必须比对，否则会闪一下上一个词 */
  forId: string
  word?: Word
}

export default function WordDetail() {
  const { wordId = '' } = useParams()
  const [params] = useSearchParams()
  const scopeParam = params.get('scope')
  const scope: Scope = scopeParam === 'review' || scopeParam === 'learn' ? scopeParam : 'all'

  const today = useApp((s) => s.today)
  const bookId = useApp((s) => s.settings.currentBookId)
  const settings = useApp((s) => s.settings)
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = useGoBack(ROUTES.words)

  // 区分「还在读」与「没有这个词」：getWord 返回 undefined 两种情况都可能是初始值
  const view = useQuery<WordView>(
    async (): Promise<WordView> => ({ loaded: true, forId: wordId, word: await getWord(wordId) }),
    [wordId],
    { loaded: false, forId: '' },
  )

  const ids = useQuery<{ all: string[]; scope: string[] }>(
    async () => {
      const all = await getBookWordIds(bookId)
      if (scope === 'all') return { all, scope: all }
      const queue = await getQueue(today, scope, bookId)
      return { all, scope: queue?.wordIds ?? [] }
    },
    [bookId, today, scope],
    { all: EMPTY_IDS, scope: EMPTY_IDS },
  )

  /**
   * 当前词不在范围列表里时（队列已结算、今天任务被重建、?scope= 失效）退回整本书的顺序，
   * 否则会出现「上一个/下一个都是灰的」这种死页。
   */
  const inScope = ids.scope.includes(wordId)
  const list = inScope ? ids.scope : ids.all
  const navScope: Scope = inScope ? scope : 'all'
  const index = list.indexOf(wordId)
  const prevId = index > 0 ? list[index - 1] : null
  const nextId = index >= 0 && index < list.length - 1 ? list[index + 1] : null

  /** 保留来源，replace 切换：返回键始终回到进来时的那个页面 */
  const go = (id: string) => {
    const keep = (location.state as NavState | null) ?? navState(ROUTES.words).state
    navigate(`${ROUTES.word(id)}?scope=${navScope}`, { replace: true, state: keep })
  }

  /**
   * 结果还没对上当前 wordId（首次读取，或刚点了上一个/下一个）时按「读取中」处理：
   * 只换正文，不换骨架 —— 底部按钮必须一直在，否则连点时按钮会从手指底下消失。
   */
  const ready = view.loaded && view.forId === wordId
  const word = ready ? view.word : undefined

  if (ready && !word) {
    return (
      <div className="page" style={{ gap: 16 }}>
        <TopBar title="单词详情" onBack={goBack} />
        <EmptyState
          icon={BookOpen}
          tone="indigo"
          title="没有找到这个单词"
          desc="它可能已经从词库里删除了，或链接不完整。"
          action={
            <Button variant="primary" onClick={goBack}>
              返回单词本
            </Button>
          }
        />
      </div>
    )
  }

  const canSpeak = speechSupported()

  return (
    <div className="page" style={{ gap: 16 }}>
      <TopBar
        title="单词详情"
        onBack={goBack}
        actions={
          <IconButton
            icon={Volume2}
            label={canSpeak ? '播放发音' : '当前设备不支持发音'}
            disabled={!canSpeak || !word}
            onClick={() => {
              if (word) speak(word.word, settings)
            }}
          />
        }
      />

      {word ? (
        <>
          <Card className="card--pad detail-hero">
            <div className="detail-word">{word.word}</div>
            <div className="detail-sub">
              {word.phonetic?.us ? <span className="detail-phonetic">{word.phonetic.us}</span> : null}
              {word.phonetic?.uk ? <span className="detail-phonetic dim">{word.phonetic.uk}</span> : null}
              {word.pos ? <span className="chip chip--indigo">{word.pos}</span> : null}
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.75 }}>{word.translation}</p>
            {index >= 0 ? (
              <div className="dim num" style={{ fontSize: 12 }}>
                {SCOPE_LABEL[navScope]} · 第 {index + 1} / {list.length} 个
              </div>
            ) : null}
          </Card>

          <WordBody word={word} />
        </>
      ) : (
        <>
          <div className="skeleton" style={{ height: 150 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </>
      )}

      {/* 底部操作区留在文档流里：桌面端没有底部标签栏，移动端 .page 已经预留了标签栏高度 */}
      <div className="screen-foot screen-foot--split" style={{ marginTop: 'auto' }}>
        <Button
          variant="outline"
          size="lg"
          disabled={!prevId}
          onClick={() => {
            if (prevId) go(prevId)
          }}
        >
          <ChevronLeft size={17} aria-hidden />
          上一个
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!nextId}
          onClick={() => {
            if (nextId) go(nextId)
          }}
        >
          下一个
          <ChevronRight size={17} aria-hidden />
        </Button>
      </div>
    </div>
  )
}
