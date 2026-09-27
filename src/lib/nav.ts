/**
 * 导航与返回来源
 *
 * 这类 bug 在本项目已经出现过两次（词书管理、学习计划返回时都跳到了「我的」）：
 * 入口跳转时没有记录来源，子页面的返回就只剩下写死的兜底值可用。
 * 现在改成两层防护，让「忘记传来源」也不会跳错页面：
 *
 *   1. `useGo()`     —— 所有「进入子页面」的跳转都用它，自动把当前路径写进 location.state.from
 *   2. `useGoBack()` —— 优先用记录下来的来源；没有记录就退回浏览器历史；最后才用兜底值
 */
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface NavState {
  from?: string
}

export function navState(from: string): { state: NavState } {
  return { state: { from } }
}

export function fromOf(state: unknown): string | null {
  if (state && typeof state === 'object' && 'from' in state) {
    const from = (state as NavState).from
    return typeof from === 'string' && from.startsWith('/') ? from : null
  }
  return null
}

/**
 * 记录来源的导航。
 *
 * 凡是「点进去之后还能返回」的跳转都应该用它：
 * ```ts
 * const go = useGo()
 * go(ROUTES.books)
 * ```
 * 它会把当前路径（含查询参数，例如单词详情的 `?scope=`）一并记下来，
 * 返回时就能精确回到用户出发的那一页。
 */
export function useGo(): (to: string, opts?: { replace?: boolean }) => void {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  return useCallback(
    (to: string, opts?: { replace?: boolean }) => {
      navigate(to, { replace: opts?.replace, state: { from: `${pathname}${search}` } })
    },
    [navigate, pathname, search],
  )
}

/**
 * 返回。三级兜底，保证任何情况下都不会跳到用户没去过的页面：
 *   1. `location.state.from` —— 精确回到出发页（保留筛选、scope 等查询参数）
 *   2. 浏览器历史后退 —— 没有来源记录时，按用户真实的操作顺序回退
 *   3. `fallback` —— 直接打开链接 / 新标签页首次进入时才用到
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  const { state } = useLocation()
  return useCallback(() => {
    const from = fromOf(state)
    if (from) {
      navigate(from, { replace: true })
      return
    }
    const idx = (window.history?.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }, [navigate, state, fallback])
}
