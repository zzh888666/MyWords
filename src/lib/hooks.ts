/**
 * Dexie liveQuery 的 React 封装
 *
 * 为什么不用 dexie-react-hooks 的 useLiveQuery：
 * 它的依赖数组在每次渲染时都会重新订阅（传空数组也会），实测会造成无限重订阅；
 * 这里用 useRef 固定查询函数、用 deps 精确控制订阅时机。
 */
import { useEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'

/** 稳定的空数组引用：避免每次渲染都产生新引用导致子组件重渲染 */
export const EMPTY_LIST: never[] = []

export function useQuery<T>(
  querier: () => Promise<T> | T,
  deps: readonly unknown[],
  initial: T,
): T {
  const fnRef = useRef(querier)
  fnRef.current = querier
  const [value, setValue] = useState<T>(initial)

  useEffect(() => {
    const sub = liveQuery(() => fnRef.current()).subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error('[useQuery]', e),
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return value
}

/** 窗口重新可见（手机切回前台）时触发回调：用于跨天检查 */
export function useOnVisible(fn: () => void): void {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') ref.current()
    }
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('focus', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }, [])
}
