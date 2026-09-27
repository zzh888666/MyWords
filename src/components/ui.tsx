/**
 * 基础组件库
 *
 * 页面只允许使用这里的组件与 styles.css 里已有的类，不新增样式文件，
 * 这样全站圆角、间距、配色、触控尺寸才能保持一致。
 */
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BookColor } from '../types'

export type Tone = BookColor

// ────────────────────────────── 按钮 ──────────────────────────────

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'surface' | 'outline' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  block?: boolean
}

export function Button({
  variant = 'surface',
  size = 'md',
  block,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'btn',
        `btn--${variant}`,
        size === 'lg' ? 'btn--lg' : '',
        block ? 'btn--block' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}

/** 只有图标的按钮：必须传 label，会变成 aria-label 与 title */
export function IconButton({
  icon: Icon,
  label,
  size = 20,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon
  label: string
  size?: number
}) {
  return (
    <button
      type="button"
      className={['icon-btn', className ?? ''].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon size={size} aria-hidden />
    </button>
  )
}

// ────────────────────────────── 图标底色方块 ──────────────────────────────

/**
 * 多彩图标的正确做法：一个低饱和底色方块 + 同色系图标。
 * 比彩虹渐变克制，也比纯灰图标有辨识度。
 */
export function IconBadge({
  icon: Icon,
  tone = 'indigo',
  size = 'md',
  className,
}: {
  icon: LucideIcon
  tone?: Tone
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <span
      className={[
        'icon-badge',
        `icon-badge--${tone}`,
        size === 'lg' ? 'icon-badge--lg' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <Icon size={size === 'lg' ? 22 : 19} />
    </span>
  )
}

// ────────────────────────────── 容器 ──────────────────────────────

export function Card({
  children,
  className,
  pad,
  ink,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
  ink?: boolean
}) {
  return (
    <div
      className={['card', pad ? 'card--pad' : '', ink ? 'card--ink' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function Section({
  title,
  icon,
  tone,
  more,
  children,
}: {
  title: string
  icon?: LucideIcon
  tone?: Tone
  more?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="section">
      <div className="section__head">
        {icon ? <IconBadge icon={icon} tone={tone ?? 'indigo'} /> : null}
        <h2 className="section__title">{title}</h2>
        {more ? <div className="section__more">{more}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function TopBar({
  title,
  onBack,
  actions,
  bordered = true,
}: {
  title: ReactNode
  onBack?: () => void
  actions?: ReactNode
  bordered?: boolean
}) {
  return (
    <header className={['topbar', bordered ? 'topbar--bordered' : ''].filter(Boolean).join(' ')}>
      {onBack ? <IconButton icon={ChevronLeft} label="返回" onClick={onBack} /> : null}
      <div className="topbar__title">{title}</div>
      <div className="topbar__spacer" />
      {actions}
    </header>
  )
}

// ────────────────────────────── 进度 ──────────────────────────────

export function ProgressBar({
  value,
  tone,
  size = 'md',
  label,
  onInk,
}: {
  /** 0~1 */
  value: number
  tone?: 'primary' | 'gold' | 'ok'
  size?: 'md' | 'lg'
  /** 无障碍标签，例如「今日学习进度」 */
  label: string
  onInk?: boolean
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  return (
    <div
      className={['progress', size === 'lg' ? 'progress--lg' : ''].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
    >
      <div
        className={[
          'progress__fill',
          tone === 'gold' ? 'progress__fill--gold' : '',
          tone === 'ok' ? 'progress__fill--ok' : '',
          onInk ? 'progress__fill--on-ink' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  )
}

// ────────────────────────────── 分段控件 ──────────────────────────────

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; badge?: number }[]
  ariaLabel: string
}) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={['segmented__item', value === o.value ? 'is-active' : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.badge === 'number' && o.badge > 0 ? <span className="num dim">{o.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}

// ────────────────────────────── 列表 / 表单 ──────────────────────────────

export function ListRow({
  icon,
  tone,
  title,
  sub,
  trail,
  onClick,
  disabled,
}: {
  icon?: LucideIcon
  tone?: Tone
  title: ReactNode
  sub?: ReactNode
  trail?: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const content = (
    <>
      {icon ? <IconBadge icon={icon} tone={tone ?? 'indigo'} /> : null}
      <span className="listrow__main">
        <span className="listrow__title">{title}</span>
        {sub ? <span className="listrow__sub">{sub}</span> : null}
      </span>
      {trail !== undefined ? <span className="listrow__trail">{trail}</span> : null}
    </>
  )

  if (!onClick) return <div className="listrow">{content}</div>
  return (
    <button type="button" className="listrow" onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 5,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        aria-label="减少"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="stepper__value num">
        {value}
        {suffix ? <span className="dim" style={{ fontSize: 12, marginLeft: 3 }}>{suffix}</span> : null}
      </span>
      <button
        type="button"
        className="stepper__btn"
        aria-label="增加"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        +
      </button>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="dim" style={{ fontSize: 12 }}>{hint}</span> : null}
    </label>
  )
}

export function EmptyState({
  icon,
  tone,
  title,
  desc,
  action,
}: {
  icon: LucideIcon
  tone?: Tone
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <IconBadge icon={icon} tone={tone ?? 'indigo'} size="lg" />
      <div className="empty__title">{title}</div>
      {desc ? <p className="empty__desc">{desc}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  )
}

// ────────────────────────────── 底部抽屉 ──────────────────────────────

export function Sheet({
  open,
  onClose,
  title,
  desc,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  desc?: string
  children?: ReactNode
  footer?: ReactNode
}) {
  // Esc 关闭：键盘用户不必去找关闭按钮
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grip" />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h3 className="sheet__title">{title}</h3>
            {desc ? <p className="sheet__desc">{desc}</p> : null}
          </div>
          <IconButton icon={X} label="关闭" onClick={onClose} />
        </div>
        {children}
        {footer ? <div className="sheet__foot">{footer}</div> : null}
      </div>
    </div>
  )
}
