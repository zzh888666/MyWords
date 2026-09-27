/**
 * 界面截图（开发用）
 *
 * 这台开发机原本没有浏览器，界面是「照着色板写 CSS、却从没看过渲染结果」，
 * 所以做视觉评审前先用它把页面拍下来。
 *
 * 用法：
 *   PLAYWRIGHT_BROWSERS_PATH=$PWD/.pw-browsers node scripts/shots.mjs [输出目录]
 * 前置：开发服务器已在 5273 运行。
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5273'
const OUT = process.argv[2] ?? 'shots'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 860 }

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()

/** 打开应用、做一次「学习」动作，让统计/复习页有真实数据 */
async function prepare(page) {
  await page.goto(`${BASE}/#/home`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.task-card__name', { timeout: 20000 })
  // 必须先进入学习页，否则下面找不到 .wordcard__word 会直接跳出循环
  await page.click('.task-card--learn')
  await page.waitForSelector('.wordcard__word', { timeout: 15000 })
}

/** 学掉前 n 个词：点正确选项 → 详情页 → 下一题 */
async function learnWords(page, n) {
  for (let i = 0; i < n; i++) {
    const card = await page.$('.wordcard__word')
    if (!card) break
    const word = (await card.textContent())?.trim()
    // 从词库接口拿不到释义，直接用页面上的选项 + 详情页校验：
    // 这里借助 app 自己的数据：把每个选项点一遍太慢，改为读页面注入的正确答案
    const answer = await page.evaluate(async (w) => {
      const db = await new Promise((res) => {
        const r = indexedDB.open('wordlearn-v2')
        r.onsuccess = () => res(r.result)
      })
      return await new Promise((res) => {
        const tx = db.transaction('words', 'readonly')
        const req = tx.objectStore('words').get(w.toLowerCase())
        req.onsuccess = () => res(req.result?.translation ?? null)
      })
    }, word)
    const options = await page.$$('.option')
    let clicked = false
    for (const o of options) {
      const t = (await o.textContent()) ?? ''
      if (answer && t.includes(answer.slice(0, 8))) {
        await o.click()
        clicked = true
        break
      }
    }
    if (!clicked) break
    await page.waitForURL(/\/study\/word\//, { timeout: 8000 })
    await page.click('button:has-text("下一题")')
    await page.waitForTimeout(400)
  }
}

async function shoot(page, name, hash, selector, opts = {}) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'networkidle' })
  if (selector) await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(opts.wait ?? 700)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.full ?? false })
  console.log(`  ✓ ${OUT}/${name}.png`)
}

// ── 手机端 ──
const mobile = await browser.newPage({ viewport: MOBILE, deviceScaleFactor: 2 })
await prepare(mobile)
await learnWords(mobile, 6)

console.log('手机端截图：')
await shoot(mobile, 'm-home', '/home', '.task-card__name')
await shoot(mobile, 'm-home-full', '/home', '.task-card__name', { full: true })
await shoot(mobile, 'm-study', '/study', '.wordcard__word')
await shoot(mobile, 'm-word-detail', '/words/abandon', '.detail-word', { full: true })
await shoot(mobile, 'm-words', '/words', '.wordrow')
await shoot(mobile, 'm-stats', '/stats', '.metric', { full: true })
await shoot(mobile, 'm-profile', '/profile', '.namecard', { full: true })
await shoot(mobile, 'm-plan', '/plan', '.stepper')
await shoot(mobile, 'm-books', '/books', '.book-card')
await shoot(mobile, 'm-achievements', '/achievements', '.badge')

// ── 桌面端 ──
const desktop = await browser.newPage({ viewport: DESKTOP })
await prepare(desktop)
console.log('桌面端截图：')
await shoot(desktop, 'd-home', '/home', '.task-card__name')
await shoot(desktop, 'd-words', '/words', '.wordrow')

await browser.close()
console.log('完成')
