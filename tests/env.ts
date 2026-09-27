/**
 * 测试环境装配器
 *
 * 用 jsdom 提供 DOM，用 fake-indexeddb 提供 IndexedDB，然后把真实的 React 应用挂载进去。
 *
 * ⚠️ 必须在加载 React / Dexie / 应用代码之前完成装配：
 * Dexie 会在模块加载那一刻读取 globalThis.indexedDB，顺序错了 liveQuery 会静默失效。
 * 因此本文件只能通过「动态 import」使用，调用方不能有顶层 import。
 */

export interface TestEnv {
  dom: InstanceType<typeof import('jsdom').JSDOM>
  container: HTMLElement
  window: Window & typeof globalThis
}

/** 搭好浏览器全局并返回容器；调用方随后自行 import 应用模块 */
export async function setupEnv(url = 'http://127.0.0.1:5273/'): Promise<TestEnv> {
  await import('fake-indexeddb/auto')
  const { JSDOM } = await import('jsdom')

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url,
    pretendToBeVisual: true,
  })
  const g = globalThis as unknown as Record<string, unknown>
  const expose = (k: string, v: unknown) =>
    Object.defineProperty(g, k, { value: v, configurable: true, writable: true })

  expose('window', dom.window)
  expose('document', dom.window.document)
  expose('navigator', dom.window.navigator)
  for (const k of [
    'HTMLElement',
    'HTMLInputElement',
    'HTMLButtonElement',
    'Element',
    'Node',
    'Event',
    'CustomEvent',
    'KeyboardEvent',
    'MouseEvent',
    'TouchEvent',
    'Blob',
    'getComputedStyle',
  ] as const) {
    expose(k, (dom.window as unknown as Record<string, unknown>)[k])
  }
  expose('getComputedStyle', dom.window.getComputedStyle.bind(dom.window))
  expose('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0))
  expose('cancelAnimationFrame', (id: number) => clearTimeout(id))
  expose('localStorage', dom.window.localStorage)
  expose('IS_REACT_ACT_ENVIRONMENT', true)

  // fake-indexeddb 挂在真实 globalThis 上，jsdom window 是另一个对象，需要双向桥接
  for (const k of [
    'indexedDB',
    'IDBKeyRange',
    'IDBRequest',
    'IDBTransaction',
    'IDBDatabase',
    'IDBObjectStore',
    'IDBIndex',
    'IDBCursor',
    'IDBFactory',
  ] as const) {
    const v = g[k]
    if (v) expose(k, v)
    ;(dom.window as unknown as Record<string, unknown>)[k] = v
  }
  if (!dom.window.indexedDB) throw new Error('IndexedDB 桥接失败，无法运行 UI 测试')

  /**
   * jsdom 没有 IntersectionObserver，而单词本用它在滚动到底部时加载下一批。
   * 这里给一个不触发回调的空实现：测试里只断言首批数据已渲染，
   * 不去模拟滚动加载（jsdom 没有真实布局，模拟出来的行为没有意义）。
   */
  class IntersectionObserverStub {
    constructor(_cb: unknown) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  expose('IntersectionObserver', IntersectionObserverStub)
  ;(dom.window as unknown as Record<string, unknown>).IntersectionObserver =
    IntersectionObserverStub

  // jsdom 未实现 matchMedia，应用用它判断深色模式
  ;(dom.window as unknown as Record<string, unknown>).matchMedia = (q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })

  return {
    dom,
    container: dom.window.document.getElementById('root') as HTMLElement,
    window: dom.window as unknown as Window & typeof globalThis,
  }
}

/** 在真实 React 应用里操作 DOM 的辅助工具 */
export function makeHelpers(container: HTMLElement, window: Window & typeof globalThis) {
  /**
   * 等待并让 React 冲刷更新。
   *
   * 顺序很讲究，踩过两次坑：
   *  1. **先在 act 之外等待**。实测在 `act(async () => sleep(3000))` 里，
   *     Dexie liveQuery 的首个查询根本不会启动（3 秒过去仍是骨架屏）；
   *     放到 act 外面等，查询与发射都正常。
   *  2. **再用一次空 act 冲刷**。liveQuery 的发射发生在 act 之外，
   *     React 会把这类更新挂起，需要一次 act 边界才会真正渲染进 DOM。
   */
  const settle = async (ms = 120) => {
    await new Promise((r) => setTimeout(r, ms))
    const { act } = await import('react')
    await act(async () => {})
  }

  const waitFor = async (selector: string, timeout = 8000): Promise<Element | null> => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const el = container.querySelector(selector)
      if (el) return el
      await settle(30)
    }
    return null
  }

  const waitUntil = async (cond: () => boolean, timeout = 4000): Promise<boolean> => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (cond()) return true
      await settle(40)
    }
    return cond()
  }

  /**
   * 按「精确文本」查找元素。
   *
   * 必须精确匹配：按钮文案里有「不认识」与「认识」这类包含关系，
   * 用 includes 会把「认识」匹配到「不认识」按钮上（踩过一次）。
   * 需要模糊匹配时请显式使用 findByTextLoose。
   */
  const findByText = (selector: string, text: string): HTMLElement | null => {
    const els = [...container.querySelectorAll(selector)] as HTMLElement[]
    return els.find((el) => (el.textContent ?? '').trim() === text) ?? null
  }

  /** 模糊匹配（子串），仅在确实需要时使用 */
  const findByTextLoose = (selector: string, text: string): HTMLElement | null => {
    const els = [...container.querySelectorAll(selector)] as HTMLElement[]
    return els.find((el) => (el.textContent ?? '').includes(text)) ?? null
  }

  const click = (el: Element | null) => {
    if (!el) return
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  }

  const setInput = (el: HTMLInputElement | null, value: string) => {
    if (!el) return
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(el, value)
    el.dispatchEvent(new window.Event('input', { bubbles: true }))
  }

  return { settle, waitFor, waitUntil, findByText, findByTextLoose, click, setInput }
}

/** 极简断言器：统计通过 / 失败并打印 */
export function makeAsserter() {
  let pass = 0
  let fail = 0
  const failures: string[] = []
  const ok = (cond: boolean, msg: string) => {
    if (cond) {
      pass++
      console.log('  ✓', msg)
    } else {
      fail++
      failures.push(msg)
      console.log('  ✗ FAIL:', msg)
    }
  }
  const report = (): never => {
    console.log(`\n════════ 结果: ${pass} 通过, ${fail} 失败 ════════`)
    if (failures.length) {
      console.log('失败项:')
      failures.forEach((f) => console.log('  -', f))
    }
    process.exit(fail ? 1 : 0)
  }
  return { ok, report, counts: () => ({ pass, fail }) }
}
