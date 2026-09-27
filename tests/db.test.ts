/**
 * 数据层与业务规则测试
 *
 * 覆盖 docs/LOGIC_FLOW.md 里最容易出错的规则：
 *   - 队列按 [day,kind,bookId] 幂等（v1 的「切书无限刷词」回归测试）
 *   - 复习抽样档位（含 >150 兜底档）、到期过滤、毕业词出池
 *   - 学习提交按 wordId 出队、连错重排与强制结算
 *   - 复习「认识/不认识」与轮次上限
 *   - 跨天拒绝写入、并发提交只结算一次
 */
import { makeAsserter } from './env.ts'

await import('fake-indexeddb/auto')

const { db, ensureSeeded, resetProgress, exportAll, importAll, addCustomBook, deleteBook } =
  await import('../src/db/index.ts')
const { ensureDailyTask, catchUpDailyTasks, rebuildTodayTasks } = await import('../src/lib/tasks.ts')
const { commitLearn, commitRequeue, commitReview, MAX_ROUNDS_PER_DAY } = await import(
  '../src/lib/session.ts'
)
const {
  getBookWordIds,
  getUnlearnedIds,
  getLearnedIds,
  getDueIds,
  getBookProgress,
  getOverallProgress,
  getStreak,
  getTotalStats,
  getKindStats,
} = await import('../src/lib/derive.ts')
const { todayKey, addDays } = await import('../src/lib/date.ts')

const { ok, report } = makeAsserter()
const today = todayKey()
const yesterday = addDays(today, -1)
const tomorrow = addDays(today, 1)

/** 把一批词标记为「已学会，due 到期日 = due」 */
async function markLearned(ids: string[], due: string, bookId = 'cet4') {
  await db.progress.bulkPut(
    ids.map((id) => ({
      wordId: id,
      bookId,
      state: 'learned' as const,
      due,
      interval: 1,
      streak: 0,
      lapses: 0,
      learnedDay: addDays(due, -1),
      lastDay: addDays(due, -1),
      updatedAt: Date.now(),
    })),
  )
}

/**
 * 清空全部表。
 * 不能用 db.delete()：它会关闭连接且实例无法复用，后续操作会抛 DatabaseClosedError。
 */
async function wipeDatabase() {
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
}

async function clearAll() {
  await Promise.all([
    db.progress.clear(),
    db.queues.clear(),
    db.daily.clear(),
    db.logs.clear(),
  ])
}

// ────────────────────────────── 播种 ──────────────────────────────
console.log('\n[1] 播种与去重')

await wipeDatabase()
await ensureSeeded()

const books = await db.books.toArray()
ok(books.length >= 2, `内置词书已写入（${books.length} 本）`)

const cet4Ids = await getBookWordIds('cet4')
const ieltsIds = await getBookWordIds('ielts')
ok(cet4Ids.length > 500, `CET4 词书词量合理（${cet4Ids.length}）`)
ok(ieltsIds.length > 10, `雅思词书词量合理（${ieltsIds.length}）`)
ok(new Set(cet4Ids).size === cet4Ids.length, '词书单词表无重复（联合主键保证）')
ok(new Set(ieltsIds).size === ieltsIds.length, '雅思词书单词表无重复')
ok(
  cet4Ids.every((id) => !ieltsIds.includes(id)),
  '两本词书不交叉（扩展词已按归属分配，无孤儿词）',
)

const orphan = await db.words.filter((w) => !cet4Ids.includes(w.id) && !ieltsIds.includes(w.id)).count()
ok(orphan === 0, `没有不属于任何词书的孤儿词条（${orphan} 个）`)

await ensureSeeded()
ok((await db.books.count()) === books.length, '重复播种不会重复写入（幂等）')

// ────────────────────────────── 派生视图 ──────────────────────────────
console.log('\n[2] 派生视图（未学习 / 已学习 / 到期池）')

await clearAll()
ok((await getUnlearnedIds('cet4')).length === cet4Ids.length, '未学习 = 词书全部单词（派生视图）')
ok((await getLearnedIds('cet4')).length === 0, '已学习为空')
ok((await getDueIds('cet4', today)).length === 0, '到期池为空')

// 学 20 个，due = 明天 → 今天不该进复习池
await markLearned(cet4Ids.slice(0, 20), tomorrow)
ok((await getUnlearnedIds('cet4')).length === cet4Ids.length - 20, '学会的词从未学习列表消失（闭环）')
ok((await getLearnedIds('cet4')).length === 20, '已学习列表包含它们')
ok((await getDueIds('cet4', today)).length === 0, '当天新学的词不会当天被抽去复习（due 是明天）')
ok((await getDueIds('cet4', tomorrow)).length === 20, '到了明天它们进入到期池')

// 毕业词出池
await db.progress.update(cet4Ids[0], { state: 'mastered', interval: 90 })
ok((await getDueIds('cet4', tomorrow)).length === 19, '毕业（mastered）的词不再进复习池')
ok((await getLearnedIds('cet4')).length === 20, '毕业词仍算在已学习列表里（完成度要计入）')

const bp = await getBookProgress('cet4')
ok(bp?.learned === 20 && bp.total === cet4Ids.length, `单本完成度：${bp?.learned}/${bp?.total}`)
ok(Math.abs((bp?.percent ?? 0) - 20 / cet4Ids.length) < 1e-9, '完成度 = 已学习 / 总数')
const overall = await getOverallProgress()
ok(overall.total === cet4Ids.length + ieltsIds.length, `合计分母按词书求和（${overall.total}）`)
ok(overall.percent <= 1 && overall.percent >= 0, '完成度被 clamp 在 0~1')

// ────────────────────────────── 学习队列 ──────────────────────────────
console.log('\n[3] 学习队列生成与幂等')

await clearAll()
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 20, dailyReviewLimit: 200 })

let learn = await ensureDailyTask('cet4', 'learn', today)
ok(learn.target === 20, `每日新词 20 → 目标 20（实际 ${learn.target}）`)
ok(learn.wordIds.length === 20, '队列里有 20 个待学词')
ok(new Set(learn.wordIds).size === 20, '队列内无重复词')
ok(learn.wordIds.every((id) => cet4Ids.includes(id)), '队列里的词都属于当前词书')
ok(learn.done === 0, '初始进度为 0')
ok(learn.day === today, '队列记录带上了日期键')

const learnAgain = await ensureDailyTask('cet4', 'learn', today)
ok(learnAgain.createdAt === learn.createdAt, '重复调用返回同一条记录（幂等，不重抽）')
ok(
  JSON.stringify(learnAgain.wordIds) === JSON.stringify(learn.wordIds),
  '重复调用不会改变队列内容',
)

// 每日新词设为 5：只影响「还没开始」的队列
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 5 })
await rebuildTodayTasks(['learn'])
const afterRebuild = await ensureDailyTask('cet4', 'learn', today)
ok(afterRebuild.target === 5, `未开始的队列按新设置重建（20 → ${afterRebuild.target}）`)

// 未学习数少于每日目标时取全部
await clearAll()
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 20 })
await markLearned(cet4Ids.slice(0, cet4Ids.length - 7), yesterday)
const tail = await ensureDailyTask('cet4', 'learn', today)
ok(tail.target === 7, `未学习只剩 7 个 → 抽全部 7 个（实际 ${tail.target}）`)

// 词书学完 → 不再发新词
await clearAll()
await markLearned(cet4Ids, yesterday)
const doneBook = await ensureDailyTask('cet4', 'learn', today)
ok(doneBook.target === 0, '整本书学完 → 今日学习任务为 0（词书完成）')

// ────────────────────────────── 复习抽样 ──────────────────────────────
console.log('\n[4] 复习抽样档位与到期过滤')

const tiers: [number, number][] = [
  [10, 10], // 100%
  [40, 32], // 80%
  [80, 48], // 60%
  [200, 100], // 50%（v1 缺失的兜底档）
]
for (const [learnedCount, expected] of tiers) {
  await clearAll()
  await markLearned(cet4Ids.slice(0, learnedCount), yesterday)
  const q = await ensureDailyTask('cet4', 'review', today)
  ok(q.target === expected, `已学习 ${learnedCount} → 应复习 ${expected}（实际 ${q.target}）`)
}

// 每日上限截断
await clearAll()
await markLearned(cet4Ids.slice(0, 80), yesterday)
await db.settings.put({ ...(await db.settings.get('app'))!, dailyReviewLimit: 20 })
const capped = await ensureDailyTask('cet4', 'review', today)
ok(capped.target === 20, `每日上限 20 生效（实际 ${capped.target}）`)
ok(capped.wordIds.length === 20, '队列长度与目标一致')

// 到期过滤：只有 due <= 今天 的词进池
await clearAll()
await markLearned(cet4Ids.slice(0, 20), yesterday) // 到期
await markLearned(cet4Ids.slice(20, 60), tomorrow) // 未到期
const dueOnly = await ensureDailyTask('cet4', 'review', today)
ok(dueOnly.target === 20, `40 个已学词里只有 20 个到期 → 只抽 20（实际 ${dueOnly.target}）`)
ok(dueOnly.wordIds.every((id) => cet4Ids.slice(0, 20).includes(id)), '队列里全是到期的词')

// 每日复习上限为 0
await clearAll()
await markLearned(cet4Ids.slice(0, 30), yesterday)
await db.settings.put({ ...(await db.settings.get('app'))!, dailyReviewLimit: 0 })
const noReview = await ensureDailyTask('cet4', 'review', today)
ok(noReview.target === 0, '每日复习上限 0 → 今天不复习')

// ────────────────────────────── 学习提交 ──────────────────────────────
console.log('\n[5] 学习提交（答对）')

await clearAll()
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 10, dailyReviewLimit: 200 })
learn = await ensureDailyTask('cet4', 'learn', today)
const firstId = learn.wordIds[0]
const restIds = learn.wordIds.slice(1)

const learned = await commitLearn(today, 'cet4', firstId, 1200)
ok(learned.ok && learned.settled, '答对提交成功')
ok(learned.queue?.done === 1, '进度 +1')
ok(learned.queue?.wordIds.length === 9, '出队一个词')
ok(learned.queue?.wordIds[0] === restIds[0], '出队的是被作答的那个词（按 wordId，不是按位置）')

const prog = await db.progress.get(firstId)
ok(prog?.state === 'learned', '进度被标记为已学会')
ok(prog?.due === tomorrow, `新学词的到期日是明天（${prog?.due}）`)

const daily = await db.daily.get(today)
ok(daily?.learnedIds.includes(firstId), '当日统计记录了学会的词')
ok(daily?.answered === 1 && daily?.correct === 1, '当日作答数与正确数 +1')
ok((await getKindStats(today, 'learn')).durationMs === 1200, '用时被记录')

// 重复提交同一个词：幂等，不会重复计数
const again = await commitLearn(today, 'cet4', firstId, 999)
ok(!again.ok && again.reason === 'not-in-queue', '同一个词重复提交被幂等丢弃')
const daily2 = await db.daily.get(today)
ok(daily2?.answered === 1, '重复提交不会重复累加统计')
ok((await db.queues.get([today, 'learn', 'cet4']))?.done === 1, '重复提交不会重复推进进度')

// 并发提交同一个词只结算一次
await clearAll()
learn = await ensureDailyTask('cet4', 'learn', today)
const [c1, c2] = await Promise.all([
  commitLearn(today, 'cet4', learn.wordIds[0], 10),
  commitLearn(today, 'cet4', learn.wordIds[0], 10),
])
const settledCount = [c1, c2].filter((r) => r.ok).length
ok(settledCount === 1, `并发提交同一个词只有一次生效（实际 ${settledCount} 次）`)
ok((await db.queues.get([today, 'learn', 'cet4']))?.done === 1, '并发下进度只 +1')
ok((await db.daily.get(today))?.answered === 1, '并发下统计只 +1')

// ────────────────────────────── 学习重排 ──────────────────────────────
console.log('\n[6] 学习重排与强制结算（保证当天一定结束）')

await clearAll()
learn = await ensureDailyTask('cet4', 'learn', today)
const requeueId = learn.wordIds[0]
const others = learn.wordIds.slice(1)

const r1 = await commitRequeue(today, 'cet4', requeueId, 100)
ok(r1.ok && !r1.settled, '第 1 次错满 3 次：移到队尾，不结算')
ok(r1.queue?.done === 0, '重排不推进进度（进度条不该虚增）')
ok(r1.queue?.wordIds[r1.queue.wordIds.length - 1] === requeueId, '该词被移到了队尾')
ok(r1.queue?.wordIds.length === 10, '队列长度不变（没有丢词）')
ok((await db.progress.get(requeueId)) === undefined, '重排不改学习状态')

const r2 = await commitRequeue(today, 'cet4', requeueId, 100)
ok(r2.ok && !r2.settled, `第 2 次错满：仍然只是重排（rounds=${r2.queue?.rounds[requeueId]}）`)

const r3 = await commitRequeue(today, 'cet4', requeueId, 100)
ok(r3.ok && r3.settled && r3.forced, '第 3 轮错满：强制结算，保证当天能结束')
ok(r3.queue?.done === 1, '强制结算才推进进度')
ok(!r3.queue?.wordIds.includes(requeueId), '该词已出队')
const forcedProg = await db.progress.get(requeueId)
ok(forcedProg?.state === 'learned', '强制结算也进入学习进度（明天会复习到）')
ok(forcedProg?.lapses === 1, '留下遗忘记录，明天优先出现')
ok(r3.queue?.wordIds.length === others.length, '其余 9 个词原样保留')

ok(MAX_ROUNDS_PER_DAY === 3, '每词当天最多 3 轮')

// ────────────────────────────── 复习提交 ──────────────────────────────
console.log('\n[7] 复习提交（认识 / 不认识 / 强制出队）')

await clearAll()
await markLearned(cet4Ids.slice(0, 12), yesterday)
let review = await ensureDailyTask('cet4', 'review', today)
ok(review.target === 10, `12 个已学词 → 100% 档位但受…（实际目标 ${review.target}）`)

const knowId = review.wordIds[0]
const known = await commitReview(today, 'cet4', knowId, 'known', 800)
ok(known.ok && known.settled, '答「认识」结算成功')
ok(known.queue?.done === 1, '已复习 +1')
const kp = await db.progress.get(knowId)
ok(kp?.streak === 1 && kp?.interval === 2, `连续答对 1 次 → 间隔 2 天（实际 ${kp?.interval}）`)
ok(kp?.due === addDays(today, 2), '下次到期日按间隔推进')
ok((await db.daily.get(today))?.reviewedIds.includes(knowId), '当日复习统计记录该词')

// 不认识：前两次移到队尾，第三次强制出队
const forgetId = known.queue!.wordIds[0]
const beforeLen = known.queue!.wordIds.length
const f1 = await commitReview(today, 'cet4', forgetId, 'forgotten', 500)
ok(f1.ok && !f1.settled, '第 1 次「不认识」：只重排，不结算')
ok(f1.queue?.done === 1, '「不认识」不推进已复习数')
ok(f1.queue?.wordIds.length === beforeLen, '队列长度不变')
ok(f1.queue?.wordIds[beforeLen - 1] === forgetId, '该词排到了队尾')
ok((await db.progress.get(forgetId))?.lapses === 1, '遗忘次数 +1')

const f2 = await commitReview(today, 'cet4', forgetId, 'forgotten', 500)
ok(f2.ok && !f2.settled, `第 2 次「不认识」：仍重排（rounds=${f2.queue?.rounds[forgetId]}）`)

const f3 = await commitReview(today, 'cet4', forgetId, 'forgotten', 500)
ok(f3.ok && f3.settled && f3.forced, '第 3 次「不认识」：强制出队，复习一定能结束')
ok(f3.queue?.done === 2, '强制出队计入已复习')
ok(!f3.queue?.wordIds.includes(forgetId), '该词已出队')
const fp = await db.progress.get(forgetId)
ok(fp?.streak === 0 && fp?.due === tomorrow, '答错的词明天重新出现')

// 队列只剩一个词时点「不认识」：原地不动但用户能看到反馈
await clearAll()
await markLearned(cet4Ids.slice(0, 3), yesterday)
review = await ensureDailyTask('cet4', 'review', today)
for (const id of review.wordIds.slice(1)) await commitReview(today, 'cet4', id, 'known', 100)
const last = (await db.queues.get([today, 'review', 'cet4']))!
ok(last.wordIds.length === 1, '只剩最后一个词')
const solo = await commitReview(today, 'cet4', last.wordIds[0], 'forgotten', 100)
ok(solo.ok && solo.repeated && !solo.settled, '最后一个词点「不认识」：标记 repeated，UI 据此给「再记一次」提示')
ok(solo.queue?.wordIds.length === 1, '词仍在队列里，不会被静默吞掉')

// ────────────────────────────── 跨天 ──────────────────────────────
console.log('\n[8] 跨天安全')

await clearAll()
learn = await ensureDailyTask('cet4', 'learn', today)
const staleTarget = learn.wordIds[0]
const staleResult = await commitLearn(yesterday, 'cet4', staleTarget, 100)
ok(!staleResult.ok && staleResult.reason === 'stale-day', '用昨天的日期提交 → 被拒绝')
ok(
  (await db.queues.get([today, 'learn', 'cet4']))?.done === 0,
  '今天的队列没有被昨天的会话改动',
)
ok((await db.progress.get(staleTarget)) === undefined, '被拒绝的提交没有写入任何进度')

// 昨天遗留的队列不会被今天动到
await db.queues.put({
  day: yesterday,
  kind: 'learn',
  bookId: 'cet4',
  wordIds: [cet4Ids[500]],
  target: 1,
  done: 0,
  rounds: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
})
await ensureDailyTask('cet4', 'learn', today)
const yRow = await db.queues.get([yesterday, 'learn', 'cet4'])
ok(yRow?.wordIds.length === 1, '今天的生成不会覆盖昨天的队列记录')

// 昨天没复习完的词，今天仍然能进池（不丢词）
await clearAll()
await markLearned(cet4Ids.slice(0, 15), addDays(today, -3))
const todayPool = await getDueIds('cet4', today)
ok(todayPool.length === 15, `逾期未复习的词今天仍在到期池里（${todayPool.length} 个）`)

// ────────────────────────────── 每日任务补跑 ──────────────────────────────
console.log('\n[9] 每日任务补跑（0 点任务的真正驱动）')

await clearAll()
await db.runState.put({ id: 'app', lastRunDay: null, lastRemindedDay: null, seeded: true })
const run1 = await catchUpDailyTasks()
ok(run1.ran, '首次启动会补跑今日任务')
ok((await db.queues.where('day').equals(today).count()) >= 2, '各词书的学习与复习队列都生成了')

const snapshot = await db.queues.toArray()
const run2 = await catchUpDailyTasks()
ok(!run2.ran, '同一天再次启动不会重跑（lastRunDay 幂等键）')
ok(
  JSON.stringify(await db.queues.toArray()) === JSON.stringify(snapshot),
  '补跑不会改动已有队列',
)

// 完成后重复调用不会重新发词（v1 的「切书无限刷词」回归）
await clearAll()
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 10 })
const q0 = await ensureDailyTask('cet4', 'learn', today)
for (const id of [...q0.wordIds]) await commitLearn(today, 'cet4', id, 50)
const finished = (await db.queues.get([today, 'learn', 'cet4']))!
ok(finished.wordIds.length === 0 && finished.done === finished.target, '今日学习队列已全部完成')

const reopened = await ensureDailyTask('cet4', 'learn', today)
ok(reopened.createdAt === finished.createdAt, '完成后再次调用返回同一条记录')
ok(reopened.wordIds.length === 0, '★ 不会重新发一批词（切换词书来回切也刷不出新词）')
ok(reopened.done === reopened.target, '完成状态保持不变')

// 已经开始的任务不会被重建
await clearAll()
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 10 })
const startedQ = await ensureDailyTask('cet4', 'learn', today)
await commitLearn(today, 'cet4', startedQ.wordIds[0], 50)
const targetBefore = (await db.queues.get([today, 'learn', 'cet4']))!.target
await db.settings.put({ ...(await db.settings.get('app'))!, dailyNew: 50 })
await rebuildTodayTasks(['learn'])
const targetAfter = (await db.queues.get([today, 'learn', 'cet4']))!.target
ok(targetBefore === 10 && targetAfter === 10, '已经开始的任务保持冻结，进度不会倒退')
ok((await db.queues.get([today, 'learn', 'cet4']))!.done === 1, '已完成的进度没有丢')

// ────────────────────────────── 完整性自检 ──────────────────────────────
console.log('\n[10] 数据完整性自检')

await clearAll()
await markLearned(cet4Ids.slice(0, 25), yesterday)
await markLearned(ieltsIds.slice(0, 5), yesterday, 'ielts')
await catchUpDailyTasks()

const allQueues = await db.queues.toArray()
let duplicated = 0
let wrongBook = 0
let overTarget = 0
for (const q of allQueues) {
  if (new Set(q.wordIds).size !== q.wordIds.length) duplicated++
  if (q.done > q.target) overTarget++
  const bookWordIds = q.bookId === 'cet4' ? cet4Ids : ieltsIds
  if (!q.wordIds.every((id) => bookWordIds.includes(id))) wrongBook++
}
ok(duplicated === 0, '所有队列内无重复词')
ok(overTarget === 0, '没有 done > target 的队列')
ok(wrongBook === 0, '所有队列里的词都属于自己那本词书')

const progressRows = await db.progress.toArray()
ok(
  progressRows.every((p) => ['learned', 'mastered'].includes(p.state)),
  '进度表里没有残留的 unlearned 记录',
)
const learnedSet = new Set(progressRows.map((p) => p.wordId))
ok(learnedSet.size === progressRows.length, '进度表按 wordId 唯一（没有同一词两条记录）')

const total = await getTotalStats()
ok(total.activeDays >= 0 && total.accuracy >= 0 && total.accuracy <= 1, '累计统计数值合法')
ok((await getStreak(today)) === 0 || (await getStreak(today)) >= 1, '连续打卡计算不报错')

// ────────────────────────────── 备份 / 恢复 / 重置 ──────────────────────────────
console.log('\n[11] 备份、恢复与重置')

const backup = await exportAll()
ok(backup.app === 'wordlearn' && backup.version === 2, '导出内容带应用标识与版本号')
ok(backup.progress.length === progressRows.length, '导出包含全部学习进度')

await resetProgress()
ok((await db.progress.count()) === 0, '重置清空学习进度')
ok((await db.queues.count()) === 0, '重置清空队列')
ok((await db.daily.count()) === 0, '重置清空统计')
ok((await db.books.count()) === books.length, '重置保留词书')
ok((await db.words.count()) > 0, '重置保留词条')
ok((await db.settings.get('app')) !== undefined, '重置保留设置')

await importAll(backup)
ok((await db.progress.count()) === backup.progress.length, '导入备份恢复学习进度')
ok((await db.queues.count()) === backup.queues.length, '导入备份恢复队列')

// 自建词书
const customWords = [
  {
    id: 'zzztest',
    word: 'zzztest',
    pos: 'n.',
    translation: '测试词',
    tags: ['custom'],
    rank: 1,
  },
]
const custom = await addCustomBook('我的生词', '测试用', customWords, 'violet')
ok((await db.books.get(custom.id))?.custom === true, '可以新建自建词书')
ok((await getBookWordIds(custom.id)).length === 1, '自建词书的单词挂载成功')
await deleteBook(custom.id)
ok((await db.books.get(custom.id)) === undefined, '可以删除自建词书')
ok((await db.words.get('zzztest')) !== undefined, '删除词书不会删掉词条（避免不可逆的数据丢失）')

report()
