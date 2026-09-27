/**
 * 主题：把设置里的 light / dark / system 落到 <html data-theme>
 * 只改一个属性，配色全部由 styles.css 的 CSS 变量接管。
 */
import type { ThemeMode } from '../types'

function prefersDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function resolveDark(theme: ThemeMode): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark())
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  root.dataset.theme = resolveDark(theme) ? 'dark' : 'light'
}

/** system 模式下跟随系统切换；返回取消订阅函数 */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mq?.addEventListener) return () => {}
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
