/**
 * 我的
 *
 * 这页只做三件事：看自己（名片 + 累计数据）、改偏好（发音 / 外观 / 提醒）、管数据（导出 / 导入 / 重置）。
 *
 * 刻意不放的东西：
 *  - 每日新词、学习方式：它们属于「学习计划」，放在这里会变成第二个入口；
 *  - 「生成测试复习数据」这类调试按钮：对用户没有意义，且会污染真实统计；
 *  - 数据自检：属于开发者视角，等有明确排查需求时再单独做入口。
 *
 * 所有会改变「今天任务数量」的设置都走 patchSettings（它会重建今天还没开始的队列）。
 */
import { useRef, useState, type ChangeEvent } from 'react'
import { useGo } from '../lib/nav'
import {
  Bell,
  BookMarked,
  CalendarClock,
  ChartColumn,
  Check,
  ChevronRight,
  Database,
  Download,
  Palette,
  Pencil,
  Play,
  RotateCcw,
  Trophy,
  Upload,
  Volume2,
} from 'lucide-react'
import { ROUTES } from '../routes'
import { useApp } from '../store/app'
import { useQuery } from '../lib/hooks'
import { getBookProgress, getStreak, getTotalStats } from '../lib/derive'
import { exportAll, importAll } from '../db'
import type { ExportPayload } from '../db'
import type { AvatarId } from '../types'
import { speak, speechSupported } from '../lib/speech'
import {
  Button,
  Card,
  Field,
  ListRow,
  Section,
  Segmented,
  Sheet,
  Stat,
  Switch,
  Stepper,
} from '../components/ui'

/** 可选头像：与 types.ts 的 AvatarId 一一对应 */
const AVATARS: readonly AvatarId[] = ['🧑‍🎓', '👩‍🎓', '👨‍💻', '🐱', '🐼', '🦊', '🌟', '📚']

/** 待确认的备份文件：先解析校验，再让用户二次确认后才覆盖数据 */
interface PendingImport {
  fileName: string
  payload: ExportPayload
  books: number
  words: number
  records: number
}

export default function Profile() {
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const flash = useApp((s) => s.flash)
  const patch = useApp((s) => s.patchSettings)
  const resetAll = useApp((s) => s.resetAll)
  const init = useApp((s) => s.init)
  const go = useGo()

  const data = useQuery(
    async () => {
      const [total, streak, current] = await Promise.all([
        getTotalStats(),
        getStreak(today),
        getBookProgress(settings.currentBookId),
      ])
      return { total, streak, bookName: current?.book.name ?? '—' }
    },
    [today, settings.currentBookId],
    {
      total: {
        learned: 0,
        reviews: 0,
        answered: 0,
        correct: 0,
        accuracy: 0,
        durationMs: 0,
        activeDays: 0,
      },
      streak: 0,
      bookName: '—',
    },
  )

  const [editOpen, setEditOpen] = useState(false)
  const [draftName, setDraftName] = useState(settings.nickname)
  const [draftAvatar, setDraftAvatar] = useState<AvatarId>(settings.avatar)
  const [busy, setBusy] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSpeak = speechSupported()
  const nameOk = draftName.trim().length > 0

  const openEdit = () => {
    setDraftName(settings.nickname)
    setDraftAvatar(settings.avatar)
    setEditOpen(true)
  }

  const saveProfile = async () => {
    const nickname = draftName.trim()
    if (!nickname) return
    await patch({ nickname, avatar: draftAvatar })
    setEditOpen(false)
    flash('资料已更新', 'success')
  }

  // ── 数据管理 ──────────────────────────────────────────────

  const onExport = async () => {
    if (busy) return
    setBusy(true)
    try {
      const payload = await exportAll()
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wordlearn-backup-${today}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      flash('备份已导出', 'success')
    } catch {
      flash('导出失败，请重试', 'warn')
    } finally {
      setBusy(false)
    }
  }

  const readBackup = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result ?? '')) as Partial<ExportPayload> | null
        if (!raw || raw.app !== 'wordlearn' || !Array.isArray(raw.books) || !Array.isArray(raw.words)) {
          throw new Error('格式不正确')
        }
        setPending({
          fileName: file.name,
          payload: raw as ExportPayload,
          books: raw.books.length,
          words: raw.words.length,
          records:
            (raw.progress?.length ?? 0) + (raw.daily?.length ?? 0) + (raw.logs?.length ?? 0),
        })
      } catch {
        flash('文件格式不正确，无法导入', 'warn')
      }
    }
    reader.onerror = () => flash('读取文件失败，请重试', 'warn')
    reader.readAsText(file)
  }

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 清空 value：同一个文件再次选择也要能触发 change
    e.target.value = ''
    if (file) readBackup(file)
  }

  const confirmImport = async () => {
    if (!pending || busy) return
    setBusy(true)
    try {
      await importAll(pending.payload)
      // 备份里的设置要重新读进内存，今天还没开始的队列也要按新设置补上
      await init()
      setPending(null)
      flash('备份已导入，数据已恢复', 'success')
    } catch {
      flash('导入失败，请检查文件后重试', 'warn')
    } finally {
      setBusy(false)
    }
  }

  const confirmReset = async () => {
    if (busy) return
    setBusy(true)
    try {
      await resetAll()
      setResetOpen(false)
      flash('学习进度已重置', 'success')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      {/* 名片 */}
      <Card className="namecard">
        <span className="namecard__avatar" aria-hidden>
          {settings.avatar}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="namecard__name" style={{ overflowWrap: 'anywhere' }}>
            {settings.nickname}
          </div>
          <div className="namecard__sub">
            连续打卡 {data.streak} 天 · 正在学《{data.bookName}》
          </div>
        </div>
        <Button variant="surface" onClick={openEdit}>
          <Pencil size={16} aria-hidden />
          编辑
        </Button>
      </Card>

      {/* 累计数据 */}
      <Card className="card--pad">
        <div className="stat-row">
          <Stat value={data.total.learned} label="累计学会" />
          <Stat value={data.total.reviews} label="累计复习" />
          <Stat value={data.total.activeDays} label="学习天数" />
        </div>
      </Card>

      {/* 入口 */}
      <Card className="card--pad">
        <div className="list">
          <ListRow
            icon={CalendarClock}
            tone="indigo"
            title="学习计划"
            sub="每日任务量、复习上限与答题偏好"
            trail={<ChevronRight size={16} aria-hidden />}
            onClick={() => go(ROUTES.plan)}
          />
          <ListRow
            icon={BookMarked}
            tone="amber"
            title="词书管理"
            sub="切换词书、新建自建词书"
            trail={<ChevronRight size={16} aria-hidden />}
            onClick={() => go(ROUTES.books)}
          />
          <ListRow
            icon={Trophy}
            tone="emerald"
            title="学习成就"
            sub="看看已经解锁了哪些成就"
            trail={<ChevronRight size={16} aria-hidden />}
            onClick={() => go(ROUTES.achievements)}
          />
          <ListRow
            icon={ChartColumn}
            tone="cyan"
            title="统计"
            sub="学习趋势、打卡日历与掌握分布"
            trail={<ChevronRight size={16} aria-hidden />}
            onClick={() => go(ROUTES.stats)}
          />
        </div>
      </Card>

      {/* 发音 */}
      <Section title="发音" icon={Volume2} tone="violet">
        <Card className="card--pad">
          <div className="list">
            <ListRow
              title="自动发音"
              sub="单词出现时自动朗读一次"
              trail={
                <Switch
                  checked={settings.autoPronounce}
                  onChange={(v) => void patch({ autoPronounce: v })}
                  label="自动发音"
                />
              }
            />
            <div className="field" style={{ padding: '12px 4px' }}>
              <span className="field__label">发音口音</span>
              <Segmented
                value={settings.accent}
                onChange={(v) => void patch({ accent: v })}
                ariaLabel="发音口音"
                options={[
                  { value: 'us', label: '美音' },
                  { value: 'uk', label: '英音' },
                ]}
              />
            </div>
            <div className="field" style={{ padding: '12px 4px' }}>
              <span className="field__label">语速</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Stepper
                  value={settings.speechRate}
                  onChange={(v) => void patch({ speechRate: Math.round(v * 100) / 100 })}
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  suffix="倍"
                />
                <Button
                  variant="outline"
                  disabled={!canSpeak}
                  onClick={() => speak('vocabulary', settings)}
                >
                  <Play size={15} aria-hidden />
                  试听
                </Button>
              </div>
              {!canSpeak ? (
                <span className="dim" style={{ fontSize: 12 }}>
                  当前设备不支持发音，学习卡片里的朗读按钮同样不可用
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      </Section>

      {/* 外观 */}
      <Section title="外观" icon={Palette} tone="cyan">
        <Card className="card--pad">
          <div className="list">
            <div className="field" style={{ padding: '12px 4px' }}>
              <span className="field__label">主题</span>
              <Segmented
                value={settings.theme}
                onChange={(v) => void patch({ theme: v })}
                ariaLabel="主题"
                options={[
                  { value: 'system', label: '跟随系统' },
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                ]}
              />
              <span className="dim" style={{ fontSize: 12 }}>
                跟随系统时会随设备的浅色 / 深色模式自动切换
              </span>
            </div>
          </div>
        </Card>
      </Section>

      {/* 提醒 */}
      <Section title="提醒" icon={Bell} tone="rose">
        <Card className="card--pad">
          <div className="list">
            <ListRow
              title="每日提醒"
              sub="开启后可设置每天的提醒时间"
              trail={
                <Switch
                  checked={settings.reminderEnabled}
                  onChange={(v) => void patch({ reminderEnabled: v })}
                  label="每日提醒"
                />
              }
            />
            {settings.reminderEnabled ? (
              <div style={{ padding: '12px 4px' }}>
                <Field label="提醒时间" hint="以设备本地时间为准">
                  <input
                    className="input"
                    type="time"
                    value={settings.reminderTime}
                    aria-label="提醒时间"
                    onChange={(e) => {
                      const v = e.target.value
                      if (v) void patch({ reminderTime: v })
                    }}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        </Card>
      </Section>

      {/* 数据管理 */}
      <Section title="数据管理" icon={Database} tone="amber">
        <Card className="card--pad">
          <div className="list">
            <ListRow
              icon={Download}
              tone="emerald"
              title="导出备份"
              sub="把词书、进度、统计与设置存成一个 JSON 文件"
              trail={<ChevronRight size={16} aria-hidden />}
              onClick={() => void onExport()}
            />
            <ListRow
              icon={Upload}
              tone="indigo"
              title="导入备份"
              sub="用备份文件覆盖当前全部数据"
              trail={<ChevronRight size={16} aria-hidden />}
              onClick={() => fileRef.current?.click()}
            />
            <ListRow
              icon={RotateCcw}
              tone="rose"
              title="重置学习进度"
              sub="清空进度与统计，词书和设置保留"
              trail={<ChevronRight size={16} aria-hidden />}
              onClick={() => setResetOpen(true)}
            />
          </div>
        </Card>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="选择备份文件"
          onChange={onPickFile}
        />
      </Section>

      {/* 编辑资料 */}
      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="编辑资料"
        desc="昵称和头像只保存在这台设备上。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void saveProfile()} disabled={!nameOk}>
              保存
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="昵称" hint="最多 12 个字">
            <input
              className="input"
              value={draftName}
              maxLength={12}
              placeholder="怎么称呼你"
              aria-label="昵称"
              onChange={(e) => setDraftName(e.target.value)}
            />
          </Field>
          <div className="field">
            <span className="field__label">头像</span>
            <div
              className="badge-grid"
              style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}
            >
              {AVATARS.map((emoji) => {
                const active = emoji === draftAvatar
                return (
                  <button
                    key={emoji}
                    type="button"
                    className="badge"
                    aria-pressed={active}
                    aria-label={`选择头像 ${emoji}`}
                    onClick={() => setDraftAvatar(emoji)}
                    style={{
                      alignItems: 'center',
                      gap: 4,
                      padding: '10px 4px',
                      minHeight: 64,
                      borderColor: active ? 'var(--primary)' : undefined,
                      boxShadow: active ? '0 0 0 1px var(--primary)' : undefined,
                    }}
                  >
                    <span style={{ fontSize: 26 }} aria-hidden>
                      {emoji}
                    </span>
                    <span className="badge__desc" style={{ minHeight: 14, fontSize: 11 }}>
                      {active ? '已选' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Sheet>

      {/* 导入二次确认 */}
      <Sheet
        open={Boolean(pending)}
        onClose={() => {
          if (!busy) setPending(null)
        }}
        title="导入备份？"
        desc="导入会用备份内容覆盖当前全部数据（词书、进度、统计与设置），覆盖后无法撤销。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void confirmImport()} disabled={busy}>
              覆盖导入
            </Button>
          </>
        }
      >
        {pending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="listrow__title" style={{ overflowWrap: 'anywhere' }}>
              {pending.fileName}
            </div>
            <div className="listrow__sub">
              词书 {pending.books} 本 · 词条 {pending.words} 个 · 学习记录 {pending.records} 条
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* 重置二次确认 */}
      <Sheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="重置学习进度？"
        desc="会清空全部学习进度、复习队列、作答流水与统计；词书、自建词条和设置会保留。此操作无法撤销。"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void confirmReset()} disabled={busy}>
              确认重置
            </Button>
          </>
        }
      >
        <p className="dim" style={{ fontSize: 13, lineHeight: 1.7 }}>
          重置后所有单词都会回到「未学习」，连续打卡与累计统计一并清零，导出过备份的话可以再导入回来。
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Check size={15} aria-hidden className="dim" />
          <span className="dim" style={{ fontSize: 12 }}>
            想保留记录，请先「导出备份」
          </span>
        </div>
      </Sheet>
    </div>
  )
}
