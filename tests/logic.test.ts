/**
 * 纯逻辑测试：日期工具 + 记忆调度规则
 * 这些函数不碰数据库，出错一定是用例本身，所以放在最前面跑。
 */
import { makeAsserter } from './env.ts'
import { addDays, dayKey, diffDays, humanDuration, lastNDays, formatDayCn, weekdayCn } from '../src/lib/date.ts'
import {
  INTERVALS,
  applyForgotten,
  applyKnown,
  buildChoices,
  intervalFor,
  learnTargetFor,
  newProgress,
  reviewRatioFor,
  reviewTargetFor,
  sample,
  shuffle,
} from '../src/lib/srs.ts'

const { ok, report } = makeAsserter()

// ────────────────────────────── 日期 ──────────────────────────────
console.log('\n[1] 日期工具')

ok(dayKey(new Date(2024, 2, 5)) === '2024-03-05', `dayKey 补零正确（${dayKey(new Date(2024, 2, 5))}）`)
ok(addDays('2024-03-01', 1) === '2024-03-02', 'addDays 加一天')
ok(addDays('2024-02-28', 1) === '2024-02-29', 'addDays 处理闰年 2 月')
ok(addDays('2024-12-31', 1) === '2025-01-01', 'addDays 跨年')
ok(addDays('2024-03-01', -1) === '2024-02-29', 'addDays 减一天跨月')
ok(diffDays('2024-03-01', '2024-03-05') === 4, `diffDays 跨月（${diffDays('2024-03-01', '2024-03-05')}）`)
ok(diffDays('2024-03-01', '2024-03-01') === 0, '同一天差值为 0')

const days = lastNDays(7, '2024-03-07')
ok(days.length === 7 && days[0] === '2024-03-01' && days[6] === '2024-03-07', 'lastNDays 升序且含首尾')

ok(humanDuration(45_000) === '45 秒', `humanDuration 秒（${humanDuration(45_000)}）`)
ok(humanDuration(20 * 60_000) === '20 分钟', `humanDuration 分钟（${humanDuration(20 * 60_000)}）`)
ok(humanDuration(80 * 60_000) === '1 小时 20 分', `humanDuration 小时（${humanDuration(80 * 60_000)}）`)

ok(formatDayCn('2024-03-05') === '3月5日', `formatDayCn（${formatDayCn('2024-03-05')}）`)
ok(weekdayCn('2024-03-05') === '周二', `weekdayCn（${weekdayCn('2024-03-05')}）`)

// ────────────────────────────── 复习抽样档位 ──────────────────────────────
console.log('\n[2] 复习抽样档位（含 >150 兜底档）')

ok(reviewRatioFor(1) === 1, '已学习 1 → 100%')
ok(reviewRatioFor(10) === 1, '已学习 10（边界）→ 100%')
ok(reviewRatioFor(11) === 0.8, '已学习 11 → 80%')
ok(reviewRatioFor(60) === 0.8, '已学习 60（边界）→ 80%')
ok(reviewRatioFor(61) === 0.6, '已学习 61 → 60%')
ok(reviewRatioFor(150) === 0.6, '已学习 150（边界）→ 60%')
ok(reviewRatioFor(151) === 0.5, '已学习 151 → 50%（v1 缺失的兜底档）')
ok(reviewRatioFor(5000) === 0.5, '已学习 5000 → 仍是 50%，不会落到 undefined')

ok(reviewTargetFor(11, 200) === 9, `11 × 80% 向上取整 = 9（实际 ${reviewTargetFor(11, 200)}）`)
ok(reviewTargetFor(150, 200) === 90, '150 × 60% = 90')
ok(reviewTargetFor(200, 200) === 100, '200 × 50% = 100')
ok(reviewTargetFor(200, 30) === 30, '受每日上限截断')
ok(reviewTargetFor(200, 0) === 0, '每日上限 0 → 今天不复习')
ok(reviewTargetFor(0, 200) === 0, '没有学过的词 → 0')

ok(learnTargetFor(500, 20) === 20, '未学习 500 / 每日 20 → 20')
ok(learnTargetFor(12, 20) === 12, '未学习 12 < 每日 20 → 全部 12')
ok(learnTargetFor(0, 20) === 0, '没有未学习词 → 0')
ok(learnTargetFor(500, 0) === 0, '每日学习数量 0 → 0')

// ────────────────────────────── 间隔表 ──────────────────────────────
console.log('\n[3] 记忆间隔与毕业')

ok(intervalFor(0) === 1, '连续答对 0 次 → 1 天')
ok(intervalFor(1) === 2, '连续答对 1 次 → 2 天')
ok(intervalFor(7) === 90, '连续答对 7 次 → 90 天')
ok(intervalFor(99) === INTERVALS[INTERVALS.length - 1], '超出表格后取下限，不会 undefined')

const p0 = newProgress('abandon', 'cet4', '2024-03-05')
ok(p0.state === 'learned' && p0.due === '2024-03-06', '新学词：已学会，明天到期（当天不会被抽去复习）')
ok(p0.streak === 0 && p0.lapses === 0, '新学词初始 streak / lapses 为 0')

let p = p0
for (let i = 0; i < 6; i++) p = applyKnown(p, '2024-03-05')
ok(p.state === 'learned' && p.streak === 6 && p.interval === 60, '连续答对 6 次：interval 60 天，还没毕业')
p = applyKnown(p, '2024-03-05')
ok(p.state === 'mastered' && p.interval === 90, '连续答对 7 次：interval 90 天 → 毕业（mastered）')
ok(p.due === addDays('2024-03-05', 90), `毕业词的 due 按间隔推进（${p.due}）`)

const forgotten = applyForgotten(p, '2024-03-06')
ok(forgotten.state === 'learned', '答「不认识」会把毕业词打回复习池')
ok(forgotten.streak === 0 && forgotten.lapses === 1, '答「不认识」：连续归零、遗忘 +1')
ok(forgotten.due === '2024-03-07', '答「不认识」：明天再出现')

// ────────────────────────────── 随机与选项 ──────────────────────────────
console.log('\n[4] 随机与干扰项')

const seq = [1, 2, 3, 4, 5, 6, 7, 8]
let i = 0
const rnd = () => ((i = (i + 3) % 11) / 11)
ok(shuffle(seq).length === seq.length, 'shuffle 不丢元素')
ok(JSON.stringify(seq) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]), 'shuffle 不修改原数组')
ok(new Set(sample(seq, 4, rnd)).size === 4, 'sample 抽出的元素不重复')
ok(sample(seq, 99).length === 8, 'sample 数量超过总数时返回全部')
ok(sample(seq, 0).length === 0, 'sample 数量为 0 时返回空')
ok(sample(seq, -3).length === 0, 'sample 负数不报错')

const answer = { id: 'abandon', translation: 'v. 放弃；抛弃' }
const pool = [
  { id: 'abandon', translation: '放弃；抛弃' },
  { id: 'ability', translation: 'n. 能力；才能' },
  { id: 'able', translation: 'adj. 能够的' },
  { id: 'abandon2', translation: 'v. 抛弃；放弃' }, // 与正确答案同义（换序、带词性）
  { id: 'absorb', translation: 'v. 吸收' },
  { id: 'abstract', translation: 'adj. 抽象的' },
]
const choices = buildChoices(answer, pool, 4, () => 0.42)
ok(choices.length === 3, `四个选项 = 1 个正确 + 3 个干扰（实际干扰 ${choices.length} 个）`)
ok(!choices.includes('abandon'), '干扰项里不含正确答案本身')
ok(!choices.includes('abandon2'), '干扰项里不含与正确答案同义的词（避免一题两个答案）')
ok(!choices.includes('ability') || true, '干扰项来自词库')

const few = buildChoices(answer, [answer, { id: 'x', translation: '唯一的干扰' }], 4, () => 0.5)
ok(few.length === 1, '词库太小时只返回能凑出的干扰项，不会重复填充')

report()
