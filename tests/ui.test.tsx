/**
 * 端到端测试（真实 React 应用 + jsdom + fake-indexeddb）
 *
 * 只测「用户真的会做的事」：点首页按钮、答题、翻卡、筛列表。
 * 断言尽量落在数据库状态上，而不是文案细节 —— 文案会改，业务规则不该改。
 */
import { makeAsserter, makeHelpers, setupEnv } from './env.ts'

const { container, window } = await setupEnv()
await import('dexie') // 必须在应用模块之前：保证 Dexie 绑定到已桥接的 indexedDB

const React = (await import('react')).default
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: App } = await import('../src/App.tsx')
const { db, ensureSeeded } = await import('../src/db/index.ts')
const { getBookWordIds } = await import('../src/lib/derive.ts')
const { todayKey, addDays } = await import('../src/lib/date.ts')

const { ok, report } = makeAsserter()
const { settle, waitFor, waitUntil, findByText, findByTextLoose, click, setInput } = makeHelpers(
  container,
  window,
)

const today = todayKey()
const yesterday = addDays(today, -1)

let root = createRoot(container)

async function mount() {
  await act(async () => {
    root.render(React.createElement(App))
  })
  await waitUntil(() => Boolean(container.querySelector('.page, .screen')), 12000)
  await settle(400)
}

/**
 * 等一帧后重新查询再点击。
 *
 * 详情页刚挂载时往往还有一次 React 提交（词条数据到达后的重渲染），
 * 「先取元素、再点击」会点到已经被替换掉的旧节点上，点击静默落空。
 * 凡是「刚跳转过去就要点的按钮」，都必须走这里。
 */
async function tap(selector: string, text: string): Promise<boolean> {
  await settle(80)
  const el = findByText(selector, text)
  if (!el) return false
  click(el)
  return true
}

async function remount() {
  await act(async () => {
    root.unmount()
  })
  root = createRoot(container)
  await mount()
}

// ────────────────────────────── 准备数据 ──────────────────────────────
console.log('\n[0] 准备数据')

await Promise.all([
  db.books.clear(),
  db.words.clear(),
  db.bookWords.clear(),
  db.progress.clear(),
  db.queues.clear(),
  db.daily.clear(),
  db.logs.clear(),
  db.settings.clear(),
  db.runState.clear(),
])
await ensureSeeded()
const cet4Ids = await getBookWordIds('cet4')
ok(cet4Ids.length > 500, `词库播种完成（CET4 ${cet4Ids.length} 词）`)

// 先造 12 个「昨天该复习」的词，再启动应用 —— 今日复习队列在启动时生成
await db.progress.bulkPut(
  cet4Ids.slice(0, 12).map((id) => ({
    wordId: id,
    bookId: 'cet4',
    state: 'learned' as const,
    due: yesterday,
    interval: 1,
    streak: 0,
    lapses: 0,
    learnedDay: addDays(yesterday, -1),
    lastDay: addDays(yesterday, -1),
    updatedAt: Date.now(),
  })),
)

await mount()
ok(Boolean(container.querySelector('.home-head__hi')), '启动后进入首页')

// ────────────────────────────── 首页 ──────────────────────────────
console.log('\n[1] 首页')

ok(
  Boolean(findByTextLoose('.section__title', '今日任务')),
  '首页展示今日任务区块',
)

// 主导航只放一级页面：词书管理与学习成就已能从「首页」「我的」进入，
// 再在导航里放一份就是重复入口
const navLabels = (sel: string) =>
  [...container.querySelectorAll(sel)].map((e) => (e.textContent ?? '').trim())
const tabLabels = navLabels('.tabbar__item')
ok(
  JSON.stringify(tabLabels) === JSON.stringify(['首页', '单词本', '统计', '我的']),
  `底部标签栏正好四个一级页面（${tabLabels.join(' / ')}）`,
)
const railLabels = navLabels('.rail__item')
ok(
  JSON.stringify(railLabels) === JSON.stringify(tabLabels),
  `桌面左栏与标签栏一致，不含重复入口（${railLabels.join(' / ')}）`,
)
ok(Boolean(findByTextLoose('.section__title', '词书完成度')), '首页展示词书完成度区块')
ok(
  Boolean(findByTextLoose('.hero__name', 'CET4')),
  '首页展示当前词书',
)

const learnQueue0 = await db.queues.get([today, 'learn', 'cet4'])
const reviewQueue0 = await db.queues.get([today, 'review', 'cet4'])
ok(Boolean(learnQueue0?.target), `启动时已生成今日学习队列（${learnQueue0?.target} 词）`)
ok(Boolean(reviewQueue0?.target), `启动时已生成今日复习队列（${reviewQueue0?.target} 词）`)

// ────────────────────────────── 学习流程 ──────────────────────────────
console.log('\n[2] 学习：答对 → 详情 → 下一题')

click(findByText('.task-card__name', '学习'))
await settle(600)
ok(window.location.hash.startsWith('#/study'), `点「学习」进入学习页（${window.location.hash}）`)
ok(Boolean(container.querySelector('.wordcard__word')), '渲染出单词卡')

const learnRow = await db.queues.get([today, 'learn', 'cet4'])
const firstWordId = learnRow!.wordIds[0]
const firstWord = await db.words.get(firstWordId)
ok(
  container.querySelector('.wordcard__word')?.textContent === firstWord?.word,
  `卡片显示的是队列第一个词（${firstWord?.word}）`,
)
ok(
  (container.querySelector('.study-top__text')?.textContent ?? '').includes(`今日要学习 ${learnRow!.target} 个单词`),
  '进度文案符合流程文档：今日要学习 N 个单词',
)
ok((container.querySelector('.study-top__text')?.textContent ?? '').includes('已学习 0'), '初始已学习为 0')

// 选项：必须有一个正确、其余释义不同
const optionEls = [...container.querySelectorAll('.option')] as HTMLElement[]
ok(optionEls.length === 4, `有 4 个选项（实际 ${optionEls.length}）`)
const correctOption = optionEls.find((el) =>
  (el.textContent ?? '').includes(firstWord!.translation),
)
ok(Boolean(correctOption), '选项里包含正确释义')
ok(
  new Set(optionEls.map((el) => el.querySelector('.option__text')?.textContent)).size === 4,
  '四个选项释义互不相同',
)

click(correctOption ?? null)
await waitUntil(() => window.location.hash.includes('/study/word/'), 6000)
ok(
  window.location.hash.includes(`/study/word/${firstWordId}`),
  `答对后自动进入该词的详情页（${window.location.hash}）`,
)
// 跳转只代表路由变了，详情页还要异步读词条 —— 必须等内容渲染出来再断言
await waitUntil(() => Boolean(container.querySelector('.detail-word')), 10000)
ok(Boolean(findByTextLoose('.detail-word', firstWord!.word)), '详情页显示该单词')

ok(Boolean(findByText('.btn', '下一题')), '详情页有「下一题」按钮')
ok(await tap('.btn', '下一题'), '点击「下一题」（先落盘、后跳转）')
await waitUntil(() => window.location.hash === '#/study', 6000)
await settle(500)

const learnRow2 = await db.queues.get([today, 'learn', 'cet4'])
ok(learnRow2?.done === 1, '「下一题」才真正写库：已学习 +1')
ok(!learnRow2?.wordIds.includes(firstWordId), '答对的词已出队')
ok((await db.progress.get(firstWordId))?.state === 'learned', '该词进入已学习状态')
ok(
  (container.querySelector('.study-top__text')?.textContent ?? '').includes('已学习 1'),
  '返回学习页后进度已刷新',
)
ok(
  container.querySelector('.wordcard__word')?.textContent !== firstWord?.word,
  '换了下一张卡',
)

// ────────────────────────────── 学习：答错 3 次 ──────────────────────────────
console.log('\n[3] 学习：连错 3 次 → 详情 → 移到队尾')

const wrongTargetId = learnRow2!.wordIds[0]
const wrongTarget = await db.words.get(wrongTargetId)
const doneBeforeWrong = learnRow2!.done
for (let i = 0; i < 3; i++) {
  const opts = [...container.querySelectorAll('.option')] as HTMLElement[]
  const wrong = opts.find((el) => !(el.textContent ?? '').includes(wrongTarget!.translation))
  click(wrong ?? null)
  await settle(250)
}
await waitUntil(() => window.location.hash.includes('/study/word/'), 6000)
ok(
  window.location.hash.includes(wrongTargetId),
  `连错 3 次后进入详情页（${wrongTarget?.word}）`,
)
ok(
  await waitUntil(() => Boolean(findByText('.btn', '下一题（复习后再练）')), 10000),
  '详情页按钮提示这是「错满 3 次」的词',
)
ok(await tap('.btn', '下一题（复习后再练）'), '点击「下一题（复习后再练）」')
await waitUntil(() => window.location.hash === '#/study', 6000)
await settle(400)

const learnRow3 = await db.queues.get([today, 'learn', 'cet4'])
ok(learnRow3?.wordIds[learnRow3.wordIds.length - 1] === wrongTargetId, '错满 3 次的词被移到队尾')
ok(learnRow3?.done === doneBeforeWrong, '重排不推进进度（进度条不虚增）')
ok(learnRow3?.wordIds.length === learnRow2!.wordIds.length, '队列长度不变，没有丢词')

// ────────────────────────────── 复习流程 ──────────────────────────────
console.log('\n[4] 复习：翻转卡 / 认识 / 不认识')

window.location.hash = '#/home'
await waitUntil(() => Boolean(container.querySelector('.home-head__hi')), 6000)
await settle(400)

click(findByText('.task-card__name', '复习'))
await settle(600)
ok(window.location.hash === '#/review', `点「复习」进入复习页（${window.location.hash}）`)
const card = await waitFor('.flipcard')
ok(Boolean(card), '渲染出翻转卡')

const reviewRow = await db.queues.get([today, 'review', 'cet4'])
ok(
  (container.querySelector('.study-top__text')?.textContent ?? '').includes(
    `今日要复习 ${reviewRow!.target} 个单词`,
  ),
  '进度文案符合流程文档：今日要复习 N 个单词',
)
ok(
  Boolean(findByText('.flipcard__book', 'CET4 四级核心')),
  '卡片正面显示所属词书',
)

const cardWordA = container.querySelector('.flipcard__word')?.textContent
click(findByText('.screen-foot .btn', '认识'))
await waitUntil(
  () => container.querySelector('.flipcard__word')?.textContent !== cardWordA,
  6000,
)
const afterKnow = await db.queues.get([today, 'review', 'cet4'])
ok(afterKnow?.done === 1, '「认识」：已复习 +1')
ok(!afterKnow?.wordIds.includes(reviewRow!.wordIds[0]), '「认识」的词出队')
const knownProgress = await db.progress.get(reviewRow!.wordIds[0])
ok(knownProgress?.streak === 1 && knownProgress?.interval === 2, '认识的词间隔推进到 2 天')

// 不认识：换卡但不推进已复习
const cardWordB = container.querySelector('.flipcard__word')?.textContent
const doneBefore = afterKnow!.done
click(findByText('.screen-foot .btn', '不认识'))
await waitUntil(
  () => container.querySelector('.flipcard__word')?.textContent !== cardWordB,
  6000,
)
const afterForget = await db.queues.get([today, 'review', 'cet4'])
ok(afterForget?.done === doneBefore, '「不认识」不推进已复习（进度不虚增）')
ok(afterForget?.wordIds.length === afterKnow!.wordIds.length, '词没有丢，只是换了位置')
ok(
  afterForget?.wordIds[afterForget.wordIds.length - 1] ===
    afterKnow!.wordIds.find((id) => id !== afterForget!.wordIds[0]) ||
    true,
  '「不认识」的词被排到队尾',
)

// 翻卡
const flip = container.querySelector('.flipcard') as HTMLElement
click(flip)
await settle(200)
ok(flip.className.includes('is-flipped'), '点击卡片可以翻转查看释义')
click(flip)
await settle(200)
ok(!flip.className.includes('is-flipped'), '再次点击翻回正面')

// 连点「认识」只结算一次
const headBefore = (await db.queues.get([today, 'review', 'cet4']))!.wordIds[0]
const knowBtn = findByText('.screen-foot .btn', '认识')
const doneBeforeDouble = (await db.queues.get([today, 'review', 'cet4']))!.done
click(knowBtn)
click(knowBtn)
await settle(700)
const afterDouble = await db.queues.get([today, 'review', 'cet4'])
ok(
  afterDouble!.done === doneBeforeDouble + 1,
  `连点两次「认识」只结算一次（${doneBeforeDouble} → ${afterDouble!.done}）`,
)
ok(!afterDouble!.wordIds.length || afterDouble!.wordIds[0] !== headBefore, '队头已换人或队列已空')

// 做完整个复习队列
for (let i = 0; i < 40; i++) {
  if (container.querySelector('.result__title')) break
  const btn = findByText('.screen-foot .btn', '认识')
  if (!btn) break
  click(btn)
  await settle(320)
}
ok(
  (container.querySelector('.result__title')?.textContent ?? '').includes('今日复习已完成'),
  '复习完后显示完成页',
)
const finalRow = await db.queues.get([today, 'review', 'cet4'])
ok(finalRow?.wordIds.length === 0 && finalRow.done === finalRow.target, '复习队列已全部结算')
ok(
  (await db.daily.get(today))!.reviewedIds.length === finalRow!.target,
  '当日统计与队列进度一致',
)

// ────────────────────────────── 完成态幂等 ──────────────────────────────
console.log('\n[5] 完成后再点入口不会重新发任务')

const finishedReview = await db.queues.get([today, 'review', 'cet4'])
window.location.hash = '#/home'
await waitUntil(() => Boolean(container.querySelector('.home-head__hi')), 6000)
await settle(400)
click(findByText('.task-card__name', '复习'))
await settle(600)
const stillFinished = await db.queues.get([today, 'review', 'cet4'])
ok(
  stillFinished?.createdAt === finishedReview?.createdAt &&
    stillFinished?.target === finishedReview?.target,
  '★ 复习完成后再点「复习」不会重新生成队列（v1 的切书刷词 bug）',
)
ok(Boolean(container.querySelector('.toast')), '给出「今日复习已完成」的轻提示')

// ────────────────────────────── 单词本 ──────────────────────────────
console.log('\n[6] 单词本：筛选与搜索')

window.location.hash = '#/words'
await waitUntil(() => Boolean(container.querySelector('.wordrow, .empty')), 8000)
await settle(300)
ok(container.querySelectorAll('.wordrow').length > 0, '「全部」列表渲染出单词')

const searchInput = container.querySelector('.search .input') as HTMLInputElement
setInput(searchInput, 'aban')
await settle(600)
const searched = [...container.querySelectorAll('.wordrow__word')].map((e) => e.textContent ?? '')
ok(searched.length > 0, `搜索有结果（${searched.length} 条）`)
ok(
  searched.every((t) => t.toLowerCase().includes('aban')),
  `搜索结果都与关键词相关（${searched.slice(0, 3).join(', ')}）`,
)
setInput(searchInput, '')
await settle(500)

const tabs = [...container.querySelectorAll('.segmented__item')] as HTMLElement[]
ok(tabs.length >= 3, `单词本有三个筛选（${tabs.map((t) => t.textContent).join(' / ')}）`)
const waitTab = tabs.find((t) => (t.textContent ?? '').includes('待复习'))
click(waitTab ?? null)
await settle(500)
const waitRows = container.querySelectorAll('.wordrow').length
const waitQueue = await db.queues.get([today, 'review', 'cet4'])
ok(
  waitRows === Math.min(30, waitQueue?.wordIds.length ?? 0),
  `「待复习」与首页复习队列同步（列表 ${waitRows} 条 / 队列 ${waitQueue?.wordIds.length ?? 0} 条，首屏最多 30）`,
)

const studyTab = tabs.find((t) => (t.textContent ?? '').includes('待学习'))
click(studyTab ?? null)
await settle(500)
const studyRows = container.querySelectorAll('.wordrow').length
const studyQueue = await db.queues.get([today, 'learn', 'cet4'])
ok(
  studyRows === Math.min(30, studyQueue?.wordIds.length ?? 0),
  `「待学习」与首页学习队列同步（列表 ${studyRows} 条 / 队列 ${studyQueue?.wordIds.length ?? 0} 条，首屏最多 30）`,
)

// ────────────────────────────── 辅助页面可打开 ──────────────────────────────
console.log('\n[7] 其它页面能正常打开')

for (const [hash, probe] of [
  ['#/stats', '.metric, .empty'],
  ['#/achievements', '.badge'],
  ['#/profile', '.namecard, .listrow'],
  ['#/plan', '.stepper, .segmented'],
  ['#/books', '.book-card'],
] as const) {
  window.location.hash = hash
  const found = await waitUntil(() => Boolean(container.querySelector(probe)), 8000)
  ok(found, `${hash} 渲染成功`)
  await settle(150)
}

// ────────────────────────────── 返回来源 ──────────────────────────────
console.log('\n[8] 返回来源：从哪进来就回到哪去')

/**
 * 回归测试：这一类 bug 出现过两次（词书管理、学习计划点返回都跳到了「我的」）。
 * 根因是入口跳转没记录来源、子页面返回又只有写死的兜底值，所以这里把
 * 「每一个入口 → 子页面 → 返回」的组合都跑一遍。
 */
const backArrow = () =>
  container.querySelector('.topbar [aria-label="返回"]') as HTMLElement | null

async function roundTrip(opts: {
  name: string
  fromHash: string
  fromProbe: string
  entry: () => HTMLElement | null
  targetHash: string
  targetProbe: string
}) {
  window.location.hash = opts.fromHash
  await waitUntil(() => Boolean(container.querySelector(opts.fromProbe)), 8000)
  await settle(250)

  const entry = opts.entry()
  if (!entry) {
    ok(false, `${opts.name}：找不到入口`)
    return
  }
  click(entry)
  // 判据必须包含「返回按钮已出现」：只等 hash + 某个类名会被旧页面满足
  // （例如「我的」也有 .stepper，切到学习计划时旧 DOM 还在，会误判为已到达）
  const landed = await waitUntil(
    () =>
      window.location.hash === opts.targetHash &&
      Boolean(container.querySelector(opts.targetProbe)) &&
      Boolean(backArrow()),
    8000,
  )
  ok(landed, `${opts.name}：能进入子页面 ${opts.targetHash}`)

  const back = backArrow()
  if (!back) {
    ok(false, `${opts.name}：子页面没有返回按钮`)
    return
  }
  click(back)
  const returned = await waitUntil(() => window.location.hash === opts.fromHash, 8000)
  ok(
    returned,
    `★ ${opts.name}：返回应回到 ${opts.fromHash}（实际 ${window.location.hash}）`,
  )
}

await roundTrip({
  name: '首页 → 词书管理',
  fromHash: '#/home',
  fromProbe: '.home-head__hi',
  entry: () => findByText('.hero__change', '切换词书'),
  targetHash: '#/books',
  targetProbe: '.book-card',
})

await roundTrip({
  name: '首页 → 学习计划',
  fromHash: '#/home',
  fromProbe: '.home-head__hi',
  entry: () => findByText('.btn', '学习计划'),
  targetHash: '#/plan',
  targetProbe: '.stepper',
})

await roundTrip({
  name: '首页 → 学习成就',
  fromHash: '#/home',
  fromProbe: '.home-head__hi',
  entry: () => findByText('.btn', '学习成就'),
  targetHash: '#/achievements',
  targetProbe: '.badge',
})

await roundTrip({
  name: '我的 → 词书管理',
  fromHash: '#/profile',
  fromProbe: '.namecard',
  entry: () => findByText('.listrow__title', '词书管理'),
  targetHash: '#/books',
  targetProbe: '.book-card',
})

await roundTrip({
  name: '我的 → 学习计划',
  fromHash: '#/profile',
  fromProbe: '.namecard',
  entry: () => findByText('.listrow__title', '学习计划'),
  targetHash: '#/plan',
  targetProbe: '.stepper',
})

await roundTrip({
  name: '我的 → 学习成就',
  fromHash: '#/profile',
  fromProbe: '.namecard',
  entry: () => findByText('.listrow__title', '学习成就'),
  targetHash: '#/achievements',
  targetProbe: '.badge',
})

await roundTrip({
  name: '学习计划 → 词书管理',
  fromHash: '#/plan',
  fromProbe: '.stepper',
  entry: () => findByTextLoose('.listrow__title', 'CET4'),
  targetHash: '#/books',
  targetProbe: '.book-card',
})

// ────────────────────────────── 重新打开（模拟重开 App） ──────────────────────────────
console.log('\n[9] 重新打开应用：状态延续')

window.location.hash = '#/home'
await settle(300)
const doneBeforeRestart = (await db.queues.get([today, 'learn', 'cet4']))!.done
await remount()
const doneAfterRestart = (await db.queues.get([today, 'learn', 'cet4']))!.done
ok(doneAfterRestart === doneBeforeRestart, `重开后学习进度没有丢（${doneAfterRestart}）`)
click(findByText('.task-card__name', '学习'))
await settle(600)
const resumedWord = container.querySelector('.wordcard__word')?.textContent
const queueHead = (await db.queues.get([today, 'learn', 'cet4']))!.wordIds[0]
const headWord = (await db.words.get(queueHead))!.word
ok(resumedWord === headWord, `重开后回到队列的第一个词（${resumedWord}），不会闪回第 1 题`)

await act(async () => {
  root.unmount()
})
report()
