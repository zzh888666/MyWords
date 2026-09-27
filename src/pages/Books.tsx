/**
 * 词书管理
 *
 * 三件事：看全部词书与完成度、点一下切换当前词书、新建 / 删除自建词书。
 *
 * 关键规则：
 *  - 切换词书走 patchSettings({ currentBookId })，随后按幂等补上这本书今天的队列
 *    （docs/LOGIC_FLOW.md §7.1：判据是「今天是否已有队列」，不是「列表是否为空」，所以不会刷词）；
 *  - 内置词书不可删除；自建词书删除时只删词书与词表关联，
 *    已经学过的单词与学习进度全部保留（deleteBook 的实现就是这样）；
 *  - 删除当前词书后必须把 currentBookId 换到另一本，否则首页会指向一本不存在的书。
 */
import { useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Check, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { ROUTES } from '../routes'
import { useGoBack } from '../lib/nav'
import { useApp } from '../store/app'
import { EMPTY_LIST, useQuery } from '../lib/hooks'
import { getAllBookProgress, listBooks } from '../lib/derive'
import type { BookProgress } from '../lib/derive'
import { addCustomBook, deleteBook } from '../db'
import { ensureDailyTask } from '../lib/tasks'
import type { Book, Word } from '../types'
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconBadge,
  IconButton,
  ProgressBar,
  Sheet,
  TopBar,
} from '../components/ui'

/** 词表解析结果：能识别的词条 + 不能识别的行数 + 跳过的重复词数 */
interface ParsedList {
  words: Word[]
  invalid: number
  duplicates: number
}

/**
 * 解析粘贴的词表：每行 `word|释义` 或 `word,释义`（也兼容全角逗号与制表符）。
 * 只在第一个分隔符处切开，释义里再出现逗号不会被误拆；同一个单词只保留第一次出现。
 */
function parseWordList(text: string): ParsedList {
  const seen = new Set<string>()
  const words: Word[] = []
  let invalid = 0
  let duplicates = 0

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const sep = trimmed.search(/[|,\t，]/)
    if (sep <= 0) {
      invalid++
      continue
    }
    const head = trimmed.slice(0, sep).trim()
    const tail = trimmed.slice(sep + 1).trim()
    if (!head || !tail) {
      invalid++
      continue
    }
    const id = head.toLowerCase()
    if (seen.has(id)) {
      duplicates++
      continue
    }
    seen.add(id)
    words.push({
      id,
      word: head,
      pos: '',
      translation: tail,
      tags: [],
      rank: 0,
    })
  }

  return { words, invalid, duplicates }
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

export default function Books() {
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const patch = useApp((s) => s.patchSettings)
  const flash = useApp((s) => s.flash)
  const goBack = useGoBack(ROUTES.home)

  const books = useQuery(
    () => getAllBookProgress(),
    [today, settings.currentBookId],
    EMPTY_LIST as BookProgress[],
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [raw, setRaw] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null)
  const [busy, setBusy] = useState(false)

  const parsed = useMemo(() => parseWordList(raw), [raw])
  const canCreate = name.trim().length > 0 && parsed.words.length > 0

  /** 切到某本词书：先改设置，再幂等生成它今天的队列 */
  const switchTo = async (bookId: string) => {
    await patch({ currentBookId: bookId })
    await Promise.all([
      ensureDailyTask(bookId, 'learn', today),
      ensureDailyTask(bookId, 'review', today),
    ])
  }

  const selectBook = async (book: Book) => {
    if (book.id === settings.currentBookId) {
      flash(`《${book.name}》已经是当前词书`)
      return
    }
    await switchTo(book.id)
    flash(`已切换到《${book.name}》`, 'success')
  }

  const openCreate = () => {
    setName('')
    setRaw('')
    setCreateOpen(true)
  }

  const onCreate = async () => {
    const bookName = name.trim()
    if (!bookName) {
      flash('请先填写词书名称', 'warn')
      return
    }
    if (!parsed.words.length) {
      flash('至少粘贴一个词条，每行「单词|释义」', 'warn')
      return
    }
    setBusy(true)
    try {
      const book = await addCustomBook(bookName, `${parsed.words.length} 个自建词条`, parsed.words)
      setCreateOpen(false)
      setName('')
      setRaw('')
      flash(`已创建《${book.name}》，共 ${parsed.words.length} 个词条`, 'success')
    } catch {
      flash('创建失败，请重试', 'warn')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete || busy) return
    const target = pendingDelete
    setBusy(true)
    try {
      await deleteBook(target.id)
      if (target.id === settings.currentBookId) {
        // 删掉的是当前词书：必须换到另一本，首页与今日任务才有指向
        const rest = await listBooks()
        const next = rest[0]
        if (next) await switchTo(next.id)
        flash(`已删除《${target.name}》，当前词书改为《${next?.name ?? '—'}》`, 'success')
      } else {
        flash(`已删除《${target.name}》`, 'success')
      }
      setPendingDelete(null)
    } catch {
      flash('删除失败，请重试', 'warn')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell title="词书管理" onBack={goBack}>
      {books.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {books.map((b) => {
            const current = b.book.id === settings.currentBookId
            return (
              <div key={b.book.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className={`book-card${current ? ' is-current' : ''}`}
                  style={{ flex: 1, minWidth: 0 }}
                  aria-pressed={current}
                  onClick={() => void selectBook(b.book)}
                >
                  <IconBadge icon={BookOpen} tone={b.book.color ?? 'indigo'} />
                  <span
                    style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    <span className="book-card__name" style={{ overflowWrap: 'anywhere' }}>
                      {b.book.name}
                    </span>
                    <span className="book-card__desc">
                      {b.book.tagline ?? b.book.description} · 已学 {b.learned} / {b.total} 词 ·{' '}
                      {Math.round(b.percent * 100)}%
                    </span>
                    <ProgressBar value={b.percent} label={`《${b.book.name}》学习进度`} />
                  </span>
                  {current ? (
                    <span className="chip chip--ok">
                      <Check size={13} aria-hidden />
                      当前
                    </span>
                  ) : (
                    <ChevronRight size={18} className="dim" aria-hidden />
                  )}
                </button>
                {b.book.custom ? (
                  <IconButton
                    icon={Trash2}
                    label={`删除《${b.book.name}》`}
                    onClick={() => setPendingDelete(b.book)}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="card--pad">
          <EmptyState
            icon={BookOpen}
            tone="indigo"
            title="还没有词书"
            desc="内置词书会在启动时写入；也可以新建一本自己的词书。"
          />
        </Card>
      )}

      <Button variant="outline" block onClick={openCreate}>
        <Plus size={16} aria-hidden />
        新建自建词书
      </Button>

      <p className="dim" style={{ fontSize: 12, lineHeight: 1.7 }}>
        内置词书不可删除。自建词书删除后词表会被移除，但已经学过的单词与学习进度会保留。
      </p>

      {/* 新建词书 */}
      <Sheet
        open={createOpen}
        onClose={() => {
          if (!busy) setCreateOpen(false)
        }}
        title="新建自建词书"
        desc="每行一个词条，用「单词|释义」或「单词,释义」分隔；重复的单词只会保留第一条。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => void onCreate()}
              disabled={busy || !canCreate}
            >
              创建词书
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="词书名称" hint="最多 20 个字，例如「考研核心词」">
            <input
              className="input"
              value={name}
              maxLength={20}
              placeholder="给这本词书起个名字"
              aria-label="词书名称"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="粘贴词表" hint="例：apple|苹果　abandon,放弃">
            <textarea
              className="textarea"
              value={raw}
              spellCheck={false}
              placeholder={'apple|苹果\nabandon|放弃，抛弃'}
              aria-label="粘贴词表"
              onChange={(e) => setRaw(e.target.value)}
            />
          </Field>

          <div>
            <div className="dim" style={{ fontSize: 12 }}>
              已识别 {parsed.words.length} 个词条
              {parsed.invalid ? ` · ${parsed.invalid} 行无法识别` : ''}
              {parsed.duplicates ? ` · 跳过重复 ${parsed.duplicates} 个` : ''}
            </div>
            {parsed.words.slice(0, 2).map((w) => (
              <div
                key={w.id}
                className="dim"
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {w.word} — {w.translation}
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* 删除二次确认 */}
      <Sheet
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!busy) setPendingDelete(null)
        }}
        title={pendingDelete ? `删除《${pendingDelete.name}》？` : '删除词书'}
        desc="词书和它的词表会被移除；已经学过的单词进度会保留，如果这些词还属于其它词书也不受影响。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={busy}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={busy}>
              删除词书
            </Button>
          </>
        }
      >
        {pendingDelete ? (
          <p className="dim" style={{ fontSize: 13, lineHeight: 1.7 }}>
            这本书共有 {pendingDelete.wordCount} 个词条，删除后词表无法恢复；学习进度和统计不会被清空。
          </p>
        ) : null}
      </Sheet>
    </PageShell>
  )
}
