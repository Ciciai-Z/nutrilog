# NutriLog — Project Context for Claude

> 这个文件是给 Claude 读的。每次新对话开始时，请先阅读此文件，再开始工作。
> Last updated: March 2026 · Session 5 · B5 完成并已部署，每日可用 · Bug 修复持续进行

---

## 项目简介

NutriLog 是一个**个人单用户营养记录 Web 应用**，用于快速记录每日饮食、查看营养汇总、对比目标值。数据存储在 Google Sheets，前端托管在 GitHub Pages，跨设备访问（iPhone 13 Pro + MacBook Pro）。

**核心原则：零成本、无需服务器、无需构建工具、可长期维护迭代。**

---

## 当前项目状态

**阶段：B5 ✅ 完成并可日常使用 — Session 5 Bug 修复中**

### Session 5 修复内容（已部署或待部署）

| 修复项 | 文件 | 状态 |
|--------|------|------|
| GAS token 验证放宽（多设备不再 Unauthorized） | gas/Code.gs | ✅ 已部署 |
| Mac/iPhone 删除后 summary 实时更新 | src/log.js | ✅ 已部署 |
| iPhone macro strip 显示 actual/target 格式 | src/log.js | ✅ 已部署 |
| Entry 行加 ★ 收藏 + ❌ 删除按钮 | src/log.js | 待部署 |
| 去掉重复日期行，改为右上角 date picker | src/log.js | 待部署 |
| 食物预加载（切换 tab 不重新 loading） | src/main.js | ✅ 已部署 |
| Mac layout 居中（max-width 1100px） | styles/main.css | ✅ 已部署 |
| iOS 兼容（font-size 16px, safe-area） | styles/main.css | ✅ 已部署 |
| 长按移动 meal type（iPhone）+ drag（Mac） | src/log.js | ✅ 已部署 |

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
| 后端 | Google Apps Script | Code.gs + config.gs |
| 数据库 | Google Sheets (8 sheets) | 见下方 Sheet 结构 |
| 托管 | GitHub Pages | git push 即部署 |
| 认证 | SHA-256 PIN + sessionStorage token | 无 OAuth |
| CORS | JSONP 方案 | 动态 script 标签 |

**重要：** GAS `verifyToken` 已改为"非空即有效"，解决多设备 session token 冲突问题。

---

## Google Sheets 结构

Spreadsheet ID: `1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU`

| Sheet 名 | 用途 | 读写 |
|---------|------|------|
| `NutritionDB` | 预置食物库 ~2,500 条 | 只读 |
| `CustomFoods` | 用户自定义食物 | 读写 |
| `Meals` | Meal 模板 | 读写 |
| `DailyLog` | 每日饮食记录 | 读写 |
| `DailySummary` | 每日汇总（人工可读） | 读写 |
| `Settings` | 营养目标 + PIN hash + day_title | 读写 |
| `Favourites` | 收藏的食物 ID | 读写 |
| `Sheet5` | 营养素参考标准 | 只读 |

### DailyLog 列结构（已确认）

```
DATE | MEAL_TYPE | FOOD_NO | NAME | AMOUNT | UNIT |
CALORIES | PROTEIN | CARBS | FAT | FIBRE | SODIUM | POTASSIUM | CREATED_DATETIME
```

- DATE 格式：`ddd,d/m/yy`（如 `Mon,23/3/26`）
- MEAL_TYPE 枚举：`Breakfast` | `Lunch` | `Dinner` | `Snacks` | `Other`

---

## 前端模块结构

```
nutrilog/
  index.html          ← src/main.js?v=6（版本号每次缓存变更时递增）
  config.js           ← gitignored，含 scriptUrl
  src/
    main.js           ← 路由，tab guard，preload，sidebar
    api.js            ← JSONP 请求唯一出口
    auth.js           ← PIN + sessionStorage token
    store.js          ← 全局状态缓存
    log.js            ← Today log：CRUD，date picker，star/delete，move
    search.js         ← 食物搜索 + Favourites 页面
    settings.js       ← 营养目标编辑
    ui.js             ← toast, modal
    utils.js          ← 纯函数（日期、热量公式、数字精度）
  styles/
    tokens.css        ← CSS 变量
    main.css          ← 所有组件样式（完整重写，无重复 @media 块）
  gas/
    Code.gs           ← Apps Script（verifyToken 已放宽）
    config.gs         ← Sheet 名称、列索引常量
```

---

## 关键业务规则

### 热量计算公式
```javascript
CALORIES = Math.round(fat * 9 + carbs * 4 + protein * 4)
// NutritionDB 的 CALS 列永远不用于计算
```

### Token 验证规则（Session 5 更新）
- GAS `verifyToken` 改为：**非空 token 即视为有效**
- 原因：多设备登录会覆盖 Settings Sheet 的 session_token，导致另一台设备 Unauthorized
- 安全性：scriptUrl 在 config.js 中（gitignored），足够保护单用户应用

### 日期格式
- 统一使用 `ddd,d/m/yy`（如 `Mon,23/3/26`）
- 所有操作使用同一时区，不做时区转换
- `<input type="date">` 用 YYYY-MM-DD，内部转换在 log.js 的 `dateToInputValue` / `inputValueToDate`

### UI 日期规则（Session 5 更新）
- iPhone Today 页：**顶右角 date picker button**（显示 "Mon 23 Mar"，点击弹出系统日历）
- **不显示** 额外的日期导航箭头行（去掉 log-date-nav div）
- Mac Today 页：header 里 ‹ Mon,23/3/26 › 箭头导航，保持不变
- **只能选择今天或过去的日期**（`max` 属性 = today）

### Entry 行按钮布局（Session 5 更新）
右侧两个按钮：
- ★ **star 按钮** — 切换收藏状态，立即同步到 Favourites Sheet
- ❌ **delete 按钮** — 删除该行，立即更新 macro strip + sidebar summary

### Macro strip 显示格式（Session 5 更新）
- 格式：`920 / 1590kcal`（actual / target）
- 颜色：>110% target → amber，>120% → red
- iPhone macro strip 的 `iphone-macro-chip__val` font-size 缩小到 9px 以显示 actual/target

---

## UI 设计规范

### 设备

- **iPhone 13 Pro**：390pt，单列，底部 Tab Bar（Today / Favourites / Meals / History / Settings）
- **MacBook Pro**：双列布局（左 ~61%，右侧 Summary ~39%），顶部导航，max-width 1100px 居中

### 设计语言

| Token | 值 |
|-------|-----|
| 背景页面 | `#F2EFE9` |
| 背景卡片 | `#FFFFFF` |
| 主色 Accent | `#697A58` |
| 主色深 | `#4E5C40` |
| 主色淡 | `#EDF0E8` |
| 文字主 | `#1C1C1A` |
| 文字次 | `#6B6B65` |
| 文字提示 | `#A8A8A2` |
| 边框 | `#E4E0D8` |
| 进度条临界（>110%） | `#B7711A` |
| 进度条超标（>120%） | `#C0392B` |
| 圆角卡片 | 14px |

### Meal Section 颜色

| 餐次 | Header 背景 | Header 底边框 | Icon 背景 | emoji |
|------|------------|--------------|----------|-------|
| Breakfast | `#FFF8ED` | `#EDD9A3` | `#FDECC8` | ☀️ |
| Lunch | `#EDF4ED` | `#A8CCA8` | `#C8E6C8` | 🌿 |
| Dinner | `#EEE9F6` | `#C0AEE0` | `#D8CFF0` | 🌙 |
| Snacks | `#F6ECF0` | `#DDB8C8` | `#EEC8D8` | 🍓 |
| Other | `#F0F0EE` | `#C8C8C4` | `#E8E8E4` | 📦 |

---

## 开发规范摘要

- **函数硬性上限：100 行**，首选 < 30 行
- **CONFIG 对象**：所有易变参数集中在 `config.js`
- **console.log 前缀**：`[module] action → result`
- **try-catch**：所有 API 调用必须包裹
- **缓存版本**：index.html 里 `src/main.js?v=N` 每次重大变更递增

### JSONP 参数传递规则

| 参数类型 | 传递方式 | GAS 读取方式 |
|---------|---------|------------|
| 读操作附加参数（q, date 等） | URL 参数（extraParams） | `params.q` |
| 写操作数据 | `payload=` JSON 序列化 | `JSON.parse(params.payload).key` |
| token | 直接 URL 参数 | `params.token` |

---

## 功能块进度

| Block | 名称 | 状态 | 完成日期 |
|-------|------|------|---------|
| B0 | Infrastructure setup | ✅ | 2026-03-22 |
| B1 | Auth + skeleton | ✅ | 2026-03-22 |
| B2 | Food Search | ✅ | 2026-03-23 |
| B3 | Settings | ✅ | 2026-03-23 |
| B4 | Today Log 展示 | ✅ | 2026-03-23 |
| B5 | Log entry CRUD | ✅ | 2026-03-23 ⭐ 可日常使用 |
| Session 5 | Bug 修复 + UI 优化 | 🔄 进行中 | 2026-03-23 |
| B6 | Quick Add | ⬜ | — |
| B7 | Custom Foods + Favourites | ⬜ | — |
| B8 | Meal templates | ⬜ | — |
| B9 | Polish + remaining features | ⬜ | — |

### Session 5 已修复问题清单

1. ✅ **多设备 Unauthorized** — GAS verifyToken 改为非空即有效
2. ✅ **首次加载慢 5 秒** — onLogin 后台预加载 foods + favourites
3. ✅ **Mac 删除后 summary 不更新** — handleDelete 立即更新 store + renderSidebarSummary
4. ✅ **iPhone 切回 Today 重 loading** — navigateTo 加 mobile tab guard
5. ✅ **Mac layout 偏左** — main.css 完整重写，app-shell + max-width 居中
6. ✅ **Settings 切回 Today 无响应** — macShellRendered 重置逻辑修复
7. ✅ **日期 pill 格式丑** — formatPillDate 改为 "Mon 23 Mar"
8. 🔄 **iPhone macro strip 不更新** — handleDelete 直接更新 store 再 renderMacroStrip
9. 🔄 **Entry 行无删除/收藏按钮** — 加 ★ + ❌ 按钮
10. 🔄 **重复日期行** — 去掉 log-date-nav div，改为 date picker button
11. 🔄 **Macro 显示无 target** — 改为 actual / target 格式

---

## 下一步行动

1. **部署 Session 5 剩余修复**（log.js + patch2.css）
2. **B6 Quick Add** — 快速录入餐厅/估算餐
3. **B7 Custom Foods** — 自定义食物 CRUD

---

## 给 Claude 的代码生成检查清单

- [ ] 函数是否 ≤ 100 行？
- [ ] 配置值是否在 CONFIG 中？
- [ ] 是否有 `[module] action` 格式的 console.log？
- [ ] 异步函数是否有 try-catch？
- [ ] 热量是否用公式（不读 CALS 列）？
- [ ] 日期是否用 `ddd,d/m/yy` 格式？
- [ ] API 请求是否使用 JSONP？
- [ ] 读操作参数是否用 extraParams？
- [ ] `main.css?v=N` 是否需要递增？
- [ ] 删除后是否立即更新 store 再更新 UI？

---

## 不要做的事

- ❌ 不要修改 NutritionDB sheet 的数据
- ❌ 不要使用 CALS 列计算热量
- ❌ 不要添加构建工具（Vite/React/Webpack）
- ❌ 不要在 API 请求中使用 fetch()（必须用 JSONP）
- ❌ 不要覆盖 Settings 的 pin_hash key
- ❌ 不要把读操作参数放进 payload
- ❌ 不要使用 font-weight 600 或 700
- ❌ 不要在 main.css 里追加多个 @media(768) 块（会冲突）

---

- **Google Spreadsheet**：https://docs.google.com/spreadsheets/d/1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU
- **GitHub Repo**：https://github.com/Ciciai-Z/nutrilog
- **Live URL**：https://ciciai-z.github.io/nutrilog/
- **本地项目路径**：`/Users/cici/工作台/AI/nutrilog/`
