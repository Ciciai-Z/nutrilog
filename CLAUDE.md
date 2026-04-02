# NutriLog — Project Context for Claude

> 这个文件是给 Claude 读的。每次新对话开始时，请先阅读此文件，再开始工作。
> Last updated: 2026-04-02 · Session 7 · B6/B8/B9 完成，进入 Polish 阶段

---

## 项目简介

NutriLog 是一个**个人单用户营养记录 Web 应用**。数据存储在 Google Sheets，前端托管在 GitHub Pages，跨设备访问（iPhone 13 Pro + MacBook Pro）。

**核心原则：零成本、无需服务器、无需构建工具、可长期维护迭代。**

---

## 当前项目状态

**阶段：B6/B8/B9 ✅ 完成 · Session 7 Polish 完成 · 进入 TODO Polish 阶段**

### Block 进度

| Block | 名称 | 状态 |
|-------|------|------|
| B0–B5 | 基础设施 → Log CRUD | ✅ 完成 |
| Session 5/6 | UI Polish | ✅ 完成 |
| B6 | Quick Add | ✅ 完成 |
| B7 | Custom Foods CRUD | ✅ 完成 |
| B8 | Meal Templates (Composed only) | ✅ 完成 |
| B9 | History (DailySummary view) | ✅ 完成 |
| Session 7 | 自动登出、字体系统、bug fixes | ✅ 完成 |
| TODO Polish | 见下方 TODO 列表 | 🔄 进行中 |

### TODO Polish 剩余

| ID | 描述 | 优先级 |
|----|------|--------|
| TODO-01 | Settings 输入框范围提示 | 低 |
| TODO-02 | 登录页键盘 12 格对称 | 暂不做 |
| TODO-03 | Tab Bar 字体优化 | 低 |
| TODO-05 | Mac 宽屏 Today 条目双列布局 | 中 |
| TODO-06 | Mac Today 日期点击弹日历 | 中 |
| TODO-07 | 整体 Layout 优化 | 中 |
| — | 修改密码功能 | 暂不做 |

---

## 技术架构

```
iPhone/Mac Browser ↕ JSONP ↕ Google Apps Script ↕ Sheets API ↕ Google Spreadsheet (8 sheets)
```

| 层 | 技术 |
|----|------|
| 前端 | HTML + Vanilla JS (ES Modules, Scheme B) |
| 后端 | Google Apps Script (Code.gs + config.gs) |
| 数据库 | Google Sheets (8 sheets) |
| 托管 | GitHub Pages |
| 认证 | SHA-256 PIN + sessionStorage token |
| CORS | JSONP (动态 script tag) |

**Token 验证**：GAS `verifyToken()` 改为非空即有效。单用户 App，scriptUrl 已 gitignore，安全性足够。

---

## Google Sheets 结构

Spreadsheet ID: `1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU`

| Sheet | 用途 | 读写 |
|-------|------|------|
| NutritionDB | 预置食物库 ~2,500 条 | 只读 |
| CustomFoods | 用户自定义食物 + Quick Add | 读写 |
| Meals | Meal 模板（Composed） | 读写 |
| DailyLog | 每日饮食记录 | 读写 |
| DailySummary | 每日汇总 | 读写 |
| Settings | 营养目标 + PIN hash + day_title | 读写 |
| Favourites | 收藏食物 ID | 读写 |
| Sheet5 | 营养参考（只读）| 只读 |

### DailyLog 列结构（确认）

```
DATE | MEAL_TYPE | FOOD_NO | NAME | AMOUNT | UNIT |
CALORIES | PROTEIN | CARBS | FAT | FIBRE | SODIUM | POTASSIUM | CREATED_DATETIME
```

- DATE 格式：`ddd,d/m/yy`（如 `Mon,23/3/26`）
- 无 MEAL_NO 列

### CustomFoods 列结构

```
NO | NAME | AMOUNT | UNIT | CALORIES | PROTEIN | CARBS | FAT | FIBRE | SODIUM | POTASSIUM | IS_QUICK_ADD | CREATED_DATETIME
```

- NO 从 50001 开始（避免与 NutritionDB 1-2500 冲突）
- IS_QUICK_ADD: TRUE/FALSE

### Meals 列结构（B8，0-based）

```
DATE(0) | MEAL_NO(1) | NAME(2) | FOOD(3) | AMOUNT(4) | UNIT(5) |
CALORIES(6) | PROTEIN(7) | CARBS(8) | FAT(9) | FIBRE(10) | CREATED_DATETIME(11)
```

- DATE 列 repurposed 为 CREATED_DATE
- MEAL_NO 格式：`meal001`、`meal002`…

### NutritionDB 列结构

- 所有食物均为 per 100g 标准数据（AMOUNT=100, UNIT=g）
- 部分特殊食物有真实 AMOUNT/UNIT（如 `1 sausage`，`1 pita`）
- GAS `parseAmount()` 处理文本格式数字（带前缀单引号）

---

## 前端模块结构

```
src/
  main.js     — 路由、tab 切换、nav-bar date picker、sidebar、预加载、startIdleWatcher
  api.js      — JSONP 请求（含 B6/B8/B9 端点）
  auth.js     — PIN 输入、processing 状态、5分钟自动登出
  store.js    — 全局内存状态（含 meals/history 缓存）
  log.js      — Today log CRUD + 所有交互
  search.js   — Food search、Favourites、Quick Add sheet
  settings.js — 目标设置
  meals.js    — B8 Meal Templates CRUD
  history.js  — B9 History（读 DailySummary）
  ui.js       — toast
  utils.js    — 日期格式化、calcCalories、sha256
styles/
  tokens.css  — CSS 变量（含 --font-title: Montserrat, --font-body: Open Sans）
  main.css    — 所有样式
gas/
  Code.gs     — GAS 路由（含所有端点）
  config.gs   — Sheet 名称、列索引（含 meals 列）
docs/
  NutriLog_Changelog_v1.3.docx
  NutriLog_TechArchitecture_v1.6.docx
  NutriLog_OperationsRunbook_v4.0.docx
  NutriLog_PRD_v0.4.docx
  NutriLog_ProjectPlan_v1.1.docx
  NutriLog_DevStandards_v1.1.docx
  NutriLog_UI_Screens_v1.3.docx
```

---

## GAS API 端点（完整列表）

| Action | 状态 | 说明 |
|--------|------|------|
| verifyPin | ✅ | PIN 验证，返回 token |
| getSettings | ✅ | 返回所有 settings key-value |
| updateSettings | ✅ | 更新 settings，不覆盖 pin_hash |
| searchFoods | ✅ | NutritionDB + CustomFoods，timeout 30s |
| getFavourites | ✅ | 返回收藏 food NO 数组 |
| toggleFavourite | ✅ | 添加/删除收藏 |
| getDailyLog | ✅ | 返回指定日期的 log entries |
| addLogEntry | ✅ | 追加 DailyLog 行 |
| deleteLogEntry | ✅ | 删除 DailyLog 行；IS_QUICK_ADD=TRUE 时联动删 CustomFoods + Favourites |
| updateLogEntry | ✅ | 更新 amount + 等比例缩放营养 |
| syncDailySummary | ✅ | 写 DailySummary，timeout 40s |
| addQuickAdd | ✅ B6 | 写 CustomFoods (IS_QUICK_ADD=TRUE) + DailyLog；calories 直接存入 |
| getMeals | ✅ B8 | 返回所有 Meal 模板行 |
| saveMeal | ✅ B8 | 创建新 Meal，自动生成 mealNo |
| deleteMeal | ✅ B8 | 删除指定 mealNo 的所有行（从下往上删避免行移位） |
| getHistory | ✅ B9 | 返回 DailySummary 所有行（跳过前2行 header），timeout 30s |

---

## 关键业务规则

### 热量公式
```js
calories = Math.round(fat * 9 + carbs * 4 + protein * 4)
// 永远不读 CALS 列
// 例外：Quick Add 的 calories 直接存用户输入值，不用公式
```

### Quick Add 规则
- Name 必填
- Calories 必填，必须 > 0
- 所有数值字段：最大 3000，最多 1 位小数，必须为正数
- GAS 存入用户填写的 calories，不重新计算
- 删除该 log entry → 联动删 CustomFoods + Favourites（若已收藏）
- 添加后立刻 push 进 `store.state.foods`，Favourites 页面可立即找到

### 自动登出
- 任意 mousemove / mousedown / keydown / touchstart / scroll / click 重置计时器
- 5 分钟无操作 → 自动 logout + toast 提示
- `startIdleWatcher()` 在登录成功后调用
- `stopIdleWatcher()` 在 logout 时调用

### 日期格式
- 内部：`ddd,d/m/yy`（`Mon,23/3/26`）
- HTML date input：`YYYY-MM-DD`
- 显示（nav-bar pill Mac）：`Today · Mon, 23 Mar` 或 `Mon, 23 Mar`
- 显示（iPhone，在 title 和 search 之间居中）：同 Mac 格式
- 转换：`main.js` 的 `internalToISO()` / `ISOToInternal()` / `formatPillDisplay()`

### Entry Row 布局（确认）
```
[食物名称]
[kcal P C F Fi macros]          [Xunit badge] [★] [✕]
```
- 右侧三个按钮顺序：amount badge → star → delete
- Delete 按钮：灰色（`#6B6B65`），不变红

### iPhone Today 页面结构（确认）
```
[可编辑 Montserrat 标题（大写、斜体、加粗）]
[居中日期标签 — 可点击弹出 date picker（inset:0 覆盖整行）]
[Search bar + ⚡ Quick Add 按钮]
[Macro strip — 5 chips: 🔥💪🌾🥑🌿]
[Meal sections]
[Save Summary button]
```

### Mac Today 页面结构
```
[左：可编辑标题 | 中：日期导航 ‹ Today › | 右：Search pill]
  └─ dropdown: 食物结果 + ⚡ Quick Add footer（独立区块，分隔线）
[Meal sections]
```

### Macro Strip
- 5个 chip：🔥 Calories / 💪 Protein / 🌾 Carbs / 🥑 Fat / 🌿 Fibre
- 显示格式：`actual / target`，超 110% 橙色，超 120% 红色

### Remaining Today
- 允许负数（显示红色）
- 不再强制 `Math.max(0, ...)`

### setPageBusy（Bug fix Session 7）
- 使用 `position:fixed;inset:0` overlay div，append 到 body
- 不受 `renderLog` DOM 重建影响
- amount edit 和 Save Summary 期间都会触发
- `_amountEditActive` 全局标志防止多个 entry 同时编辑

### amount 更新（Bug fix）
- `updateLogEntry` 完成后直接更新 `store.state.dailyLog[date]` 里的那条 entry
- **不要** 在 in-memory 更新后调用 `invalidateLogCache`（会传 undefined 给 renderLog）
- 只调用 `renderLog`，不重新 fetch

### Meals（B8）
- 只实现 Composed Meal（Manual Meal 暂不做）
- 创建 modal：输入名称 + 搜索添加食物 + 实时总营养预览
- 添加到 log：选 meal type → 每个食物写一行 DailyLog
- 缓存：`store.state.meals`，创建/删除后设 `null` 强制刷新

### History（B9）
- 读 DailySummary sheet（skipRows=2 跳过 header）
- 按日期倒序排列
- 每张卡片：日期、🔥💪🌾🥑 emoji 营养值、进度条、状态 badge
- 缓存：`store.state.history`，tab 切换不重复 fetch

### Save Summary 超时
- GAS 冷启动可能慢，`syncDailySummary` JSONP 超时改为 40 秒
- 按钮在处理中显示 "Saving…" 并 disabled，overlay 锁全页

### iOS 搜索键盘工具栏
- 底部 sheet 搜索框用 `type="text" inputmode="search"`

### iPhone 日期 Date Picker
- `log-mobile-date-row` 下放 `input[type=date]`，`inset:0; opacity:0`，铺满整行
- iOS Safari 对可见尺寸的 input 会正常触发 picker

### Mac Date Picker
- `<button id="nav-date-btn">` + `<input type="date">` 覆盖
- 点击按钮调 `input.showPicker()` 或 `input.click()`（Safari 兼容）

---

## 字体系统（Session 7 更新）

| Token | 字体 | 用途 |
|-------|------|------|
| `--font-sans` | DM Sans 400/500 | 所有正文、UI 文字 |
| `--font-serif` | DM Serif Display italic | 仅 Today 页面可编辑标题 |
| `--font-title` | Montserrat 700 | 所有页面主标题（uppercase）|
| `--font-body` | Open Sans 400/500 | 副标题、说明文字（备用）|

主标题范围：Meals、History、Settings、Favourites 的页面标题

---

## UI 设计规范

### 设备
- **iPhone 13 Pro**：390pt，底部 Tab Bar（Today / Favourites / Meals / History / Settings）
- **MacBook Pro**：双列（左 ~61%，右 Summary ~39%），顶部导航，max-width 1100px

### 颜色
| Token | 值 |
|-------|-----|
| 背景页面 | `#F2EFE9` |
| 主色 Accent | `#697A58` |
| 主色深 | `#4E5C40` |
| 进度条临界（>110%） | `#B7711A` |
| 进度条超标（>120%） | `#C0392B` |

### Meal Section 颜色
| 餐次 | Header 背景 | emoji |
|------|------------|-------|
| Breakfast | `#FFF8ED` / `#EDD9A3` | ☀️ |
| Lunch | `#EDF4ED` / `#A8CCA8` | 🌿 |
| Dinner | `#EEE9F6` / `#C0AEE0` | 🌙 |
| Snacks | `#F6ECF0` / `#DDB8C8` | 🍓 |
| Other | `#F0F0EE` / `#C8C8C4` | 📦 |

---

## 开发规范摘要

- 函数上限：100 行
- CONFIG 对象：所有易变参数在 `config.js`
- console.log 前缀：`[module] action → result`
- try-catch：所有 API 调用必须包裹
- JSONP 参数：读操作 extraParams（URL），写操作 payload（JSON）
- 不要覆盖 `pin_hash`
- 不要自动修改 DailySummary（只在用户点 Save Summary 时写入）
- cache 版本：`index.html` 里 `src/main.js?v=N` 每次主要变更递增
- Meals/History 页面有 store 缓存，创建/删除后设 `store.state.meals/history = null` 强制刷新

---

## 不要做的事

- ❌ 不要修改 NutritionDB sheet 数据
- ❌ 不要用 CALS 列计算热量（Quick Add 例外：直接存用户输入值）
- ❌ 不要添加构建工具
- ❌ 不要用 fetch()（必须 JSONP）
- ❌ 不要覆盖 pin_hash
- ❌ 不要在 meal header/entry 行用 emoji 营养图标（只在 Summary 和 macro strip）
- ❌ 不要在 main.css 里追加多个重复 @media(768) 块
- ❌ 不要在 store in-memory 更新后调用 `invalidateLogCache`（会导致 renderLog 收到 undefined）

---

## 链接

- **Google Spreadsheet**: https://docs.google.com/spreadsheets/d/1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU
- **GitHub Repo**: https://github.com/Ciciai-Z/nutrilog
- **Live URL**: https://ciciai-z.github.io/nutrilog/
- **本地路径**: `/Users/cici/工作台/AI/nutrilog/`
