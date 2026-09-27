# 背单词 App 业务逻辑流程（v2 修订版）

> 本版在 v1 流程基础上，按《逻辑审查报告》的 🔴 严重逻辑错误 / 🟡 缺失逻辑与边界 / 🟢 优化建议 / 📝 核心逻辑 全部结论重新编排，可直接作为开发依据。
>
> **两处按指定口径固定：**
> 1. 「连续选错 3 次」**按单词计数**（不是全局连续计数）。
> 2. 复习抽样规则 **>150 抽 50%**。
>
> 文档内所有 `【已定义】` 标记处，都是 v1 未写清、本版补充定义的行为；所有「原流程」字样指 v1 文档。

---

## 修订摘要（一页看懂改了什么）

| # | 原流程 | 问题 | 本版做法 |
|---|---|---|---|
| 1 | 每日 0:00 定时任务驱动一切 | 纯前端 App 关着/被杀时定时器不触发，任务永不执行 | 改为**启动时惰性补跑**为主，定时器仅兜底；按 `(day, bookId, kind)` 幂等 |
| 2 | 未学习列表只被读取，从不移除 | 闭环断裂，每天重复学已学会的词，进度永不增长 | 未学习列表改为**派生视图**（词书单词表 − 已学习），不再物化 |
| 3 | 未学习为空 → 词书 completed=true | 语义错位，会出现"假的已完成"或永远不完成 | 改为 `已学习数 ≥ 词书总词数`，且只做展示派生值 |
| 4 | 复习抽样只有 ≤10 / ≤60 / ≤150 三档 | >150 时无分支，复习功能静默失效 | 补 `>150 → 50%` 兜底档 |
| 5 | 进度 = 要抽取数 − 待学习数 | 用减法反推、分母不冻结，会虚增/倒退/为负 | 分母 **target 快照**、分子 **done 单调计数器**，显示时 clamp |
| 6 | 切换词书时"待学习为空 → 生成任务" | 判据歧义（没发过 vs 已学完），可无限刷词、绕过每日上限 | 判据换成 **`(day, bookId, kind)` 是否已有记录**，生成函数幂等 |
| 7 | 学习页判断"待复习列表为空"并弹"今日已经复习完" | 判定对象复制错误，学一题就弹错提示 | 两页各判自己的队列 + 文案区分 |
| 8 | 不认识 → 移到末尾，无次数上限；裁减时"移出后几位" | 死循环、永不完成；把用户标记的最不熟的词优先丢弃 | 每词当日**轮次上限 K**，到顶强制出队并 `due=明天`；裁减按 `due` 排序，不按位置 |
| 9 | 0 点任务覆盖队列时用户正在作答 | 按位置删除会删错词，"移除第一个"删掉的是新队列的词 | 会话持有**队列快照**，提交按 **wordId** 定位；跨天提交直接拒绝 |
| 10 | 无防连点 | 点两下"认识"会吞掉两个词，进度虚高 | `busy` 锁 + 队列读改写**单事务** + 先落盘后跳转 |
| 11 | "连续选错 3 次"语义与存储未定义 | 全局计数荒谬；计数持久化会导致一进页面就被弹走 | **按 wordId 计数**、作用域为"该词本次在队首的这一轮"、进入卡片时不检查历史计数 |
| 12 | 复习纯随机抽、无到期时间、无毕业机制 | 刚学的词当天就被抽；≤10 时永远复习同一批；没有词会毕业 | 加 `due / interval / streak / lapses / mastered`，抽样在**到期池**内进行 |
| 13 | 追加/覆盖语义未定义 | 追加会产生重复词与负数进度 | 生成一律**覆盖式快照**，且只在无记录时发生 |
| 14 | 动态加载、搜索无实现约束 | 滚动抖动/重复项；每次按键全表扫描 | 定 IntersectionObserver + 稳定排序 + 去抖 |
| 15 | 提示语单一 | "已完成"和"上限设为0""没有到期词"混在一起 | 提示语判定表（附录 B） |

---

## 0. 全局约定

### 0.1 一天的边界【已定义】
- 一天 = **本地时间 00:00 ~ 23:59:59**，`dayKey = YYYY-MM-DD`（本地时区）。
- **进入任何会话（学习/复习）时取一次 `dayKey` 并固化在会话状态里**，会话内所有读写都用这个值。
- 禁止在每次写库时重新 `new Date()` 取日期 —— 这是 23:59 打开、00:01 操作时数据错乱的根源。

### 0.2 三条不可违反的原则
1. **单一入口**：所有"生成今日任务"都调用同一个幂等函数 `ensureDailyTask(bookId, kind, day)`；所有"作答提交"都走同一个事务化提交函数。
2. **单一真相**：
   - 「今天要做什么」只看 `queues` 表（当日队列快照）。
   - 「每个词学到哪了」只看 `progress` 表。
   - 四个"列表"（未学习/已学习/待学习/待复习）**全部是这两张表的查询视图**，不单独持久化。
3. **先落盘、后跳转**：任何提交必须先完成数据库写入并确认成功，再执行页面跳转；页面卸载不得中断写入。

### 0.3 防连点【已定义】
- 每个提交型按钮（选项、认识、不认识、下一题）都要过一把 `busy` 锁：锁住期间按钮置灰，重复点击直接丢弃。
- 队列的"读取 → 修改 → 写回"必须在**同一个数据库事务**内完成，禁止两步之间插入任何 `await` 之外的操作。

### 0.4 幂等【已定义】
- `ensureDailyTask` 可被无限次调用，结果一致。
- 提交函数对"该词已不在队列中"的情况视为**已完成**，直接返回，不报错、不重复计数。

### 0.5 数值口径速查

| 指标 | 公式 | 约束 |
|---|---|---|
| 今日学习进度 | `done / target` | 分子分母都取自队列快照，显示时 `clamp(0, target)` |
| 今日复习进度 | `done / target` | 同上 |
| 单本词书完成度 | `已学习数 / 词书总词数` | `clamp(0, 1)`，已学习含 mastered |
| 全部词书完成度 | `全局已学习数 / 全部词书去重后总词数` | `clamp(0, 1)`，分母去重避免跨书重复计数 |
| 复习抽取数量 | `ceil(已学习总数 × 档位比例)` | 再取 `min(每日复习上限, 到期池大小)` |

---

## 1. 数据表设计

### 1.1 表清单

| 表 | 字段 | 主键 / 索引 | 说明 |
|---|---|---|---|
| `books` | `id, name, total` | `id` | 词书列表（词书1、词书2…），`total` 为该书词数 |
| `words` | `id, word, phonetic, def, root, family, ...` | `id` | 词条内容 |
| `bookWords` | `bookId, wordId, order` | `[bookId+wordId]` 联合主键 | 词书单词表，**主键天然去重** |
| `progress` | `wordId, bookId, state, due, interval, streak, lapses, lastDay, learnedDay` | `wordId` | 学习进度。**主键是 wordId（全局唯一）**，见 1.4 |
| `queues` | `day, kind, bookId, wordIds[], target, done, rounds{}, createdAt` | `[day+kind+bookId]` 联合主键 | 当日队列快照，**主键天然幂等** |
| `daily` | `day, learnedIds[], reviewedIds[], answered, correct, durationMs` | `day` | 当日聚合统计 |
| `logs` | `id, day, wordId, kind, result, at` | `id` | 作答流水 |
| `settings` | `id='app', dailyNew, dailyReviewLimit, studyMode, queueOrder, ...` | `id` | 全局设置 |
| `runState` | `id='app', lastRunDay` | `id` | 定时任务幂等键 |

> **去重不再需要写代码**：「词书单词表、已学习列表、未学习列表不能重复」由主键保证（`bookWords` 联合主键、`progress` 单主键），不存在"忘了去重"的可能。

### 1.2 状态机

```
                 首次学习提交
   unlearned ──────────────────▶ learned ──────────────▶ mastered
        ▲                          │   ▲  复习认识          （graduated）
        │                          │   │  streak 达到毕业线
        │        复习不认识        │   │
        │        （streak 归零）   ▼   │
        └──────── 只有「重置进度」才回退 ──┘
```

| 状态 | 含义 | 是否进复习池 |
|---|---|---|
| `unlearned` | 没学过 / 还没结算为学会 | ❌ |
| `learned` | 学过，按 `due` 参与复习 | ✅ 仅当 `due ≤ 今天` |
| `mastered` | 已毕业（`interval ≥ 90` 天） | ❌ |

**关键：`待学习`、`待复习` 不是状态，是当日队列。** 队列每天重建，单词的持久记忆只靠 `progress`。

### 1.3 四个列表 = 派生视图【已定义】

| 视图 | 定义 | 落库位置 |
|---|---|---|
| 未学习列表（按书） | `bookWords(book) − progress(state ∈ {learned, mastered})` | 不落库 |
| 已学习列表（按书） | `bookWords(book) ∩ progress(state ∈ {learned, mastered})` | 不落库 |
| 待学习列表 | `queues(day,'learn',book).wordIds`（已结算的会从中移出） | `queues` |
| 待复习列表 | `queues(day,'review',book).wordIds` | `queues` |

> 说明：未学习列表**包含今天排在待学习里、但还没学会的词** —— 这是有意为之，因为它们的 `state` 仍是 `unlearned`。所以「未学习为空」严格等价于「这本书每一个词都已学会」，1.3 与第 2 章的完成判定因此天然一致。

### 1.4 跨词书重复词的界定【已定义】
- 同一个单词同时属于多本词书时（如 CET4 与考研共有 `abandon`），**全局只保留一条 `progress` 记录**（主键 `wordId`），学过一次即为学会，不会在另一本书里重复学、重复计数。
- 各书完成度按"该书的词 ∩ 全局已学习"统计，因此共有词会在两本书里同时体现为已学习 —— 这是预期行为（"你已经会这个词了"）。

### 1.5 状态流转表（谁在什么时候写什么）

| 时机 | 写入表 | 事务范围 | 备注 |
|---|---|---|---|
| 生成今日任务 | `queues`, `runState` | 同一事务 | 幂等，成功后才写 `lastRunDay` |
| 学习提交（答对 / 错满强制出队） | `progress`, `queues`, `daily`, `logs` | **同一事务** | `state: unlearned → learned`，`due = 明天` |
| 学习重排（错满 3 次 → 移到末尾） | `queues`, `daily`, `logs` | 同一事务 | **不改 `progress`**，不推进 `done` |
| 复习提交（认识） | `progress`, `queues`, `daily`, `logs` | 同一事务 | `streak++`、算新 `due`，可能转 `mastered` |
| 复习提交（不认识） | `progress`, `queues`, `daily`, `logs` | 同一事务 | `streak=0`、`lapses++`、`due=明天` |
| 重置进度 | `progress`, `queues`, `daily`, `logs` | 同一事务 | 全部清空，`completed` 展示值随之复位 |

---

## 2. 定时任务（每日 0 点）

### 2.1 触发方式（v1 最大问题所在）

**v1 做法（不可用）**：只靠"每日 0:00 执行定时任务"。纯前端 App 在网页关闭、App 被系统杀掉、手机息屏休眠时，定时器**不会触发**。用户第二天早上打开，任务从没跑过 → 待学习列表为空 → 首页提示"今日暂无学习任务" → 用户永远看不到当天的任务。

**v2 做法**：三个调用点，同一个幂等函数。

| 调用点 | 作用 |
|---|---|
| **App 启动 / 进入首页时（主驱动）** | 比较 `runState.lastRunDay != 今天` → 执行 `runDailyTask(今天)` → 成功后写 `lastRunDay` |
| **App 正开着跨过 0 点（兜底）** | 定时器触发同一次 `runDailyTask`，幂等保证不会重复生成 |
| **点击首页按钮 / 切换词书（兜底）** | 调用 `ensureDailyTask(book, kind, day)`，只补生成缺失的那本书 |

- **补跑只跑一次**：即使用户隔了 5 天没打开，也只按"今天"生成一次，不补历史。
- **幂等**：`ensureDailyTask` 先查 `queues[day, kind, bookId]`，存在即直接返回，绝不重抽、绝不覆盖、绝不追加。

### 2.2 分支一：学习任务

```
for book in 所有词书:
    未学习数 = 未学习列表(book).size                      // 派生视图

    if 未学习数 <= 0:
        book.completed = true                             // 仅用于展示的派生值
        continue

    n = min(settings.dailyNew, 未学习数)                   // 等价于 v1 的"大于等于0 / 小于0"两个分支
    if n <= 0:
        ensureDailyTask(book, 'learn', day, 0)            // 每日学习数量=0 → 落一条空队列
        continue                                          // 首页据此给出区分提示

    ensureDailyTask(book, 'learn', day, n)                // 幂等；内部从「未学习列表」随机不重复抽取 n 个
```

- 原流程的"未学习数 − 每日数 ≥ 0 → 抽每日数；< 0 → 把未学习全部覆盖待学习"，在数学上**完全等价于 `min(每日数, 未学习数)`**，本版用后者表达，语义更直白。
- 全书的词都学会时（未学习数 = 0），该书当天不再发新词，`completed = true`。

### 2.3 分支二：复习任务

```
for book in 所有词书:
    已学习数 = 已学习列表(book).size                       // 含 mastered
    if 已学习数 <= 0:
        continue

    比例 = 档位(已学习数)                                  // 见下表
    今日应复习 = ceil(已学习数 × 比例)
    上限 = settings.dailyReviewLimit
    if 上限 <= 0:
        ensureDailyTask(book, 'review', day, 0)            // 上限=0 → 今天不复习，但要落空队列
        continue

    应复习数 = min(今日应复习, 上限)

    到期池 = progress(book) where state = 'learned' and due <= day
    应复习数 = min(应复习数, 到期池.size)                   // ← v1 缺失的到期过滤

    ensureDailyTask(book, 'review', day, 应复习数)         // 幂等；在「到期池」内随机不重复抽取
```

**复习抽样档位表（v2 定稿）**

| 已学习列表单词总数 | 抽取比例 |
|---|---|
| ≤ 10 | 100% |
| > 10 且 ≤ 60 | 80% |
| > 60 且 ≤ 150 | 60% |
| **> 150** | **50%（兜底档，必须写成 else/兜底）** |

- 取整规则【已定义】：`ceil(已学习数 × 比例)`，再取 `min(上限, 到期池大小)`。取整方式必须写死，避免"今天抽 8 个明天抽 9 个"。
- **到期过滤（v1 缺失，本版新增）**：只有 `due ≤ 今天` 的词才进候选。当天新学的词 `due = 明天`，因此不会当天就被抽到复习；`mastered` 的词不再进池。
- **`>150` 档位说明**：原规则只写到 `≤150`，已学习 151 个词时 if-else 链无命中项，按字面实现会"不抽取"，复习功能**静默失效**（不报错、没反应）——这是最坏的失败方式，所以必须有兜底档。

### 2.4 v1 的"追加 / 移出后几位"逻辑：整段删除

v1 写道："用判断后的数字减去待复习列表单词数量 → 大于 0 追加抽取；小于 0 把多余的后几位单词移出待复习列表"。这段在新模型下**整段不再需要**，原因：

1. 每日队列是**当日快照**，每天整体重建，不存在"累加/裁减到目标数"的需求。
2. "把多余的后几位移出"有两个硬伤：队列顺序是随机的，**"后几位"没有任何语义**；而且末尾恰好就是用户刚点过"不认识"排过去的词 —— 等于**把用户标记的最不熟的词优先丢弃**，与学习目标完全相反。
3. 昨天没复习完的词不会被丢：它们的 `progress.due` 仍然是过去的日期，今天重新进到期池。**队列可以被覆盖，单词不会丢** —— 持久记忆在 `progress`，不在队列。

### 2.5 中断与失败

- `runDailyTask` 的所有写入放在**一个事务**里；失败则整个回滚。
- `lastRunDay` **只在事务提交成功后**写入，保证"任务中断 → 下次启动会重跑"。
- 重跑不会产生重复队列（幂等键）。

### 2.6 定时任务边界表

| 场景 | 行为 |
|---|---|
| 未学习数 = 0 | 不发新词，`completed = true` |
| 未学习数 < 每日数 | 抽全部未学习词（`min` 生效） |
| 未学习数 = 每日数 | 抽满，未学习池当轮清空 |
| 每日学习数量 = 0 | 落空队列，首页提示"你已把每日学习数量设为 0"，与"已学完"区分 |
| 已学习数 = 0 | 不生成复习队列，首页提示"还没有学过的单词" |
| 到期池 = 0 | 落空队列，首页提示"今天没有到期的单词，明天再来" |
| 每日复习上限 = 0 | 落空队列，首页提示"你已把每日复习上限设为 0" |
| 已学习 151 个词 | 走 `>150 → 50%` 兜底档 |
| 用户隔 5 天没打开 | 只在下次启动时按"今天"补跑一次 |
| 任务执行中途被杀 | 事务回滚，`lastRunDay` 未写，下次启动重跑 |
| 词书当天已生成 | 幂等返回，绝不重抽 |

---

## 3. 首页

### 3.1 学习按钮

```
onClickLearn:
    q = ensureDailyTask(当前词书, 'learn', day)       // 幂等兜底，已有则直接返回，不改动
    if q.target == 0:
        若 每日学习数量 == 0      → 提示「你已把每日学习数量设为 0」
        若 未学习列表为空         → 提示「这本书的单词已经全部学完啦 🎉」
        否则                      → 提示「今日暂无学习任务，明日再来吧！」
        return
    if q.wordIds.isEmpty() and q.done >= q.target:
        提示「今日学习已完成 🎉」+ 返回按钮
        return
    进入 单词学习页（只加载待学习列表的第一个单词，默认选择题模式）
```

- **关键**：判断"是否已完成"用的是**队列快照**（`target` 与 `done`），不是"待学习列表是否为空"。见 🔴6/#6 与 🔴5/#5。

### 3.2 复习按钮

```
onClickReview:
    q = ensureDailyTask(当前词书, 'review', day)
    if q.target == 0:
        若 每日复习上限 == 0      → 提示「你已把每日复习上限设为 0」
        若 已学习列表为空         → 提示「还没有学过的单词，先去学几个新词吧」
        若 到期池为空             → 提示「今天没有到期的单词，明天再来」
        否则                      → 提示「今日暂无复习任务，明日再来吧！」
        return
    if q.wordIds.isEmpty() and q.done >= q.target:
        提示「今日复习已完成 🎉」+ 返回按钮
        return
    进入 单词复习页
```

### 3.3 词书完成度模块

- 逐本展示：`已学习列表总数 / 该词书表总数`，`clamp(0,1)`，显示为百分比。
- 首页上方的"当前词书进度"用**同一份数据、同一个公式**，不要各自算一遍（避免同屏两个进度条数字不同步）。
- 全部词书的合计完成度：分母用**全部词书去重后的总词数**（不是各书词数之和），否则跨书共有词会被重复计数。
- `completed = true` 只是展示派生值，不要当作"当天不再生成任务"的开关（那是幂等键的职责）。「重置进度」后该值必须随之复位。

---

## 4. 学习模块

### 4.1 进入与并发锁

```
onEnterStudy(bookId):
    session = {
        day:      dayKey(now()),                       // 固化，会话内不再变
        queueId:  queues.id(day, 'learn', bookId),
        snapshot: queues.get(day,'learn',bookId).wordIds,   // 队列快照
        pending:  null,                                // 'learned' | 'requeue'
        wrongMap: {}                                   // 按 wordId 计数
    }
    current = snapshot[0]                              // 只加载第一个单词
```

- 会话期间**所有提交都基于 `snapshot` + `wordId`**，绝不按位置删除。
- 提交前校验 `session.day == dayKey(now())`，不一致则拒绝写入并提示"已跨天，请返回首页重新开始"。
- 进入页面时把 `busy` 锁复位，避免上次异常退出遗留锁死。

### 4.2 学习进度

```
已学习 = q.done                       // 单调计数器，只增不减
今日要学习 = q.target                 // 生成时冻结的快照
显示「今日要学习 {target} 个单词，已学习 {clamp(done,0,target)}」
进度条 = target == 0 ? 100% : clamp(done / target, 0, 1)
```

**为什么不能再用 `target − 待学习列表数`**：这个减法在三种情况下必错 ——
1. 中途修改"每日学习数量"（例如 30 改成 3）：`3 − 5 = −2` → **负数进度条**；
2. 任何一次"追加"而非覆盖（`待学习数 > target`）→ 负数；
3. 用户学完后重新生成队列 → 分子瞬间归零 → 进度倒退。

用 `done` 计数器 + `target` 快照后，这些情况都不会让进度跳变。

### 4.3 选择题作答流程

1. 卡片显示：**无释义的单词 + 发音按钮**；下方 ABCD 四个释义选项，只有一个正确。
2. 生成选项【已定义】：干扰项从**同一词书**内随机取 3 个，必须排除释义与正确答案相同或高度相似的词；**选项集合按 wordId 缓存**，同一张卡重渲染时不得重新洗牌（否则用户按位置记忆会被打断）。
3. **答对**：立即锁住选项区 → 提示"答对了" → `session.pending = 'learned'` → 0.5s 后跳转单词详情页（`clearTimeout` 在页面卸载时清理）。
   - 0.5s 只是 UI 延时，**此时尚未写库**，用户中途杀掉 App 不会产生任何副作用。
4. **答错**：提示"选错了哟"，`wrongMap[wordId] += 1`。
   - `wrongMap` 的 **key 是 wordId**（按单词计数，不是全局连续计数）。
   - 作用域 = **该词本次"在队首的这一轮"**：答对出队、或错满 3 次移到末尾时，该词的计数清零。
   - **进入卡片时不检查历史计数** —— 否则从详情页点"返回"后会立刻被再次弹走，形成卡死循环。
   - 第 1、2 次错：停留在当前卡片，可继续作答。
   - **第 3 次错**：`session.pending = 'requeue'` → 自动跳转单词详情页。
5. **提示按钮**：只在卡片下方居中显示一个；点击后在卡片上展开该单词的词根词缀。
   - 词条没有词根词缀数据时，按钮置灰或提示"该词暂无词根词缀"，**不弹空层**。
   - 是否影响判定【已定义】：**不影响**，用过提示仍按正常答对/答错结算。

### 4.4 单词详情页（学习流程专用）

| 按钮 | 行为 |
|---|---|
| 下一题 | 按 `session.pending` 分派：`'learned'` → 提交学习成功；`'requeue'` → 重排到队尾；`pending` 为空 → 直接返回（不提交） |
| 返回 | **不提交**：该词留在原位置，`wrongMap` 保留，返回学习页重新渲染卡片与进度 |

- 明确定义：「返回」= 不提交、位置不变、不计入进度。用户因此不会因为误点而丢词或记错进度。
- 提交顺序固定为：**先落盘 → 再跳转**，不允许先 `navigate` 再异步写库。

### 4.5 提交事务（答对）

```
commitLearn(day, bookId, wordId):
    if busy: return                                   // 防连点
    busy = true
    try:
        await transaction(progress, queues, daily, logs):
            q = queues.get(day, 'learn', bookId)      // 事务内重新读取，防并发覆盖
            if !q or !q.wordIds.includes(wordId): return   // 已处理 / 跨天 → 幂等丢弃
            q.wordIds.remove(wordId)                  // 按 wordId 删，绝不 slice(0,1)
            q.done += 1
            progress.upsert(wordId, {
                bookId, state: 'learned',
                due: 明天, interval: 1, streak: 0, lapses: 保留,
                learnedDay: day
            })
            daily.learnedIds.add(wordId)              // 去重累加
            logs.add({ day, wordId, kind: 'learn', result: 'known' })
            queues.put(q)
    finally:
        busy = false
```

### 4.6 重排（错满 3 次）与当日终止性保证

```
commitRequeue(day, bookId, wordId):
    await transaction(queues, daily, logs):
        q = queues.get(day, 'learn', bookId)
        if !q or !q.wordIds.includes(wordId): return
        q.rounds[wordId] = (q.rounds[wordId] ?? 0) + 1     // 当日被重排的次数

        if q.rounds[wordId] >= MAX_REQUEUE_PER_DAY:        // K = 2【已定义】
            q.wordIds.remove(wordId)                       // 强制出队，保证当天一定结束
            q.done += 1
            progress.upsert(wordId, { state:'learned', due: 明天, lapses: +1 })
        else:
            q.wordIds.moveToEnd(wordId)                    // 移到末尾，不改 progress
            // done 不变、target 不变 → 进度不倒退
        wrongMap[wordId] = 0                               // 该词本轮计数清零
        queues.put(q)
```

- **为什么必须有 `MAX_REQUEUE_PER_DAY`**：没有它，"错满 3 次 → 移到末尾 → 再错 3 次 → 再移到末尾"可以无限循环，当天永远学不完。K=2 表示同一个词当天最多被重排 2 次（共 3 轮、最多 9 次错误），第 3 次错满时强制结算为已学习，并记 `lapses`，明天进复习池时优先被抽到。
- 重排**不推进 `done`**：进度条不会因为"把一个词排到后面"而虚增，也不会倒退（分母是快照）。

### 4.7 完成判定与文案

```
if q.wordIds.isEmpty() and q.done >= q.target:
    显示「今日学习已完成 🎉」+ 返回按钮（返回首页）
```

> v1 此处写的是"判断**复习**进度是否已完成，也就是**待复习列表**为空的时候，弹出今日已经复习完的提示" —— 判定对象复制错误：学完第一题重渲染时，待复习列表通常是空的，会立刻弹出错误提示导致学不下去。本版两页各判自己的队列，文案分开。

### 4.8 学习模块边界与异常

| 场景 | 行为 |
|---|---|
| 待学习列表为空 | 见 3.1 的四种区分提示，不进入学习页 |
| 只有 1 个词 | target=1，答对后队列空 → 已完成 |
| 词书词数 < 每日学习数量 | target = 词书剩余词数 |
| 用户中途退出 App | 已提交的词已落盘；未提交的词回到队首，下次进入继续（队列持久化，无内存依赖） |
| 详情页点返回 | 不提交，位置不变 |
| 0.5s 跳转期间杀 App | 无副作用（此时尚未写库） |
| 连点选项 / 连点下一题 | busy 锁丢弃重复点击 |
| 连错 3 次后在详情页关闭 App | 队列未变更，下次进入该词仍在队首，`pending` 丢失 → 重新作答即可（最多再错 3 次），状态安全 |
| 跨天提交 | `session.day != today` → 拒绝并提示重新开始 |

---

## 5. 复习模块

### 5.1 进入与并发锁

```
onEnterReview(bookId):
    session = { day, queueId, snapshot: queues.get(day,'review',bookId).wordIds,
                rounds: {...}, busy: false }
    current = snapshot[0]
```

同 4.1：会话持快照、提交按 wordId、跨天拒绝。

### 5.2 复习进度

```
已复习 = q.done            // 单调计数器
今日要复习 = q.target      // 快照
显示「今日要复习 {target} 个单词，已复习 {clamp(done,0,target)}」
进度条 = clamp(done / target, 0, 1)
```

### 5.3 单词卡片

- 默认显示三部分：**该单词属于哪个词书、单词 + 音标、发音按钮**。
  > 术语修正：v1 写"拼音"，英语单词没有拼音，应为**音标**；无音标数据时显示占位符，不留空白。
- 点击卡片翻转查看释义；翻卡不改任何数据。

### 5.4 认识 / 不认识

```
onKnow:
    if busy: return
    commitReview(wordId = current, result = 'known')
    // 出队 + done+1 + 写 progress（streak++、算新 due、可能转 mastered）

onForget:
    if busy: return
    rounds[wordId] += 1
    if rounds[wordId] >= MAX_ROUNDS_PER_DAY:      // K = 3【已定义】
        commitReview(wordId, result = 'forgotten_forced')
        // 强制出队 + done+1 + progress{due = 明天, streak = 0, lapses++}
        轻提示「这个词今天先放下，明天会优先出现」
    else:
        moveToEnd(wordId)                          // 移到末尾，done 不变
        轻提示「已排到队尾」
```

- **必须有轮次上限**：v1 的"不认识 → 移到末尾"没有任何上限，用户一直点"不认识"（或就是对某几个词记不住），这些词永远在队里 → "待复习列表为空"永远不成立 → **复习永远结束不了**，进度卡在 N−1/N。这正是"是否会死循环"的答案：会。K=3 后必然终止。
- 完成条件因此定义为：**队列中每个词的当日轮次都已结算**（而不是"列表为空"这种过程性描述）。

### 5.5 提交事务（复习）

```
commitReview(day, bookId, wordId, result):
    if busy: return
    busy = true
    try:
        await transaction(progress, queues, daily, logs):
            q = queues.get(day, 'review', bookId)
            if !q or !q.wordIds.includes(wordId): return       // 幂等
            q.wordIds.remove(wordId)
            q.done += 1
            p = progress.get(wordId)

            if result == 'known':
                p.streak += 1
                p.interval = INTERVALS[p.streak]              // 见下表
                p.due = day + p.interval 天
                if p.interval >= 90: p.state = 'mastered'     // 毕业，移出复习池
            else:                                             // 不认识（含强制出队）
                p.streak = 0
                p.lapses += 1
                p.interval = 1
                p.due = 明天

            daily.reviewedIds.add(wordId)
            logs.add({ day, wordId, kind: 'review', result })
            queues.put(q)
    finally:
        busy = false
```

**间隔表【已定义】**

| `streak`（连续答对次数） | `interval`（下次间隔） |
|---|---|
| 0（新学 / 不认识后） | 1 天 |
| 1 | 2 天 |
| 2 | 4 天 |
| 3 | 7 天 |
| 4 | 15 天 |
| 5 | 30 天 |
| 6 | 60 天 |
| ≥ 7 | 90 天 → 标记 `mastered`，移出复习池 |

> 这套字段回答的是"同一个词凭什么今天该复习"：不是纯随机，而是 `due ≤ 今天` 的硬过滤 + 档位比例抽样。

### 5.6 完成判定与文案

```
if q.wordIds.isEmpty() and q.done >= q.target:
    显示「今日复习已完成 🎉」+ 返回按钮（返回首页）
```

- 队列一旦进入完成态，**当天不再追加任何词**（避免"完成 → 又冒出词"的抖动）。

### 5.7 复习模块边界与异常

| 场景 | 行为 |
|---|---|
| 待复习列表为空 | 见 3.2 的四种区分提示 |
| 用户全程点"不认识" | 每词 3 次后强制出队 → 必然结束，进度必然达 100% |
| 复习中退出 App | 已提交的已落盘；未提交的（含刚点"不认识"排到末尾的）位置已持久化 |
| 连点"认识" | busy 锁 + 单事务 → 不可能一次点击吞掉两个词 |
| 0 点任务在复习中触发 | 见第 8 章：跨天提交被拒绝，不会删错词 |
| 昨天没复习完 | 队列丢弃，但 `due` 仍在过去 → 今天重新进到期池，不丢词 |

---

## 6. 单词本模块

| 模块 | 规则 |
|---|---|
| **搜索** | 只搜**当前词书**；匹配字段：单词（前缀优先）+ 释义（包含）；大小写不敏感；输入**去抖 200ms**；搜索时重置分页 |
| **全部列表** | 当前词书全部单词；**分批加载**（每批 30 条） |
| **待复习页** | 读 `queues(day,'review',book).wordIds` |
| **待学习页** | 读 `queues(day,'learn',book).wordIds` |
| **单词详情跳转** | 跳单词本专属详情页，底部按钮为 **上一个 / 下一个**；与学习流程、复习流程的详情页不共用 |

**动态加载实现要求【已定义】**
1. 用 `IntersectionObserver` 监听列表底部哨兵，**不要监听 `scroll` 事件算位置**（抖动 + 重复渲染）。
2. 排序必须**稳定且唯一**（如 `order ASC, wordId ASC` 兜底），否则分页会出现重复项或漏项。
3. 用 `limit / offset` 或游标分批取数，不要把全表读进内存。
4. 切换 tab、执行搜索、切换词书时**重置分页**。
5. 组件卸载时断开 observer。
6. 详情页用 `navigate(replace: true)` 切换上一个/下一个，避免历史栈堆积。

---

## 7. 切换词书

### 7.1 核心改动：判据从"列表是否为空"换成"今天是否已有队列"

```
onSwitchBook(newBookId):
    for kind in ['learn', 'review']:
        q = ensureDailyTask(newBookId, kind, day)     // 幂等：有记录就只读，没有才生成一次
    render(newBookId, q)
```

**为什么必须换判据**：v1 是"判断待学习列表是否为空，为空则执行获取今日学习单词的函数"。而"待学习列表为空"同时表达了两种完全不同的状态 ——
① 今天还没发过任务；② 今天发过了、并且已经学完了。

后果是**不需要两本书互相影响**就能复现的无限刷词：

```
每日学习数量 = 20
09:00  书1 待学习为空 → 生成 20 个
09:30  学完 20 个      → 书1 待学习为空，今天的任务其实已完成
09:31  切到书2         → 书2 待学习为空 → 生成 20 个
09:32  切回书1         → 书1 待学习为空 → 又生成 20 个   ← 今天的第 2 批
09:35  学完 → 再切走再切回 → 又 20 个 …
```

根因是**用"空/非空"这种结果状态去判断"今天有没有初始化过"**；而"生成"是个每天只该跑一次的函数，却被"切换词书"这个可以无限重复的动作触发。用 `(day, bookId, kind)` 做幂等键后：学完再切回来，队列存在且 `done = target` → 只读 → 提示"今日学习已完成"，不会再生成。

### 7.2 每日额度口径【已定义】

- **默认按书计**：每本词书各自享有 `settings.dailyNew` / `dailyReviewLimit` 的额度。两本书就是各 20 个/天。
- 若希望**全局共享额度**（一天所有书合计 20 个），需要在 `daily` 表里维护"今日已生成的新词数"，并在 `ensureDailyTask` 里用 `min(dailyNew, 每日剩余额度, 未学习数)`。二选一，必须明确写死，不能含糊。
- 无论选哪种口径，**"切书刷词"都不会发生**，因为生成是按 `(day, bookId, kind)` 幂等的。

### 7.3 新建词书

- 当天新建的词书：首次切换到它时按幂等生成一次当天队列（口径按 7.2），此后不再重复生成。
- 首页/词书完成度立即出现该书条目，进度 0%。

---

## 8. 跨天与并发

### 8.1 0 点任务触发时用户正在学习 / 复习

| 风险 | 本版处置 |
|---|---|
| 任务覆盖队列，用户手里的卡片已不在新队列里 | 会话持有**快照**，提交按 `wordId` 定位；若 `wordId` 不在当前队列则视为已处理，幂等丢弃 |
| "移除第一个"删掉的是新队列的第一个词 | 已彻底禁止按位置删除，只按 `wordId` |
| 进度分母换天、分子错位 | 进度读 `session.snapshot` + `session.day`，不读新队列 |
| 任务与提交并发写同一行 | 提交在**单事务**内重新读取队列；任务同样走事务 |
| 用户跨天后继续作答 | 提交前校验 `session.day == today`，不一致则拒绝并提示"已跨天，请返回首页重新开始" |

**推荐附加策略**：`runDailyTask` 执行前检查是否存在活动会话（内存标记 `isSessionActive`），若有则**推迟到会话结束再执行**（配合"启动时补跑"保证最终一定会执行）。这是体验最优解，但不是必需条件 —— 上面的快照 + wordId + 跨天拒绝已经能保证数据正确。

### 8.2 跨天场景逐步说明

| 时刻 | 事件 | 结果 |
|---|---|---|
| 23:59 | 用户进入复习页 | `session.day = 2024-03-01`，快照固化 |
| 00:00 | 0 点任务执行 | 生成 03-02 的队列；用户侧无感 |
| 00:01 | 用户点"认识" | `session.day(03-01) != today(03-02)` → 拒绝写入，提示"已跨天，请返回首页重新开始" |
| 00:02 | 用户返回首页再进入 | 用 03-02 的队列重新开始，数据干净 |

### 8.3 并发写入三条铁律
1. 队列的"读—改—写"必须在**一个事务**内。
2. 队列与进度必须在**同一次写入**里落盘（历史上曾出现"并发的进度写入把队列回滚"的问题）。
3. 提交型按钮全部走 `busy` 锁。

---

## 9. 核心逻辑伪代码汇总

```js
// ─────────────────────────── 任务生成（幂等） ───────────────────────────
function ensureDailyTask(bookId, kind, day, target) {
  return db.transaction('rw', queues, async () => {
    const exist = await queues.get([day, kind, bookId])
    if (exist) return exist                       // ← 唯一的幂等判据，不看"列表是否为空"

    let wordIds = []
    if (kind === 'learn') {
      const pool = 未学习列表(bookId)             // 派生视图
      wordIds = sample(pool, min(target, pool.length))
    } else {
      const duePool = progress.where({bookId, state:'learned'}).filter(p => p.due <= day)
      wordIds = sample(duePool, min(target, duePool.length))
    }
    const q = { day, kind, bookId, wordIds, target, done: 0, rounds: {}, createdAt: now() }
    await queues.put(q)
    return q
  })
}

// ─────────────────────────── 每日任务（学习 + 复习） ───────────────────────────
async function runDailyTask(day) {
  if (runState.lastRunDay === day) return          // 幂等
  await db.transaction('rw', queues, progress, runState, async () => {
    for (const book of await allBooks()) {
      const unlearned = 未学习列表(book.id).length
      if (unlearned <= 0) { book.completed = true; continue }
      const nLearn = min(settings.dailyNew, unlearned)
      await ensureDailyTask(book.id, 'learn', day, nLearn)

      const learned = 已学习列表(book.id).length
      if (learned <= 0) continue
      if (settings.dailyReviewLimit <= 0) { await ensureDailyTask(book.id,'review',day,0); continue }
      const want = ceil(learned * 复习档位(learned))          // ≤10→1.0 / ≤60→0.8 / ≤150→0.6 / 其余→0.5
      await ensureDailyTask(book.id, 'review', day, min(want, settings.dailyReviewLimit))
    }
    await runState.put({ id: 'app', lastRunDay: day })         // 仅在成功后写入
  })
}

function 复习档位(n) {
  if (n <= 10)  return 1.0
  if (n <= 60)  return 0.8
  if (n <= 150) return 0.6
  return 0.5                                                   // ← v1 缺失的兜底档
}

// ─────────────────────────── 进度 ───────────────────────────
function progressOf(q) {
  const total = q.target                                       // 快照，不重算
  const done  = clamp(q.done, 0, total)                        // 计数器，只增不减
  return { text: `已${q.kind === 'learn' ? '学习' : '复习'} ${done} / 今日 ${total}`,
           percent: total === 0 ? 1 : done / total }
}
const isDone = (q) => q.wordIds.length === 0 && q.done >= q.target

// ─────────────────────────── 学习提交（答对） ───────────────────────────
async function commitLearn(session, wordId) {
  if (session.busy) return                                     // 防连点
  if (session.day !== dayKey(now())) return 提示('已跨天，请返回首页重新开始')
  session.busy = true
  try {
    await db.transaction('rw', queues, progress, daily, logs, async () => {
      const q = await queues.get([session.day, 'learn', session.bookId])   // 事务内重读
      if (!q || !q.wordIds.includes(wordId)) return            // 幂等丢弃
      q.wordIds = q.wordIds.filter(id => id !== wordId)        // 按 id 删
      q.done += 1
      await progress.put({ wordId, bookId: session.bookId, state: 'learned',
                           due: addDays(session.day, 1), interval: 1,
                           streak: 0, lapses: prev.lapses, learnedDay: session.day })
      await daily.addLearned(session.day, wordId)
      await logs.add({ day: session.day, wordId, kind: 'learn', result: 'known' })
      await queues.put(q)
    })
  } finally { session.busy = false }
}

// ─────────────────────────── 学习重排（错满 3 次） ───────────────────────────
const MAX_REQUEUE_PER_DAY = 2
async function commitRequeue(session, wordId) {
  await db.transaction('rw', queues, progress, logs, async () => {
    const q = await queues.get([session.day, 'learn', session.bookId])
    if (!q || !q.wordIds.includes(wordId)) return
    q.rounds[wordId] = (q.rounds[wordId] ?? 0) + 1
    if (q.rounds[wordId] >= MAX_REQUEUE_PER_DAY) {             // 强制出队，保证当天一定结束
      q.wordIds = q.wordIds.filter(id => id !== wordId)
      q.done += 1
      await progress.patch(wordId, { state: 'learned', due: addDays(session.day,1), lapses: +1 })
    } else {
      q.wordIds = [...q.wordIds.filter(id => id !== wordId), wordId]   // 移到末尾，done 不变
    }
    session.wrongMap[wordId] = 0                               // 该词本轮计数清零
    await queues.put(q)
  })
}

// ─────────────────────────── 复习提交 ───────────────────────────
const MAX_ROUNDS_PER_DAY = 3
const INTERVALS = [1, 1, 2, 4, 7, 15, 30, 60, 90]              // 下标 = streak

async function commitReview(session, wordId, result) {
  if (session.busy) return
  if (session.day !== dayKey(now())) return 提示('已跨天，请返回首页重新开始')
  session.busy = true
  try {
    await db.transaction('rw', queues, progress, daily, logs, async () => {
      const q = await queues.get([session.day, 'review', session.bookId])
      if (!q || !q.wordIds.includes(wordId)) return             // 幂等
      q.wordIds = q.wordIds.filter(id => id !== wordId)
      q.done += 1

      const p = await progress.get(wordId)
      if (result === 'known') {
        p.streak += 1
        p.interval = INTERVALS[min(p.streak, INTERVALS.length - 1)]
        p.due = addDays(session.day, p.interval)
        if (p.interval >= 90) p.state = 'mastered'              // 毕业，移出复习池
      } else {                                                  // 不认识 / 强制出队
        p.streak = 0; p.lapses += 1; p.interval = 1
        p.due = addDays(session.day, 1)
      }
      await progress.put(p)
      await daily.addReviewed(session.day, wordId)
      await logs.add({ day: session.day, wordId, kind: 'review', result })
      await queues.put(q)
    })
  } finally { session.busy = false }
}

// ─────────────────────────── 学习页答题分派 ───────────────────────────
function onPick(option) {
  if (locked) return                                            // 防连点
  if (option.correct) {
    locked = true; session.pending = 'learned'
    toast('答对了'); setTimeout(() => gotoWordDetail(wordId), 500)
  } else {
    session.wrongMap[wordId] = (session.wrongMap[wordId] ?? 0) + 1
    toast('选错了哟')
    if (session.wrongMap[wordId] >= 3) {                        // 按 wordId 计数
      locked = true; session.pending = 'requeue'
      gotoWordDetail(wordId)
    }
  }
}

async function onNextInDetail() {
  if (session.pending === 'learned') await commitLearn(session, wordId)
  else if (session.pending === 'requeue') await commitRequeue(session, wordId)
  session.pending = null
  back()                                                        // 先落盘，后跳转
}
```

---

## 10. 异常、降级与自检

### 10.1 发音（TTS）
- 不支持 Web Speech / 无语音包 / iOS 静音键 / 浏览器要求用户手势时：播放按钮置灰并提示"当前设备不支持发音"，**不得静默失败**。
- 发音不写入任何学习数据。

### 10.2 数据自检（建议做一个入口）
在"我的"里提供一键自检，把"状态是否闭环"变成可验证的：

| 检查项 | 期望 |
|---|---|
| 未学习 ∩ 已学习 | 空集 |
| 任意列表内重复词 | 无 |
| `q.done > q.target` | 不存在 |
| `q.wordIds` 里存在不属于该词书的词 | 不存在 |
| `q.day` 不是今天 | 只应出现在历史队列中 |
| `progress.state = 'learned'` 但 `due` 为空 | 不存在 |
| 已学习数 > 词书总词数 | 不存在 |

### 10.3 崩溃 / 杀 App 恢复
- 所有提交立即落盘，无内存态依赖。
- 重新进入学习/复习页时，当前卡片 = 队列第一个词，与上次退出时的现场一致（已提交的不复现，未提交的继续）。
- 唯一会丢的是 0.5s 自动跳转这类**纯 UI 延时**，它没有副作用。

---

## 11. 边界条件总清单（自测用）

| # | 场景 | 期望行为 |
|---|---|---|
| 1 | 待学习 / 待复习列表为空 | 按 3.1 / 3.2 四种原因分别提示，区分"已完成""上限=0""无到期词""无已学词" |
| 2 | 未学习数 = 0 | 词书标记完成，不再发新词 |
| 3 | 词书只剩 3 个词，每日学 20 | 抽这 3 个 |
| 4 | 每日学习数量 = 0 / 每日复习上限 = 0 | 落空队列 + 专门提示，不进入页面 |
| 5 | 已学习 151 个词 | 走 `>150 → 50%` |
| 6 | 23:59 进入、00:01 提交 | 拒绝提交 + 提示重新开始 |
| 7 | 学习中直接杀 App | 已提交的保留，未提交的回到队首 |
| 8 | 连点"认识" | 只结算一次 |
| 9 | 连点选项 / 连点下一题 | 只结算一次 |
| 10 | 全程点"不认识" | 每词 3 次后强制出队，当天必然结束 |
| 11 | 同一词错满 3 次 → 排到队尾 → 再错满 3 次 | 第 2 次重排后强制结算为已学习，记 `lapses`，明天优先复习 |
| 12 | 详情页点"返回" | 不提交、位置不变、进度不变 |
| 13 | 学完后切走再切回 | **不重新生成**，提示"今日学习已完成" |
| 14 | 中途修改每日学习数量 | 进度不跳变（target 是快照） |
| 15 | 昨天没复习完 | 队列丢弃，`due` 仍在过去 → 今天重新进池，不丢词 |
| 16 | 一个词同时属于两本词书 | 全局只学一次，两本书的完成度都计入 |
| 17 | 新建词书 | 首次切换时生成一次当天队列 |
| 18 | 用户隔 5 天没打开 | 只按"今天"补跑一次，不补历史 |
| 19 | 系统时间被回拨 | 以本地日期为准，队列按 `(day,...)` 隔离，不产生重复（自检可发现异常） |
| 20 | 多标签页同时打开同一页面 | 单事务 + 幂等提交，不产生重复结算 |

---

## 附录 A：与原流程的逐条对照

| 原流程条目 | 处置 |
|---|---|
| 数据表：词书单词表 / 已学习 / 未学习 / 待学习 / 待复习 + 自动去重 | ✅ 保留语义，改为 2 张实体表（`bookWords` / `progress`）+ 1 张当日队列表（`queues`）+ 派生视图；去重由主键保证 |
| 定时任务：每日 0 点执行 | ⚠️ 改为启动时惰性补跑为主、定时器兜底、按 `(day, bookId, kind)` 幂等 |
| 分支一：未学习数 − 每日数 ≥ 0 / < 0 | ✅ 等价简化为 `min(每日数, 未学习数)` |
| 分支一：未学习 ≤ 0 → 词书完成 | ✅ 保留，但在新的"未学习=派生视图"定义下才真正成立 |
| 分支二：已学习为空则不抽取 | ✅ 保留 |
| 分支二：≤10→100% / ≤60→80% / ≤150→60% | ✅ 保留，**补 >150→50% 兜底档** |
| 分支二：与每日复习上限比较 | ✅ 保留，另加"到期池"过滤与 `ceil` 取整规则 |
| 分支二：目标数 − 待复习数 → 追加 / 移出后几位 | ❌ **整段删除**（队列每日重建，无需累加裁减；"移出后几位"会把最不熟的词优先丢弃） |
| 首页学习按钮：待学习为空 → 提示"明日再来" | ✅ 保留，并按 3.1 细分为四种提示 |
| 学习进度：已学习 = 抽取数 − 待学习数 | ❌ 改为 `done / target` 快照与计数器 |
| 只加载待学习列表的第一个单词 | ✅ 保留 |
| 答对 → 0.5s → 详情页 → 下一题 → 移出待学习 + 加入已学习 | ✅ 保留，补：事务化三写（含派生视图一致性）、防连点、先落盘后跳转 |
| 答错 → 连错 3 次 → 详情页 → 下一题 → 移到末尾 | ✅ 保留；**计数按单词（wordId）**，作用域为"该词本次在队首的一轮"，并补 `MAX_REQUEUE_PER_DAY` 保证终止 |
| 详情页"返回"按钮 | ✅ 保留，明确"不提交、位置不变、进度不变" |
| 下方提示按钮（词根词缀） | ✅ 保留，补空态处理与"不影响判定"的说明 |
| 学习页重渲染判断"待复习列表为空 → 今日已经复习完" | ❌ 判定对象错误，改为判"待学习队列 + target/done"，文案改为"今日学习已完成" |
| 复习进度：已复习 = 抽取数 − 待复习数 | ❌ 同上，改为 `done / target` |
| 卡片显示词书 / 单词 + 拼音 / 发音 | ✅ 保留，"拼音"更正为**音标**，补 TTS 降级 |
| 不认识 → 移到末尾 | ✅ 保留，补每词当日轮次上限 K=3 与强制出队 |
| 认识 → 从待复习移除 | ✅ 保留，补 SRS 写回（`due/interval/streak/lapses/mastered`） |
| 复习页重渲染判断待复习为空 → 已完成 | ✅ 保留（复习页这个判定是对的），补"完成后当天不再追加" |
| 单词本：搜索（仅当前词书） | ✅ 保留，补匹配字段、去抖 200ms |
| 单词本：全部 + 动态加载 | ✅ 保留，补 IntersectionObserver / 稳定排序 / 分页重置 / 卸载清理 |
| 单词本：待复习 / 待学习页 | ✅ 保留，读当日队列视图 |
| 单词本详情页：上一个 / 下一个 | ✅ 保留，补 `replace: true` 避免历史栈堆积 |
| 词书完成度：已学习 / 词书总数 | ✅ 保留，补 `clamp(0,1)`、合计分母去重、与首页顶部进度共用一份数据 |
| 切换词书：加载该词书数据 + 待学习为空则生成 | ⚠️ **判据改为"该书今天的队列是否存在"**（幂等），并明确每日额度按书计（或全局计，二选一） |

## 附录 B：提示语文案表

| 场景 | 文案 |
|---|---|
| 今日学习已完成 | 今日学习已完成 🎉 |
| 今日复习已完成 | 今日复习已完成 🎉 |
| 没有可学的新词 | 今日暂无学习任务，明日再来吧！ |
| 没有可复习的词（无到期） | 今天没有到期的单词，明天再来 |
| 从没学过单词 | 还没有学过的单词，先去学几个新词吧 |
| 每日学习数量设为 0 | 你已把每日学习数量设为 0 |
| 每日复习上限设为 0 | 你已把每日复习上限设为 0 |
| 词书全部学完 | 这本书的单词已经全部学完啦 🎉 |
| 答对 | 答对了 |
| 答错 | 选错了哟 |
| 不认识（未到轮次上限） | 已排到队尾 |
| 不认识（达到轮次上限，强制出队） | 这个词今天先放下，明天会优先出现 |
| 跨天提交 | 已跨天，请返回首页重新开始 |
| 无发音能力 | 当前设备不支持发音 |
| 无词根词缀 | 该词暂无词根词缀 |

## 附录 C：与当前代码实现的主要差异（实施时需同步修改的点，仅供参考）

| 主题 | 当前实现 | 本文档 |
|---|---|---|
| 日切驱动 | 进入页面时按 `dayKey` 惰性生成（无 0 点任务） | 启动补跑 + 定时器兜底，语义一致但需显式化 `runState.lastRunDay` |
| 复习抽样档位 | `≤50→60% / ≤100→50% / >100→40%` | `≤10→100% / ≤60→80% / ≤150→60% / >150→50%` |
| 复习候选池 | `state.reps > 0` 的全部学过词（无到期过滤） | `state = learned` 且 `due ≤ 今天` |
| 复习完成判定 | 队列为空 + `passed > 0` | 队列为空 + `done >= target`（每词当日轮次上限 K=3） |
| 学习错题处理 | 错满 3 次 → 移到末尾（无当日上限） | 保留 + `MAX_REQUEUE_PER_DAY = 2` 强制出队 |
| 进度来源 | `target` 与 `done` 写入队列快照 | 同上（已一致），需补 `clamp` 与 `target=0` 的分支 |
| 提示语 | 复习页空态文案沿用旧口径 | 按附录 B 全量替换 |
