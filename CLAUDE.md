# NutriLog — Project Context for Claude

> 这个文件是给 Claude 读的。每次新对话开始时，请先阅读此文件，再开始工作。
> Last updated: March 2026 · Session 3 · B2 完成 — B3 ready to begin

---

## 项目简介

NutriLog 是一个**个人单用户营养记录 Web 应用**，用于快速记录每日饮食、查看营养汇总、对比目标值。数据存储在 Google Sheets，前端托管在 GitHub Pages，跨设备访问（iPhone 13 Pro + MacBook Pro）。

**核心原则：零成本、无需服务器、无需构建工具、可长期维护迭代。**

---

## 当前项目状态

**阶段：B2 完成 — 开始 B3 Settings**

### 开发方式（已确认）

采用**最小功能块垂直切片迭代**：每次完成一个独立可验证的 Block，提交 main，持续可用。**B5 完成后即可在 iPhone 上日常使用**，B6–B9 是在可用基础上的迭代。详见下方「功能块拆分与进度」章节。

### 已完成的文档（全部在项目 /docs 目录下，直接放文件）

| 文件名 | 版本 | 状态 |
|--------|------|------|
| `NutriLog_PRD_v0.3.docx` | v0.3 | ✅ Signed（2026-03-22） |
| `NutriLog_DevStandards_v1.1.docx` | v1.1 | Complete |
| `NutriLog_ProjectPlan_v1.0.docx` | v1.0 | Draft，待 Owner 签字 |
| `NutriLog_Prototype_v1.2.html` | v1.2 | Complete（交互式原型） |
| `NutriLog_UI_Screens_v1.2.docx` | v1.2 | Complete（静态截图文档） |
| `NutriLog_TechArchitecture_v1.2.docx` | v1.2 | ✅ Updated（B2 完成后更新） |
| `NutriLog_OperationsRunbook_v1.1.docx` | v1.1 | Complete |
| `NutriLog_Changelog_v1.0.docx` | v1.0 | ✅ Updated（B2 条目已追加） |
| `CLAUDE.md` | — | 持续维护 |

### 尚未生成的文档（开发阶段生成）

| Doc ID | 文档 | 生成时机 |
|--------|------|---------|
| DOC-05 | API Specification Document | B1 完成后 ← 可选，TechArch 已涵盖 |
| DOC-06 | Deployment Runbook | B9 完成后 |
| DOC-07 | Test Plan & UAT Sign-off | B9 完成后 |

---

## 技术架构（已确认）

```
iPhone/Mac Browser
      ↕ JSONP (<script> tag，绕过 CORS)
Google Apps Script Web App  ← 后端 API，免费托管
      ↕ Sheets API
Google Spreadsheet (8 sheets)  ← 数据库，存在 Google Drive
```

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | HTML + Vanilla JS (ES Modules, Scheme B) | 多文件，无构建工具 |
| 后端 | Google Apps Script | 单 Code.gs + config.gs |
| 数据库 | Google Sheets (8 sheets) | 见下方 Sheet 结构 |
| 托管 | GitHub Pages | git push 即部署 |
| 认证 | SHA-256 PIN + sessionStorage token | 无 OAuth |
| CORS | JSONP 方案 | 动态 script 标签，绕过 preflight |

**架构方案：Scheme B（多文件 ES Modules，已选定，不再讨论）**

**重要：Apps Script 不支持 CORS preflight，所有 API 请求统一使用 JSONP（callback 参数）。**

---

## Google Sheets 结构（已确认）

Spreadsheet ID: `1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU`

| Sheet 名 | 用途 | 读写 | 备注 |
|---------|------|------|------|
| `NutritionDB` | 预置食物库 ~2,500 条 | 只读 | 已有数据，勿修改 |
| `CustomFoods` | 用户自定义食物 | 读写 | 含 IS_QUICK_ADD 字段 |
| `Meals` | Meal 模板 | 读写 | Composed + Manual 两种 |
| `DailyLog` | 每日饮食记录 | 读写 | 一行一条 entry |
| `DailySummary` | 每日汇总（人工可读） | 读写 | 用户手动点 Sync 才写入 |
| `Settings` | 营养目标 + PIN hash | 读写 | key-value 格式 |
| `Favourites` | 收藏的食物 ID | 读写 | NutritionDB food IDs |
| `Sheet5` | 营养素参考标准（EFSA/USDA/AUS） | 只读 | 参考资料，不接入应用 |

### NutritionDB 列结构（已确认，row 2 = 列名行）

```
NO. | FOOD | AMOUNT | UNIT | CALS | ALCOHOL | CAFFEINE | WATER |
VIT B1..VIT K | Ca..Zn | CARBS(AI/35) | FIBRE(AJ/36) | STARCH | SUGARS(AL/38) |
ADDED SUGARS | NET CARBS(AN/40) | FAT(AO/41) | CHOLESTEROL | ...OMEGA-6 |
CYSTINE..VALINE | PROTEIN(BD/56) | SUBCATEGORY(BI/61) | CATEGORY(BJ/62)
POTASSIUM(AE/31) | SODIUM(AG/33)
```

**重要：CALS 列不用于计算，永远用公式 `ROUND(fat×9 + carbs×4 + protein×4)`**

### CustomFoods 列结构（已确认，2026-03-23）

```
NO. | NAME | AMOUNT | UNIT | CALORIES | PROTEIN | CARBS | FAT | FIBRE | SODIUM | POTASSIUM | IS_QUICK_ADD | CREATED_DATETIME
A      B      C       D       E          F        G      H     I       J        K             L              M
```

注：原有 DATE 列已删除，CREATED_DATETIME 保留在 M 列。

### DailyLog 列结构（已确认）

```
DATE | MEAL_TYPE | FOOD_NO | MEAL_NO | NAME | AMOUNT | UNIT |
CALORIES | PROTEIN | CARBS | FAT | FIBRE | SODIUM | POTASSIUM | CREATED_DATETIME
```

- DATE 格式：`ddd,d/m/yy`（如 `Wed,4/3/26` = 4日3月2026）
- MEAL_TYPE 枚举：`Breakfast` | `Lunch` | `Dinner` | `Snacks` | `Other`
- FOOD_NO：FK → NutritionDB.NO.（1–2500）或 CustomFoods.NO.（50001+）
- MEAL_NO：FK → Meals.MEAL_NO.（如 `meal001`）

---

## 前端模块结构（已确认，Scheme B）

```
nutrilog/
  index.html          ← 入口，加载 src/main.js
  config.example.js   ← 模板（committed）
  config.js           ← 实际配置含 Apps Script URL（gitignored，但已 force push）
  src/
    main.js           ← 路由初始化（B2 更新：async navigateTo，接入 initSearch）
    api.js            ← 所有 JSONP 请求，唯一 HTTP 出口（B2 更新：新增 B2 端点，extraParams 支持）
    auth.js           ← PIN + sessionToken
    store.js          ← 全局状态缓存（B2 更新：新增 foods/favourites，完整 token 方法）
    log.js            ← Today's Log 视图
    search.js         ← 食物搜索 + Quick Add（B2 新增）
    meals.js          ← Meal 模板 CRUD
    library.js        ← Custom Foods + Favourites
    history.js        ← 历史日志
    settings.js       ← 目标设置 + PIN 修改
    ui.js             ← 共享 UI 组件（toast, modal, progress bar）
    utils.js          ← 纯函数（日期格式化、热量公式、数字精度）
  styles/
    tokens.css        ← CSS 变量（颜色、圆角、字体）
    main.css          ← 所有组件样式（B2 更新：追加搜索 + bottom sheet 样式）
  gas/
    Code.gs           ← Apps Script 路由（B2 更新：新增 3 个端点，修复 verifyPin payload 读取）
    config.gs         ← Sheet 名称、列索引常量（B2 更新：新增 CustomFoods/NutritionDB 完整列索引）
  docs/               ← 所有项目文档
  .gitignore
  README.md
```

---

## CONFIG 对象结构（已确认）

```javascript
// config.js (force pushed to GitHub)
export const CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/YOUR_ID/exec',
  sheets: {
    nutritionDb: 'NutritionDB', customFoods: 'CustomFoods',
    meals: 'Meals', dailyLog: 'DailyLog', dailySummary: 'DailySummary',
    settings: 'Settings', favourites: 'Favourites',
  },
  targets: { warningThreshold: 1.10, dangerThreshold: 1.20 },
  search: { minChars: 1, maxResults: 50, debounceMs: 200 },
  labels: {
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'],
    syncButton: 'Sync to DailySummary',
    addFood: '+ Add food',
    quickAdd: 'Quick Add',
  },
};
```

---

## Apps Script API 端点（已确认，20个）

**重要：所有请求使用 JSONP GET 方式。读操作参数直接附加在 URL（extraParams），写操作 body 通过 payload= URL 参数传递。**

| action | 实现状态 | 说明 |
|--------|---------|------|
| `verifyPin` | ✅ B1 | 验证 PIN，从 payload 读取 hash，返回 session token |
| `getSettings` | ✅ B1 | 返回目标值和配置 |
| `updateSettings` | ✅ B1 | 保存营养目标，不覆盖 pin_hash |
| `searchFoods?q=` | ✅ B2 | 搜索 NutritionDB + CustomFoods，q 作为 URL 参数 |
| `getFavourites` | ✅ B2 | 返回收藏的 food IDs |
| `toggleFavourite` | ✅ B2 | 添加或删除收藏，foodNo 从 payload 读取 |
| `getDailyLog?date=` | ⬜ B4 | 返回指定日期的日志 |
| `addLogEntry` | ⬜ B5 | 新增日志条目 |
| `updateLogEntry` | ⬜ B5 | 修改 AMOUNT 并重算营养值 |
| `moveLogEntry` | ⬜ B5 | 修改 MEAL_TYPE |
| `deleteLogEntry` | ⬜ B5 | 删除日志；IS_QUICK_ADD=TRUE 时联动删 CustomFoods |
| `copyYesterdayMeal` | ⬜ B5 | 复制昨天同一餐次到目标日期 |
| `syncDailySummary` | ⬜ B5 | 用户点 Sync 后写入 DailySummary |
| `addQuickAdd` | ⬜ B6 | Quick Add（同时写 CustomFoods + DailyLog） |
| `getCustomFoods` | ⬜ B7 | 返回所有自定义食物 |
| `saveCustomFood` | ⬜ B7 | 创建或更新自定义食物；编辑时设 IS_QUICK_ADD=FALSE |
| `deleteCustomFood` | ⬜ B7 | 删除自定义食物 |
| `getMeals` | ⬜ B8 | 返回所有 Meal 模板及成分 |
| `saveMeal` | ⬜ B8 | 创建或更新 Meal 模板；同步更新历史 log 的营养值 |
| `deleteMeal` | ⬜ B8 | 删除 Meal 模板 |

**响应格式统一：** `{ ok: true, data: <payload> }` 或 `{ ok: false, error: "<message>" }`

### B2 重要实现细节（已确认）

- **NutritionDB 全量加载**：session 开始时调用 `searchFoods('')` 一次性加载所有食物到 `store.state.foods`，之后全部客户端过滤，不再发请求
- **searchFoods 的 `q` 参数**：直接作为 URL 参数传（不走 payload），GAS 用 `params.q` 读取
- **toggleFavourite 的 `foodNo`**：走 payload 传（写操作），GAS 用 `JSON.parse(params.payload).foodNo` 读取
- **verifyPin 的 `hash`**：走 payload 传，GAS 用 `JSON.parse(params.payload).hash || .pinHash` 读取
- **Token 存储**：Settings Sheet 的 `session_token` 行（非 PropertiesService）
- **空查询行为**：输入框为空时只显示已收藏的食物；有输入时按 substring 过滤全库

---

## 关键业务规则（已确认，勿更改）

### 热量计算公式

```javascript
// utils.js 中唯一实现，所有地方调用这个函数
export function calcCalories(protein, carbs, fat) {
  return Math.round(fat * 9 + carbs * 4 + protein * 4);
}
// NutritionDB 的 CALS 列永远不用于计算，只作参考
```

### Quick Add 流程

1. 用户输入 Custom Food Name（可选）+ 营养数值
2. 写入 CustomFoods，`IS_QUICK_ADD = TRUE`
3. 立即写入 DailyLog
4. 删除该 DailyLog 条目时 → 联动删除 CustomFoods 记录
5. 若用户在 Food Library 中手动编辑过该食物 → `IS_QUICK_ADD = FALSE` → 删 log 不再联动删食物

### DailySummary 写入时机

- **仅在用户手动点击「Sync」按钮时写入**，不自动触发
- 如果该日期已有行 → 覆盖；没有 → 追加到底部

### Meal 编辑规则

- 编辑 Meal 模板后，**所有历史 DailyLog 中引用该 Meal 的条目同步更新营养值**
- Meal 允许同名（重复名称合法）

### 日期格式

- 统一使用 `ddd,M/d/yy`（如 `Wed,4/3/26`）
- 所有操作使用同一时区，不做时区转换
- 日期格式化/解析只在 `utils.js` 的 `formatDate()` 和 `parseDate()` 中处理

### 数字精度

- 界面显示：营养值保留 1 位小数（`toFixed(1)`），热量显示整数（`Math.round`）
- 存储/计算：保留完整精度

### ID 规则

- NutritionDB: NO. 从 1 开始
- CustomFoods: NO. 从 **50001** 开始（避免与 NutritionDB 冲突）

### PIN 安全

- 前端：SHA-256 哈希后发送，原始 PIN 永远不离开浏览器
- 存储：Settings Sheet 的 `pin_hash` 行存储哈希值（64位hex字符串）
- Token：Settings Sheet 的 `session_token` 行；sessionStorage 存储，关闭 Tab 自动失效
- **注意：`updateSettings` 永远不得覆盖 `pin_hash` key**

---

## UI 设计规范（已确认）

### 设备

- **iPhone 13 Pro**：390pt，单列，底部 Tab Bar（Today / Search / Meals / History / Settings）
- **MacBook Pro**：双列布局（左侧日志 ~65%，右侧 Summary 面板 ~35%），顶部导航

### 设计语言

| Token | 值 |
|-------|-----|
| 背景页面 | `#F2EFE9`（暖米白） |
| 背景卡片 | `#FFFFFF` |
| 主色 Accent | `#697A58`（olive 绿） |
| 主色深 | `#4E5C40` |
| 主色淡 | `#EDF0E8` |
| 文字主 | `#1C1C1A` |
| 文字次 | `#6B6B65` |
| 边框 | `#E4E0D8` |
| 进度条正常 | olive 绿 |
| 进度条临界（>110%） | `#B7711A`（amber） |
| 进度条超标（>120%） | `#C0392B`（red） |
| 圆角卡片 | 14px |
| 圆角按钮 | 20px（pill） |
| 字体 | DM Sans（正文） + DM Serif Display（标题） |

### 交互规则（已确认）

| 交互 | 行为 |
|------|------|
| 点击 Amount 徽章 | 内联编辑，无弹窗 |
| 左滑条目（iPhone） | 出现红色 Delete 按钮 |
| 长按+拖拽 | 拖拽移动到其他 Meal Section（无弹窗） |
| 点击 ⎘ 图标 | 复制昨天同一餐次的所有条目 |
| 点击 Sync 按钮 | 写入 DailySummary（手动触发） |
| 搜索输入 | 200ms debounce 动态显示结果，关键词 olive 绿高亮 |
| 空搜索框 | 只显示已收藏食物 |
| 点击搜索结果（iPhone） | 弹出 Amount + Meal Type 选择 Sheet |
| Mac 搜索结果 | 每行内含 Meal Type 下拉 + Add 按钮 |
| 点击 Meal 模板 | 弹出 Meal Type 选择（5选项含 Other） |
| PIN 输入 | 4位，SHA-256 哈希，sessionStorage 存 token |

---

## 开发规范摘要（详见 DevStandards v1.1）

- **函数硬性上限：100 行**，首选 < 30 行
- **CONFIG 对象**：所有易变参数集中在 `config.js`
- **语义化 ID**：`food-search-input` 而非 `input1`
- **console.log 前缀**：`[module] action → result`（如 `[api] addLogEntry → ...`）
- **try-catch**：所有 API 调用必须包裹，错误不能静默吞掉
- **CSS**：所有颜色用 CSS 变量，BEM 命名，mobile-first
- **Git**：`feature/<n>` 分支，`feat/fix/refactor/style/docs/chore` 前缀 commit
- **部署**：`git push` → GitHub Pages 自动服务，无需构建步骤

### JSONP 参数传递规则（B2 确认）

| 参数类型 | 传递方式 | GAS 读取方式 |
|---------|---------|------------|
| 读操作附加参数（q, date 等） | 直接 URL 参数（extraParams） | `params.q` |
| 写操作数据（foodNo, settings 等） | `payload=` JSON 序列化 | `JSON.parse(params.payload).key` |
| token | 直接 URL 参数 | `params.token` |
| callback | 直接 URL 参数 | `params.callback` |

---

## 项目文档清单（完整）

所有文档存放在 GitHub 仓库的 `/docs` 目录下。

```
docs/
  NutriLog_PRD_v0.3.docx                  ← 已签字锁定
  NutriLog_DevStandards_v1.1.docx          ← 完整
  NutriLog_ProjectPlan_v1.0.docx           ← Draft 待签字
  NutriLog_UI_Screens_v1.2.docx            ← 完整
  NutriLog_Prototype_v1.2.html             ← 完整
  NutriLog_TechArchitecture_v1.2.docx      ← B2 更新
  NutriLog_OperationsRunbook_v1.1.docx     ← 完整
  NutriLog_Changelog_v1.0.docx             ← B2 条目已追加
  CLAUDE.md                                ← 本文件，持续维护
```

---

## 下一步行动

**B4 完成 ✅ — 立即开始 B5 Log entry CRUD**

1. **B5（现在）** — Log 完整增删改，搜索结果真正写入 DailyLog，**完成后即可日常使用**
2. **B6 → B9** — 在可用基础上持续迭代

---

## 给 Claude 的工作提示

### 生成代码时的检查清单

在生成任何代码前，先确认：
- [ ] 函数是否 ≤ 100 行？
- [ ] 配置值是否在 CONFIG 中而不是硬编码？
- [ ] ID 命名是否语义化？
- [ ] 是否有 `[module] action` 格式的 console.log？
- [ ] 异步函数是否有 try-catch？
- [ ] 热量是否用公式计算而非读 CALS 列？
- [ ] 日期是否用 `ddd,M/d/yy` 格式？
- [ ] API 请求是否使用 JSONP（jsonpFetch）而非 fetch()？
- [ ] 读操作参数是否用 extraParams（不走 payload）？
- [ ] 写操作参数是否从 `JSON.parse(params.payload)` 读取？

### 每个 Block 完成后自动更新

每次 Block 验收通过后，**自动**更新以下内容（无需用户提醒）：
1. **CLAUDE.md** — 进度表、状态、已知细节
2. **Changelog docx** — 追加本次 Block 的变更条目
3. **TechArchitecture docx** — 如有架构/接口变更则更新

### 生成文档时的提示

- 所有文档使用 `docx-js` 生成 `.docx`
- 文档编号延续现有序列
- 每份文档必须包含版本号、日期、状态（DRAFT/COMPLETE）

### 不要做的事

- ❌ 不要修改 NutritionDB sheet 的数据
- ❌ 不要修改 DailySummary sheet（只能通过 Sync 按钮写入）
- ❌ 不要使用 CALS 列计算热量
- ❌ 不要添加 Vite、React、Webpack 等构建工具
- ❌ 不要把业务逻辑写进 HTML 内联脚本
- ❌ 不要在 API 请求中使用 fetch()（必须用 JSONP）
- ❌ 不要覆盖 Settings 的 pin_hash key
- ❌ 不要把读操作参数放进 payload（应用 extraParams 直接追加到 URL）

---

## 功能块拆分与进度

**开发策略：端到端垂直切片。每个 Block 独立可验证，完成即提交 main。**

### 进度总览

| Block | 名称 | 状态 | 完成日期 | 备注 |
|-------|------|------|---------|------|
| B0 | Infrastructure setup | ✅ 已完成 | 2026-03-22 | |
| B1 | Auth + skeleton | ✅ 已完成 | 2026-03-22 | |
| B2 | Food Search | ✅ 已完成 | 2026-03-23 | |
| B3 | Settings | ✅ 已完成 | 2026-03-23 | |
| B4 | Today Log 展示 | ✅ 已完成 | 2026-03-23 | |
| B5 | Log entry CRUD | 🔄 进行中 | — | ⭐ 完成后即可日常使用 |
| B6 | Quick Add | ⬜ 未开始 | — | |
| B7 | Custom Foods + Favourites | ⬜ 未开始 | — | |
| B8 | Meal templates | ⬜ 未开始 | — | |
| B9 | Polish + remaining features | ⬜ 未开始 | — | |

状态标记：⬜ 未开始 · 🔄 进行中 · ✅ 已完成

---

### B0 · Infrastructure setup（✅ 已完成，2026-03-22）

**验收通过：**
- [x] GitHub Pages 地址可访问：https://ciciai-z.github.io/nutrilog/
- [x] Apps Script 项目已创建，config.gs 已部署
- [x] DOC-04 Data Schema 已确认（合并入 TechArch v1.1）
- [x] 8 个 Sheet 结构就绪，Settings 初始数据填入

---

### B1 · Auth + skeleton（✅ 已完成，2026-03-22）

**验收通过：**
- [x] iPhone/Mac Safari 显示 PIN 界面
- [x] 输入正确 PIN（1234）→ 进入 Today 页面
- [x] 输入错误 PIN → 显示错误提示，重置
- [x] 底部/顶部 Tab Bar 5 个按钮可点击切换
- [x] 关闭 Tab 重新打开 → 再次要求 PIN
- [x] Settings 页显示营养目标数值（从 Google Sheets 读取）

---

### B2 · Food Search（✅ 已完成，2026-03-23）

**验收通过：**
- [x] 切换到 Search tab → 发起 searchFoods 请求加载食物库
- [x] 输入 "chicken" → 显示结果，收藏项在最前
- [x] 关键词以 olive 绿高亮显示
- [x] ★ 收藏后刷新页面 → 仍然显示收藏状态（已持久化到 Sheets）
- [x] Favourites sheet 出现对应 food NO.
- [x] 点击食物行 → 底部 sheet 滑出，含 Amount + Meal Type
- [x] 无 console.error

**B2 期间修复的 Bug：**
- verifyPin 从 payload 读取 hash（原代码直接读 params.hash）
- searchFoods 的 q 参数改为 extraParams 直接附加到 URL
- toggleFavourite 的 foodNo 从 payload 读取
- store.js 补全 clearToken() 方法

---

### B3 · Settings（✅ 已完成，2026-03-23）

**验收通过：**
- [x] 修改 Calories 目标 → 保存 → 刷新页面 → 仍显示修改后的值
- [x] Settings sheet 对应行更新
- [x] 只显示 5 个字段（Calories / Protein / Carbs / Fat / Fibre），无 Sodium/Potassium

**B3 期间修复的 Bug：**
- updateSettings GAS 端从 `payload` 顶层迭代改为从 `payload.settings` 读取
- Settings sheet 第 11 行脏数据（`settings | {calorie_target=2200.0}`）已手动清除
- Fibre max 从 100 放宽到 200

---

### B4 · Today Log 展示（✅ 已完成，2026-03-23）

**验收通过：**
- [x] 打开 Today 页显示 DailyLog 中现有数据
- [x] 左右箭头切换日期 → 内容更新
- [x] Macro 汇总进度条（Calories/Protein/Carbs/Fat/Fibre）
- [x] 进度条颜色随目标值正确显示（正常/amber/red）
- [x] 每条 entry 显示 P/C/F 宏量 + Na/K 矿物质
- [x] 无数据日期显示空状态

**B4 期间修复/确认的问题：**
- 日期格式确认为 `ddd,d/m/yy`（日/月/年），更新 `utils.js` 的 `formatDate` 和 `parseDate`
- DailyLog sheet 无 MEAL_NO 列，修正 `config.gs` 列索引（去掉 mealNo，NAME 从 D 列索引 3 开始）
- getDailyLog 增加日期格式兼容（normalise 去除逗号后空格）
- Na/K 在 entry row 显示（`entry-row__minerals`）

---

### B5 · Log entry CRUD（🔄 进行中）⭐

---

### B5 · Log entry CRUD（⬜ 未开始）⭐

**依赖：** B2 + B4

**目标：** 完整的增删改查。完成后可在 iPhone 上日常使用记录饮食。

**包含文件：**
```
gas/Code.gs          ← 新增 addLogEntry, updateLogEntry, deleteLogEntry, copyYesterdayMeal, syncDailySummary
src/log.js           ← 增删改交互（左滑删除, inline edit, copy yesterday, 拖拽移动）
src/search.js        ← 补全：搜索结果点击后真正写入 DailyLog
```

**验收（对应 DevStandards T-03 到 T-08）：**
- [ ] 搜索 → 选择 → 填写 150g → 选 Lunch → DailyLog 出现新行
- [ ] 点击 amount 徽章 → 改数量 → 营养值实时更新
- [ ] 左滑条目 → Delete → 条目消失，Sheets 行删除
- [ ] 点击 ⎘ 图标 → 昨天同餐次的条目出现在今天
- [ ] 点击 Sync 按钮 → DailySummary 出现今日汇总行

---

### B6 · Quick Add（⬜ 未开始）

**依赖：** B5

**目标：** 外食/估算场景，直接输入营养数值快速记录。

**验收：**
- [ ] Quick Add 写入 CustomFoods（IS_QUICK_ADD=TRUE）+ DailyLog
- [ ] 删除该 log 行 → CustomFoods 对应行也消失
- [ ] 编辑过该食物 → IS_QUICK_ADD=FALSE → 删 log 不联动

---

### B7 · Custom Foods + Favourites（⬜ 未开始）

**依赖：** B5

**目标：** Food Library 页面完整可用。

**验收：**
- [ ] Food Library 显示所有 Custom Foods
- [ ] 新增/编辑/删除自定义食物正常
- [ ] NutritionDB 食物可被收藏，收藏后搜索结果置顶

---

### B8 · Meal templates（⬜ 未开始）

**依赖：** B5 + B7

**目标：** Meal 模板完整 CRUD，可快速添加 Meal 到日志。

**验收：**
- [ ] 创建 Composed Meal → Meals sheet 出现对应行
- [ ] 创建 Manual Meal → Meals sheet 出现 1 行
- [ ] 点击 Meal → 选 Meal Type → DailyLog 出现新行
- [ ] 编辑 Meal → 历史 DailyLog 引用该 Meal 的行营养值更新

---

### B9 · Polish + remaining features（⬜ 未开始）

**依赖：** 所有前序 Block

**目标：** 补全所有剩余功能，双端验证，达到 UAT 标准。

**验收（DevStandards 全部 11 项测试通过）：**
- [ ] T-01 至 T-11 全部通过
- [ ] Mac 双列布局正确
- [ ] iPhone 13 Pro Safari 无需缩放，所有操作 ≤ 3 次点击
- [ ] 生成 DOC-06 Deployment Runbook
- [ ] 生成 DOC-07 Test Plan & UAT Sign-off
- [ ] Owner 最终确认：app 添加到 iPhone 主屏幕，正常使用

---

### 给 Claude 的 Block 工作流程

每次开始一个新 Block，按此顺序：

1. **确认前序 Block 验收通过**（逐条检查，有未通过项先修复）
2. **更新 CLAUDE.md 进度表**（前序 Block 标记 ✅，当前 Block 标记 🔄）
3. **生成代码**（GAS 端点先，前端模块后）
4. **生成测试检查清单**（具体到每个步骤和预期结果）
5. **等待 Owner 测试反馈 → 修复 → 再验收**
6. **完成后自动更新 CLAUDE.md + Changelog docx + TechArchitecture docx（如有变更）**

---

- **Google Spreadsheet**：https://docs.google.com/spreadsheets/d/1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU
- **GitHub Repo**：https://github.com/Ciciai-Z/nutrilog
- **Live URL**：https://ciciai-z.github.io/nutrilog/
- **Apps Script URL**：存入 config.js（已 force push 到 GitHub）
- **本地项目路径**：`/Users/cici/工作台/AI/nutrilog/`

---

## 本地目录结构

```
/Users/cici/工作台/AI/nutrilog/
  CLAUDE.md                                ← 本文件，在根目录
  config.js
  config.example.js
  index.html
  .gitignore
  README.md
  docs/                                    ← 所有文档直接放这里，无子目录
    HistoricalDocs/                        ← 旧版文档归档，不参与日常维护
    NutriLog_PRD_v0.3.docx
    NutriLog_DevStandards_v1.1.docx
    NutriLog_ProjectPlan_v1.0.docx
    NutriLog_UI_Screens_v1.2.docx
    NutriLog_TechArchitecture_v1.2.docx
    NutriLog_OperationsRunbook_v1.2.docx
    NutriLog_Changelog_v1.0.docx
  gas/
    Code.gs
    config.gs
  styles/
    tokens.css
    main.css
  src/
    main.js
    api.js
    auth.js
    store.js
    search.js
    log.js
    meals.js
    library.js
    history.js
    settings.js
    ui.js
    utils.js
```

**注意：docs/ 下直接放文件，无子目录（HistoricalDocs 除外，用于归档旧版本）。**
