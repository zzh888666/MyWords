/**
 * 视觉方案对比（开发用）
 *
 * 同一个页面、同一份数据，只替换设计令牌与组件样式，拍成图片供挑选。
 * 用法：node scripts/theme-compare.mjs <名称:css路径|名称> ...
 *   例如：node scripts/theme-compare.mjs 现状 a:shots/variant-a.css b:shots/variant-b.css
 */
import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5273'
const OUT = process.env.SHOT_DIR ?? 'shots'
await mkdir(OUT, { recursive: true })

const specs = process.argv.slice(2).map((s) => {
  const [name, css] = s.split(':')
  return { name, css }
})
if (!specs.length) throw new Error('至少给一个 名称[:css路径]')

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'zh-CN',
})

// 先学几个词，让统计/复习/完成度有真实数据（同一个 context 内共享 IndexedDB）
const seed = await ctx.newPage()
await seed.goto(`${BASE}/#/home`, { waitUntil: 'networkidle' })
await seed.waitForSelector('.task-card__name', { timeout: 20000 })
for (let i = 0; i < 6; i++) {
  const word = (await seed.$eval('.wordcard__word', (e) => e.textContent.trim()).catch(() => null))
  if (!word) break
  const answer = await seed.evaluate(async (w) => {
    const db = await new Promise((res) => {
      const r = indexedDB.open('wordlearn-v2')
      r.onsuccess = () => res(r.result)
    })
    return await new Promise((res) => {
      const req = db.transaction('words', 'readonly').objectStore('words').get(w.toLowerCase())
      req.onsuccess = () => res(req.result?.translation ?? null)
    })
  }, word)
  const options = await seed.$$('.option')
  let hit = false
  for (const o of options) {
    const t = (await o.textContent()) ?? ''
    if (answer && t.includes(answer.slice(0, 6))) {
      await o.click()
      hit = true
      break
    }
  }
  if (!hit) break
  await seed.waitForURL(/\/study\/word\//, { timeout: 8000 })
  await seed.click('button:has-text("下一题")')
  await seed.waitForTimeout(350)
}
await seed.close()

for (const { name, css } of specs) {
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/home`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.task-card__name', { timeout: 20000 })
  if (css) await page.addStyleTag({ content: await readFile(css, 'utf8') })

  // 用 hash 切换路由（不重新加载文档），注入的样式才不会丢
  const go = async (hash, selector) => {
    await page.evaluate((h) => {
      window.location.hash = h
    }, hash)
    await page.waitForSelector(selector, { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(600)
  }

  await go('#/home', '.task-card__name')
  await page.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: true })
  await go('#/study', '.wordcard__word')
  await page.screenshot({ path: `${OUT}/${name}-study.png` })
  await go('#/review', '.flipcard')
  await page.screenshot({ path: `${OUT}/${name}-review.png` })
  console.log(`  ✓ ${name}`)
  await page.close()
}

await browser.close()
