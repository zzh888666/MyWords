# 页面开发契约（v2 重写）

> 这份文档是并行开发多个页面时的**唯一接口约定**。动手前必须先读这里的「可复用 API」与「硬性规则」，
> 不要新增样式、不要改公共文件、不要引入依赖。

## 0. 先读这些文件

| 文件 | 作用 |
|---|---|
| `docs/LOGIC_FLOW.md` | 业务逻辑唯一依据（本次重写的目标流程） |
| `src/types.ts` | 领域模型（Word / Book / Progress / SessionQueue / Settings …） |
| `src/db/index.ts` | 数据层（表、读写函数、导入导出、重置） |
| `src/lib/derive.ts` | **派生视图与统计**（未学习/已学习/到期池/完成度/连续打卡…） |
| `src/lib/srs.ts` | 复习档位比例、间隔表、洗牌、干扰项生成 |
| `src/lib/tasks.ts` | `ensureDailyTask` / `catchUpDailyTasks` / `rebuildTodayTasks` |
| `src/lib/session.ts` | 作答提交（`commitLearn` / `commitRequeue` / `commitReview`）与轮次上限常量 |
| `src/lib/date.ts` | 日期键与格式化（`todayKey` / `addDays` / `lastNDays` / `humanDuration` …） |
| `src/store/app.ts` | 全局状态（`useApp`：settings/today/flash/toast）+ 学习会话（`useStudySession`） |
| `src/components/ui.tsx` | 基础组件（Button / Card / IconBadge / ProgressBar / Segmented / Section / ListRow / Sheet / EmptyState / Stepper / Switch / Field / Stat / TopBar / IconButton） |
| `src/styles.css` | 设计令牌与全部类名（**只准用这里已有的类**） |
| `src/pages/Home.tsx`、`src/pages/Review.tsx` | 范例页，照它们的写法来 |

## 1. 硬性规则

1. **不得修改**契约以外的任何文件：`styles.css`、`components/ui.tsx`、`lib/*`、`db/*`、`store/*`、`App.tsx`、`routes.ts`、其它页面。
   需要新工具函数时，写在自己负责的页面文件里，或直接用 `db`。
2. **不新增依赖**（`package.json` 不许动）。图标只用 `lucide-react`，用之前确认导出存在。
3. TypeScript 严格模式：`noUnusedLocals` / `noUnusedParameters`（未使用的变量与参数会直接报错）；
   `verbatimModuleSyntax`（类型导入必须写 `import type`）。相对导入**不带扩展名**（`from '../lib/derive'`）。
4. 每个页面 `export default function Xxx()`。
5. **数据订阅只用 `useQuery(fn, deps, initial)`**，`deps` 里只能放原始值（字符串/数字/布尔）：
   放对象会因为每次发射都是新引用而无限重订阅（v1 踩过这个坑）。
   例：`useQuery(() => getBookWords(bookId), [bookId], EMPTY_LIST as Word[])`。
6. 所有「今天」都从 `useApp((s) => s.today)` 取，不要自己 `new Date()`，否则跨天不会刷新。
7. 提示语统一用 `useApp((s) => s.flash)`（`flash('文案', 'success' | 'warn' | 'info')`），不要自己写弹层。
8. 可访问性：纯图标按钮必须用 `<IconButton icon={X} label="说明" />`；
   触控目标 ≥44px；状态不能只用颜色表达（配合图标或文字）；表单控件要有 label / aria-label。
9. 文案：简体中文，短句，语气克制。不要堆感叹号，不要夸大（例如「提升 300%」这类无依据内容禁止出现）。
10. 删除「不合理功能」优先于保留：凡是重复入口、对用户无意义的调试按钮、设置了但没有任何作用的选项，直接删掉。

## 2. 可复用 API 速查

### 导航与返回（**必须遵守**）
```ts
import { useGo, useGoBack } from '../lib/nav'

const go = useGo()                       // 进入子页面：自动记录来源
go(ROUTES.books)                         // 需要替换当前页时 go(to, { replace: true })

const goBack = useGoBack(ROUTES.home)    // 子页面返回：来源 → 浏览器历史 → 兜底，三级回退
```
- 不要用裸 `navigate()` 进入可返回的子页面：它不记录来源，返回只能落到写死的兜底页。
- 子页面必须有 `TopBar onBack={goBack}`；从多个入口可达的页面（词书管理、学习计划、学习成就）
  尤其容易踩这个坑。

### 数据订阅
```ts
import { useQuery, EMPTY_LIST, useOnVisible } from '../lib/hooks'
```

### 派生视图 / 统计（`src/lib/derive.ts`）
```ts
listBooks(): Promise<Book[]>                          // 内置在前、自建在后
getBookWordIds(bookId): Promise<string[]>
getBookWords(bookId): Promise<Word[]>
getWord(id): Promise<Word | undefined>
getWordsByIds(ids): Promise<Word[]>
getProgressMap(): Promise<Map<string, Progress>>
getLearnedIds(bookId) / getUnlearnedIds(bookId) / getDueIds(bookId, day)
getBookProgress(bookId): Promise<BookProgress | null>  // { book,total,learned,mastered,percent }
getAllBookProgress(): Promise<BookProgress[]>
getOverallProgress(): Promise<{ total, learned, percent }>
getQueueWords(q): Promise<Word[]>
hasTask(q) / isQueueDone(q) / queuePercent(q)           // q 可以是 undefined
getStreak(endDay): Promise<number>
getDailyRange(days: readonly string[]): Promise<DailyStat[]>
getKindStats(day, kind): Promise<{ answered, correct, durationMs, accuracy }>
getTotalStats(): Promise<{ learned, reviews, answered, correct, accuracy, durationMs, activeDays }>
getMasteryBuckets(): Promise<{ fresh, learning, familiar, mastered }>
```

### 数据层（`src/db/index.ts`）
```ts
db.words / db.books / db.bookWords / db.progress / db.queues / db.daily / db.logs / db.settings
getQueue(day, kind, bookId) / putQueue / deleteQueue
loadSettings() / saveSettings(patch)
addCustomBook(name, description, words: Word[], color?) / deleteBook(id) / updateWord(word)
exportAll() / importAll(payload) / resetProgress()
```

### 任务（`src/lib/tasks.ts`）
```ts
ensureDailyTask(bookId, kind, day): Promise<SessionQueue>   // 幂等
catchUpDailyTasks(): Promise<{ day, ran }>
rebuildTodayTasks(kinds: readonly QueueKind[], settings?): Promise<number>
```

### 全局状态（`src/store/app.ts`）
```ts
const today    = useApp((s) => s.today)
const settings = useApp((s) => s.settings)      // Settings（id/nickname/avatar/dailyNew/dailyReviewLimit/currentBookId/studyMode/autoPronounce/accent/speechRate/theme/reminderEnabled/reminderTime）
const flash    = useApp((s) => s.flash)
const patch    = useApp((s) => s.patchSettings)  // 会顺带重建「还没开始」的今日队列
const resetAll = useApp((s) => s.resetAll)
```
> 改 `dailyNew` / `dailyReviewLimit` 必须走 `patchSettings`，不要直接写库 —— 否则今天的任务数量不会跟着变。

### 组件（`src/components/ui.tsx`）
`Button(variant: primary|surface|outline|ghost|danger, size: md|lg, block)`、`IconButton(icon,label)`、
`IconBadge(icon, tone: indigo|violet|cyan|emerald|amber|rose, size)`、`Card(pad|ink)`、
`ProgressBar(value 0~1, size, tone, onInk, label)`、`Segmented(value,onChange,options,ariaLabel)`、
`Section(title,icon,tone,more)`、`ListRow(icon,tone,title,sub,trail,onClick)`、`Stat(value,label)`、
`Stepper(value,onChange,min,max,step,suffix)`、`Switch(checked,onChange,label)`、`Field(label,hint)`、
`EmptyState(icon,tone,title,desc,action)`、`Sheet(open,onClose,title,desc,children,footer)`、`TopBar(title,onBack,actions,bordered)`。

### 样式类（只准用这些，`src/styles.css`）
布局：`.app .app-main .page .page--flush .page--center .topbar .topbar--bordered .screen .card .card--pad .card--ink`
组件：`.btn(--primary/--surface/--outline/--ghost/--danger/--lg/--block) .icon-btn .icon-badge(--{tone})(--lg) .progress .progress--lg .progress__fill .segmented .segmented__item(.is-active) .chip(.chip--{tone}/--ok) .section .section__head .section__title .section__more .list .listrow .listrow__main/__title/__sub/__trail .stat-row .stat .stat__value .stat__label .field .field__label .input .textarea .switch .stepper .stepper__btn .stepper__value .sheet-backdrop .sheet .sheet__grip .sheet__title .sheet__desc .sheet__foot .toast-layer .empty .empty__title .empty__desc .divider .skeleton`
排版：`.serif .eyebrow .muted .dim .num .sr-only`
首页：`.home-head .home-head__hi .home-head__date .avatar .hero .hero__top/__name/__meta/__change/__foot/__pct .task-grid .task-card__* .streak .streak__value/__label/__right .book-row .book-row__main/__name/__meta/__pct`
单词：`.wordcard .wordcard__word .wordcard__phonetic .wordcard__hint .speak-btn .option .option__key .option__text .option.is-correct/.is-wrong/.is-dimmed .flipwrap .flipcard .flipcard__face(--back) .flipcard__book/__word/__phonetic/__tip/__meaning/__scroll .detail-hero .detail-word .detail-sub .detail-phonetic .block .block__title .block__body .sense .sense__pos .sense__zh .example .example__en .example__zh .forms-grid .form-item .form-item__k/__v`
单词本：`.search .search__icon .search__clear .wordrow .wordrow__main/__word/__def .load-more`
统计：`.metric-grid .metric .metric__value .metric__unit .metric__label .trend .trend__col .trend__bars .trend__bar(--review) .trend__label .legend .legend__item .legend__dot(--review) .calendar .cal-cell(.is-l1..is-l4/.is-today)`
其它：`.badge-grid .badge(.is-locked) .badge__name .badge__desc .namecard .namecard__avatar/__name/__sub .book-card(.is-current) .book-card__name/__desc .result .result__mark/__title/__desc/__stats .boot .spinner`

需要微调间距/字号时，用内联 `style`（少量、局部），不要改 `styles.css`。

## 3. 页面级要求

### 3.1 `src/pages/Words.tsx` + `src/pages/WordDetail.tsx`
- 三个筛选：`全部 / 待复习 / 待学习`（`Segmented`）。数量角标用各自列表长度。
  - 全部 = 当前词书全部单词
  - 待复习 = `getQueue(today,'review',bookId).wordIds`
  - 待学习 = `getQueue(today,'learn',bookId).wordIds`
  - 队列不存在时（今天还没生成）显示空态而不是报错；`全部` 永远可用。
- 搜索：只搜当前词书；匹配「单词前缀」与「释义包含」；**去抖 200ms**；搜索时重置分页。
- 全部列表分批加载：每批 30 条，用 `IntersectionObserver` 监听底部哨兵（**不要监听 scroll**）；
  排序稳定（按 `getBookWordIds` 顺序）；切换筛选/搜索/词书时重置分页；卸载时断开 observer。
- 行：单词（`serif`）+ 释义，右侧 `ChevronRight`；点击进入详情，带上来源范围，例如
  `navigate(ROUTES.word(id) + '?scope=all|review|learn', navState(ROUTES.words))`。
- 详情页：`TopBar`（返回 `useGoBack(ROUTES.words)`）+ 单词大标题 + 音标 + 发音 + `WordBody`，
  底部固定「上一个 / 下一个」：**沿当前 scope 的列表顺序**切换（在「待复习」里进的详情，就沿待复习列表走），
  用 `navigate(..., { replace: true })` 避免历史栈堆积；到头时按钮置灰。
- 删除：详情页不再提供「修改词条」入口（自建词书改词条属于边缘需求，界面里删掉更干净）。

### 3.2 `src/pages/Stats.tsx` + `src/pages/Achievements.tsx`
- 统计页：
  - 顶部 2×2 指标卡：累计学会、累计复习、平均正确率、学习天数（`getTotalStats` + `getOverallProgress`）。
  - 趋势：近 7 天 / 近 30 天切换（`Segmented`），用 `.trend` 画柱状：每天两根柱（新学 / 复习），配 `.legend`。
  - 打卡日历：近 35 天（`lastNDays(35)` + `getDailyRange`），按当日学习量分 4 档（`.cal-cell.is-l1..is-l4`），今天加 `.is-today`，下方给图例说明「少 → 多」。
  - 掌握分布：用 `getMasteryBuckets()` 画 4 段横向条（新学 / 熟悉中 / 熟练 / 已毕业），配数字。
  - 空数据（没有任何作答）时整页显示一个 `EmptyState`，引导去首页开始学习。
- 成就页：`computeAchievements(input)`（`src/lib/achievements.ts`），卡片网格，
  未解锁用 `.badge.is-locked` + 进度条（`current/target`），顶部显示「已解锁 N / 12」。

### 3.3 `src/pages/Profile.tsx` + `src/pages/Plan.tsx` + `src/pages/Books.tsx`
- **我的**：昵称与头像（`Sheet` 里编辑，头像用 `AvatarId` 里的 emoji）、累计数据小名片、
  入口行（学习计划 / 词书管理 / 学习成就 / 统计）、
  设置分组：发音（自动发音 `Switch`、口音 us/uk、语速 `Slider`→用 `Stepper` 步长 0.05 或原生 `input[type=range]` 亦可）、外观（主题 跟随系统/浅色/深色）、
  提醒（开关 + 时间 `input[type=time]`）、
  数据管理（导出备份 / 导入备份 / 重置学习进度，危险操作用 `Sheet` 二次确认）。
  **删除**：「生成测试复习数据」这类调试按钮；不要在「我的」里重复每日新词/学习模式（那些在学习计划页）。
- **学习计划**：每日学习数量（`Stepper` 步长 5，含 0）、每日复习上限（`Stepper` 步长 10，含 0）、
  学习方式（选择题 / 拼写，`Segmented`）、当前词书（点进词书管理）、
  底部「保存计划」→ `patchSettings`。改动影响当天「还没开始」的队列，这是预期行为（要说明）。
- **词书管理**：列出全部词书（`.book-card`，当前词书高亮），点选即切换（`patchSettings({currentBookId})`）；
  新建自建词书（`Sheet`：名称 + 粘贴词表，每行 `word|释义` 或 `word,释义`，解析成 `Word` 后 `addCustomBook`）；
  删除自建词书（`Sheet` 二次确认，说明「已学进度会保留」）；内置词书不可删除。

## 4. 完成标准

- `npx tsc -p tsconfig.json --noEmit` 在**你负责的文件上**零错误（别人的文件可能还没写完，忽略）。
- 不新增 CSS、不新增依赖、不改公共文件。
- 页面在窄屏（375px）与桌面（≥900px）都不溢出：长单词/长释义要能换行或省略。
- 交付时用一句话说明：改了哪些文件、有哪些地方按「删除不合理功能」做了取舍。
