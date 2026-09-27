/** 全部路由路径：集中定义，避免各处硬编码字符串拼错 */
export const ROUTES = {
  home: '/home',
  words: '/words',
  word: (wordId: string) => `/words/${encodeURIComponent(wordId)}`,
  review: '/review',
  study: '/study',
  studyWord: (wordId: string) => `/study/word/${encodeURIComponent(wordId)}`,
  stats: '/stats',
  profile: '/profile',
  plan: '/plan',
  books: '/books',
  achievements: '/achievements',
} as const

/** 会话类页面：全屏专注，不显示底部标签栏 */
export function isSessionPath(pathname: string): boolean {
  return pathname.startsWith('/study') || pathname === ROUTES.review
}
