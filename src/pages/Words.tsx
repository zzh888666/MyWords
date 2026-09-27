/**
 * 单词本
 *
 * 一屏三件事，顺序就是用户找词的过程：先选范围（全部 / 待复习 / 待学习），再搜索，最后看列表。
 *
 * 实现约束（对应 docs/LOGIC_FLOW.md §6 / docs/UI_CONTRACT.md §3.1）：
 *  - 搜索只搜当前词书；匹配「单词前缀」与「释义包含」，大小写不敏感，输入去抖 200ms，搜索时重置分页。
 *  - 全部列表按书内 order 顺序（getBookWords 保持 getBookWordIds 的顺序），排序稳定，翻页不会重复或漏项。
 *  - 分批渲染，每批 30 条；用 IntersectionObserver 盯列表底部哨兵，不监听 scroll；卸载时断开。
 *  - 切换筛选 / 搜索 / 词书都从头开始渲染，避免停在上一份列表的第 N 批。
 *  - 队列不存在（今天还没生成任务）时给空态，不报错、也不是一句「暂无数据」了事。
 *
 * 列表数据按当前书一次性读入：搜索要匹配释义就必须扫全表，几百个词在内存里过滤没有压力；
 * 真正的开销是 DOM 节点数，所以分批只做在渲染层。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, GraduationCap, RotateCcw, Search, X } from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { useQuery } from '../lib/hooks'
import { navState, useGo } from '../lib/nav'
import { getBookWords, getWordsByIds, isQueueDone } from '../lib/derive'
import { db, getQueue } from '../db'
import type { SessionQueue, Word } from '../types'
import { Button, EmptyState, Segmented } from '../components/ui'

/** 列表范围：全部 / 待复习 / 待学习 */
type Scope = 'all' | 'review' | 'learn'

/** 每批渲染多少条 */
const PAGE = 30

interface ScopeList {
  /** 当天的队列快照；今天还没生成任务时为 undefined */
  queue?: SessionQueue
  words: Word[]
}

interface WordsView {
  loaded: boolean
  bookName: string
  all: Word[]
  review: ScopeList
  learn: ScopeList
}

const EMPTY_WORDS: Word[] = []
const INITIAL: WordsView = {
  loaded: false,
  bookName: '',
  all: EMPTY_WORDS,
  review: { words: EMPTY_WORDS },
  learn: { words: EMPTY_WORDS },
}

/** 单词前缀命中：这类结果排在前面 */
function isPrefixHit(w: Word, needle: string): boolean {
  return w.word.toLowerCase().startsWith(needle)
}

/** 释义命中：简明释义或任一义项的中文释义包含关键词 */
function isDefHit(w: Word, needle: string): boolean {
  if (w.translation.toLowerCase().includes(needle)) return true
  return Boolean(w.senses?.some((s) => s.zh.toLowerCase().includes(needle)))
}

/** 「待复习 / 待学习」列表为空时的说明：区分「还没生成任务」「已完成」「本来就没有」 */
function QueueEmpty({ scope, queue }: { scope: 'review' | 'learn'; queue?: SessionQueue }) {
  const navigate = useNavigate()
  const isReview = scope === 'review'
  const done = isQueueDone(queue)

  const title = !queue
    ? isReview
      ? '今天还没有复习任务'
      : '今天还没有学习任务'
    : done
      ? isReview
        ? '今日复习已完成'
        : '今日学习已完成'
      : isReview
        ? '今天没有需要复习的单词'
        : '今天没有要学的单词'

  const desc = !queue
    ? '回首页开始今天的学习或复习，任务生成后这里就会列出对应的单词。'
    : done
      ? '今天的任务都结算完了，明天再来。'
      : isReview
        ? '学过的单词会在合适的间隔后回到这里。'
        : '这本书可能已经学完，或者每日学习数量被设成了 0。'

  return (
    <EmptyState
      icon={isReview ? RotateCcw : GraduationCap}
      tone={isReview ? 'violet' : 'indigo'}
      title={title}
      desc={desc}
      action={
        <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
          回首页
        </Button>
      }
    />
  )
}

export default function Words() {
  const today = useApp((s) => s.today)
  const bookId = useApp((s) => s.settings.currentBookId)
  const navigate = useNavigate()
  const go = useGo()

  const view = useQuery<WordsView>(
    async (): Promise<WordsView> => {
      const [all, review, learn, book] = await Promise.all([
        getBookWords(bookId),
        getQueue(today, 'review', bookId),
        getQueue(today, 'learn', bookId),
        db.books.get(bookId),
      ])
      const [reviewWords, learnWords] = await Promise.all([
        getWordsByIds(review?.wordIds ?? []),
        getWordsByIds(learn?.wordIds ?? []),
      ])
      return {
        loaded: true,
        bookName: book?.name ?? '',
        all,
        review: { queue: review, words: reviewWords },
        learn: { queue: learn, words: learnWords },
      }
    },
    // deps 只能是原始值：对象每次发射都是新引用，会导致无限重订阅
    [today, bookId],
    INITIAL,
  )

  const [scope, setScope] = useState<Scope>('all')
  /** 输入框里的原始值 */
  const [query, setQuery] = useState('')
  /** 去抖之后真正参与过滤的关键词（小写、已去首尾空格） */
  const [needle, setNeedle] = useState('')

  useEffect(() => {
    const id = window.setTimeout(() => setNeedle(query.trim().toLowerCase()), 200)
    return () => window.clearTimeout(id)
  }, [query])

  const scopeWords = scope === 'all' ? view.all : scope === 'review' ? view.review.words : view.learn.words
  const scopeQueue = scope === 'review' ? view.review.queue : scope === 'learn' ? view.learn.queue : undefined

  /** 前缀命中优先，其余释义命中，组内保持书内 / 队列顺序 —— 稳定排序 */
  const results = useMemo(() => {
    if (!needle) return scopeWords
    const prefix: Word[] = []
    const rest: Word[] = []
    for (const w of scopeWords) {
      if (isPrefixHit(w, needle)) prefix.push(w)
      else if (isDefHit(w, needle)) rest.push(w)
    }
    return [...prefix, ...rest]
  }, [scopeWords, needle])

  const [visible, setVisible] = useState(PAGE)

  // 切换筛选 / 关键词 / 词书：重置分页
  useEffect(() => {
    setVisible(PAGE)
  }, [scope, needle, bookId])

  const shown = results.slice(0, visible)
  const hasMore = shown.length < results.length
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(v + PAGE, results.length))
        }
      },
      { rootMargin: '240px 0px' },
    )
    io.observe(el)
    // 卸载 / 列表变化时断开设 observe，避免 observer 越挂越多
    return () => io.disconnect()
  }, [hasMore, visible, results.length])

  const openWord = (id: string) => {
    navigate(`${ROUTES.word(id)}?scope=${scope}`, navState(ROUTES.words))
  }

  const clearSearch = () => {
    setQuery('')
    // 清空是明确动作，立即生效，不用等去抖
    setNeedle('')
  }

  if (!view.loaded) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 44 }} />
        <div className="skeleton" style={{ height: 44 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    )
  }

  const counts = {
    all: view.all.length,
    review: view.review.words.length,
    learn: view.learn.words.length,
  }
  const searching = needle.length > 0

  return (
    <div className="page">
      <header className="section__head">
        <h1 className="section__title">单词本</h1>
        <div className="section__more">
          《{view.bookName}》· {counts.all} 词
        </div>
      </header>

      <Segmented
        value={scope}
        onChange={setScope}
        ariaLabel="单词范围"
        options={[
          { value: 'all', label: '全部', badge: counts.all },
          { value: 'review', label: '待复习', badge: counts.review },
          { value: 'learn', label: '待学习', badge: counts.learn },
        ]}
      />

      <div className="search">
        <Search size={17} className="search__icon" aria-hidden />
        <input
          className="input"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          placeholder="搜索单词或释义"
          aria-label="搜索当前词书里的单词或释义"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button type="button" className="search__clear" aria-label="清空搜索" onClick={clearSearch}>
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        searching ? (
          <EmptyState
            icon={Search}
            tone="cyan"
            title="没有匹配的单词"
            desc="只支持「单词前缀」与「释义包含」两种匹配，换个关键词再试。"
            action={
              <Button variant="primary" onClick={clearSearch}>
                清空搜索
              </Button>
            }
          />
        ) : scope === 'all' ? (
          <EmptyState
            icon={BookOpen}
            tone="indigo"
            title="这本书还没有单词"
            desc="可以到词书管理里换一本，或者新建一本自己的词书。"
            action={
              <Button variant="primary" onClick={() => go(ROUTES.books)}>
                词书管理
              </Button>
            }
          />
        ) : (
          <QueueEmpty scope={scope} queue={scopeQueue} />
        )
      ) : (
        <>
          <div className="list">
            {shown.map((w) => (
              <button type="button" className="wordrow" key={w.id} onClick={() => openWord(w.id)}>
                <span className="wordrow__main">
                  <span className="wordrow__word">{w.word}</span>
                  {/* 长释义省略号截断，窄屏不撑破容器 */}
                  <span className="wordrow__def" style={{ display: 'block' }}>
                    {w.pos ? `${w.pos} ` : ''}
                    {w.translation}
                  </span>
                </span>
                <ChevronRight size={17} className="dim" aria-hidden />
              </button>
            ))}
          </div>
          {hasMore ? (
            <div className="load-more" ref={sentinelRef}>
              上滑加载更多（已显示 {shown.length} / {results.length}）
            </div>
          ) : (
            <div className="load-more">已经到底了 · 共 {results.length} 个单词</div>
          )}
        </>
      )}
    </div>
  )
}
