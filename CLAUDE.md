# NutriLog — Project Context for Claude

> 这个文件是给 Claude 读的。每次新对话开始时，请先阅读此文件，再开始工作。
> Last updated: 2026-03-24 · Session 6 · B5 稳定运行，持续 Polish

---

## 项目简介

NutriLog 是一个**个人单用户营养记录 Web 应用**。数据存储在 Google Sheets，前端托管在 GitHub Pages，跨设备访问（iPhone 13 Pro + MacBook Pro）。

**核心原则：零成本、无需服务器、无需构建工具、可长期维护迭代。**

---

## 当前项目状态

**阶段：B5 ✅ 稳定使用 · Session 6 UI/UX Polish 完成 · B6 Quick Add 待实现**

### Block 进度

| Block | 名称 | 状态 |
|-------|------|------|
| B0–B5 | 基础设施 → Log CRUD | ✅ 完成 |
| Session 5/6 | UI Polish | ✅ 完成（大量修复）|
| B6 | Quick Add | ⬜ 下一步 |
| B7 | Custom Foods CRUD | ⬜ |
| B8 | Meal Templates | ⬜ |
| B9 | History + final Polish | ⬜ |

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
| CustomFoods | 用户自定义食物 | 读写 |
| Meals | Meal 模板 | 读写 |
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

### NutritionDB 列结构

- 所有食物均为 per 100g 标准数据（AMOUNT=100, UNIT=g）
- 部分特殊食物有真实 AMOUNT/UNIT（如 `1 sausage`，`1 pita`）
- GAS `parseAmount()` 处理文本格式数字（带前缀单引号）

---

## 前端模块结构

```
src/
  main.js     — 路由、tab 切换、nav-bar date picker（JS click）、sidebar、预加载
  api.js      — JSONP 请求（syncDailySummary 超时 40s，searchFoods 超时 30s）
  auth.js     — PIN 输入、processing 状态（Verifying…动画）、token 管理
  store.js    — 全局内存状态
  log.js      — Today log CRUD + 所有交互
  search.js   — Food search、Favourites 页面、add sheet
  settings.js — 目标设置
  ui.js       — toast
  utils.js    — 日期格式化、calcCalories、sha256
styles/
  tokens.css  — CSS 变量
  main.css    — 所有样式（含多次 patch 追加）
gas/
  Code.gs     — GAS 路由（含 parseAmount/parseUnit helper）
  config.gs   — Sheet 名称、列索引
```

---

## 关键业务规则

### 热量公式
```js
calories = Math.round(fat * 9 + carbs * 4 + protein * 4)
// 永远不读 CALS 列
```

### 日期格式
- 内部：`ddd,d/m/yy`（`Mon,23/3/26`）
- HTML date input：`YYYY-MM-DD`
- 显示（nav-bar pill Mac）：`Today · Mon, 23 Mar` 或 `Mon, 23 Mar`
- 显示（iPhone，在 title 和 search 之间居中）：同 Mac 格式
- 转换：`main.js` 的 `internalToISO()` / `ISOToInternal()` / `formatPillDisplay()`

### Entry Row 布局（Session 6 确认）
```
[食物名称]
[kcal P C F Fi macros]          [Xunit badge] [★] [✕]
```
- 右侧三个按钮顺序：amount badge → star → delete（均在 `.entry-row__right` flex 行内）
- Delete 按钮：灰色（`#6B6B65`），不变红，iPhone 更深更大

### iPhone Today 页面结构（Session 6 确认）
```
[可编辑 DM Serif 标题]
[居中日期标签 — 在 title 和 search 之间]
[Search bar]
[Macro strip — 5 chips: 🔥💪🌾🥑🌿]
[Meal sections]
[Save Summary button]
```

### Macro Strip（Session 6 确认）
- 5个 chip：🔥 🔥Calories / 💪 Protein / 🌾 Carbs / 🥑 Fat / 🌿 Fibre
- 显示格式：`actual / target`，超 110% 橙色，超 120% 红色

### Remaining Today
- 允许负数（显示红色）
- 不再强制 `Math.max(0, ...)`

### Save Summary 超时
- GAS 冷启动可能慢，`syncDailySummary` JSONP 超时改为 40 秒
- 按钮在处理中显示 "Saving…" 并 disabled

### PIN 登录 Processing 状态
- 输入4位 PIN 后显示 "Verifying…" 脉冲动画
- keypad 置灰，dot display 半透明

### iOS 搜索键盘工具栏
- 底部 sheet 搜索框改用 `type="text" inputmode="search"`
- 消除 iOS Safari 的 ‹ › ✓ 工具栏

### Add Food Processing 状态
- iPhone add sheet 点 "Add to Log" 后：按钮 "Adding…" disabled，Cancel 禁用
- Favourites expand panel 点 "+ Add" 后：按钮 "Adding…" disabled，input/select 禁用

### Touch Drag（iPhone）
- 长按 500ms 触发拖拽
- 触发后：body `user-select:none`，创建 clone，显示 drop targets
- touchmove: `passive:false` 阻止滚动
- 所有 touchend/touchcancel 调统一 `cleanup()`
- 按钮点击不触发拖拽（`if(e.target.closest('button'))return`）

### Mac Date Picker
- `<button id="nav-date-btn">` + `<input type="date">` 覆盖
- 点击按钮调 `input.showPicker()` 或 `input.click()`（Safari 兼容）
- 窗口 resize 时更新 pill 文字格式（Mac=全格式，iPhone=短格式）

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

### 字体
- DM Serif Display italic: 页面级标题
- DM Sans 400/500: 其余所有文字（禁用 600/700）
- 每个元素必须显式声明 font-family

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

---

## 不要做的事

- ❌ 不要修改 NutritionDB sheet 数据
- ❌ 不要用 CALS 列计算热量
- ❌ 不要添加构建工具
- ❌ 不要用 fetch()（必须 JSONP）
- ❌ 不要覆盖 pin_hash
- ❌ 不要在 meal header/entry 行用 emoji 营养图标（只在 Summary 和 macro strip）
- ❌ 不要用 font-weight 600/700
- ❌ 不要在 main.css 里追加多个重复 @media(768) 块

---

## B6 Quick Add — 待实现

### 目标
外食/估算场景：用户直接输入营养数值（不需要搜索食物数据库），快速记录。

### 行为规范（来自 PRD v0.3）
1. 用户输入：食物名称（可选）+ 已知营养值（calories, protein, carbs, fat, fibre）
2. 写入 CustomFoods（`IS_QUICK_ADD = TRUE`）+ 同时写入 DailyLog
3. 删除 DailyLog 条目 → 联动删除对应 CustomFoods 行
4. 若用户在 Food Library 手动编辑过该食物 → `IS_QUICK_ADD = FALSE` → 删除 log 不再联动

### UI 位置
- iPhone：Today 页面 search bar 旁边或底部，或单独 "Quick Add" 按钮
- Mac：search pill dropdown 里加 "Quick Add" 选项

### GAS 端点（待实现）
```
addQuickAdd  ← 同时写 CustomFoods (IS_QUICK_ADD=TRUE) + DailyLog
```
删除逻辑修改：
```
deleteLogEntry 需判断 IS_QUICK_ADD → 联动删 CustomFoods
```

### 验收
- [ ] Quick Add 表单写入 CustomFoods + DailyLog
- [ ] 删除该 log 行 → CustomFoods 对应行消失
- [ ] 编辑后 IS_QUICK_ADD=FALSE → 删 log 不联动

---

## 链接

- **Google Spreadsheet**: https://docs.google.com/spreadsheets/d/1_dmh0QWC68VUxts1iiyi-6VXdekWKB3TuNDROlmY_QU
- **GitHub Repo**: https://github.com/Ciciai-Z/nutrilog
- **Live URL**: https://ciciai-z.github.io/nutrilog/
- **本地路径**: `/Users/cici/工作台/AI/nutrilog/`
