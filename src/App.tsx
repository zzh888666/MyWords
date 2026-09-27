/**
 * 应用外壳
 *
 * 职责只有四件事：
 *   1. 启动引导（播种 → 补跑每日任务 → 读设置）
 *   2. 跨天监测：定时与「切回前台」时检查日期，跨天就补跑任务并刷新页面
 *   3. 布局：桌面左侧栏 / 移动底部标签栏
 *   4. 全局轻提示
 * 业务逻辑一律不放在这里。
 */
import { useCallback, useEffect } from 'react'
import {
  HashRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import {
  BookOpen,
  ChartColumn,
  House,
  Info,
  User,
  CircleCheck,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES, isSessionPath } from './routes'
import { useApp } from './store/app'
import { useOnVisible } from './lib/hooks'
import { nowHm, todayKey } from './lib/date'
import { catchUpDailyTasks } from './lib/tasks'
import { getQueue, getRunState, patchRunState } from './db'
import { primeVoices } from './lib/speech'
import { watchSystemTheme } from './lib/theme'

import Home from './pages/Home'
import Words from './pages/Words'
import WordDetail from './pages/WordDetail'
import Review from './pages/Review'
import Study from './pages/Study'
import StudyWordDetail from './pages/StudyWordDetail'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import Plan from './pages/Plan'
import Books from './pages/Books'
import Achievements from './pages/Achievements'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * 主导航只有四个一级页面，手机标签栏与桌面左栏完全一致。
 *
 * 词书管理、学习计划、学习成就**刻意不放在这里**：它们都能从「首页」和「我的」进入，
 * 再在全局导航里放一份就是重复入口，只会让导航变吵。
 */
const NAV: NavItem[] = [
  { to: ROUTES.home, label: '首页', icon: House },
  { to: ROUTES.words, label: '单词本', icon: BookOpen },
  { to: ROUTES.stats, label: '统计', icon: ChartColumn },
  { to: ROUTES.profile, label: '我的', icon: User },
]

function Rail() {
  return (
    <nav className="rail" aria-label="主导航">
      <div className="rail__brand">
        <span className="icon-badge icon-badge--lg icon-badge--indigo" aria-hidden>
          <BookOpen size={22} />
        </span>
        <span className="rail__brand-name">词记</span>
      </div>
      <div className="rail__nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `rail__item${isActive ? ' is-active' : ''}`}
          >
            <item.icon size={19} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function TabBar() {
  return (
    <nav className="tabbar" aria-label="主导航">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}
        >
          <item.icon size={21} aria-hidden />
          <span className="tabbar__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function ToastLayer() {
  const toast = useApp((s) => s.toast)
  const dismiss = useApp((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(dismiss, toast.tone === 'warn' ? 3200 : 2400)
    return () => window.clearTimeout(id)
  }, [toast, dismiss])

  if (!toast) return null
  const Icon = toast.tone === 'success' ? CircleCheck : toast.tone === 'warn' ? TriangleAlert : Info
  return (
    <div className="toast-layer">
      <div className={`toast toast--${toast.tone}`} role="status" aria-live="polite">
        <Icon size={16} aria-hidden />
        {toast.text}
      </div>
    </div>
  )
}

function Shell() {
  const location = useLocation()
  const showTabs = !isSessionPath(location.pathname)

  return (
    <div className="app">
      <Rail />
      <div className="app-main">
        {/* key 让每次切换主页面都从顶部开始，避免上一个页面的滚动位置残留 */}
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to={ROUTES.home} replace />} />
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.words} element={<Words />} />
          <Route path="/words/:wordId" element={<WordDetail />} />
          <Route path={ROUTES.review} element={<Review />} />
          <Route path={ROUTES.study} element={<Study />} />
          <Route path="/study/word/:wordId" element={<StudyWordDetail />} />
          <Route path={ROUTES.stats} element={<Stats />} />
          <Route path={ROUTES.profile} element={<Profile />} />
          <Route path={ROUTES.plan} element={<Plan />} />
          <Route path={ROUTES.books} element={<Books />} />
          <Route path={ROUTES.achievements} element={<Achievements />} />
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
        {showTabs ? <TabBar /> : null}
        <ToastLayer />
      </div>
    </div>
  )
}

export default function App() {
  const ready = useApp((s) => s.ready)
  const fatal = useApp((s) => s.fatal)
  const init = useApp((s) => s.init)
  const theme = useApp((s) => s.settings.theme)

  useEffect(() => {
    void init()
    primeVoices()
  }, [init])

  // 系统主题跟随
  useEffect(() => {
    if (theme !== 'system') return
    return watchSystemTheme(() => {
      void useApp.getState().patchSettings({ theme: 'system' })
    })
  }, [theme])

  /** 跨天检查：日期变了就补跑当日任务并通知页面重算 */
  const checkDay = useCallback(async () => {
    const store = useApp.getState()
    const day = todayKey()
    if (store.today === day) return
    await catchUpDailyTasks()
    store.setToday(day)
    store.flash('新的一天开始了，今日任务已刷新')
  }, [])

  /**
   * 每日提醒。
   *
   * 纯本地应用没有推送能力，所以提醒只能在「应用开着」的时候出现：
   * 到点后如果今天的任务还没做完，就给一条轻提示，并用 lastRemindedDay 保证一天只提醒一次。
   * 设置里开了提醒却什么都不发生，比没有这个开关更糟。
   */
  const checkReminder = useCallback(async () => {
    const { settings, today, flash } = useApp.getState()
    if (!settings.reminderEnabled) return
    if (nowHm() < settings.reminderTime) return
    const state = await getRunState()
    if (state.lastRemindedDay === today) return

    const [learn, review] = await Promise.all([
      getQueue(today, 'learn', settings.currentBookId),
      getQueue(today, 'review', settings.currentBookId),
    ])
    const unfinished = [learn, review].some(
      (q) => q && q.target > 0 && q.wordIds.length > 0,
    )
    if (!unfinished) return

    await patchRunState({ lastRemindedDay: today })
    flash('今天的单词还没过完，来记几个吧')
  }, [])

  // 每 60 秒对一次日期与提醒时间：
  // 比「等到零点」更稳（系统时间被改、设备休眠唤醒、跨天都能覆盖）
  useEffect(() => {
    const tick = () => {
      void checkDay()
      void checkReminder()
    }
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [checkDay, checkReminder])

  useOnVisible(() => {
    void checkDay()
    void checkReminder()
  })

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__brand">词记</div>
        <div className="spinner" role="status" aria-label="正在加载" />
        <p className="dim" style={{ fontSize: 13 }}>
          正在准备你的词库…
        </p>
      </div>
    )
  }

  if (fatal) {
    return (
      <div className="boot">
        <span className="icon-badge icon-badge--lg icon-badge--rose" aria-hidden>
          <TriangleAlert size={22} />
        </span>
        <div className="result__title">启动失败</div>
        <p className="result__desc">{fatal}</p>
        <p className="dim" style={{ fontSize: 12 }}>
          可以尝试刷新页面；若仍失败，请在浏览器设置里清理本站数据后重试。
        </p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
