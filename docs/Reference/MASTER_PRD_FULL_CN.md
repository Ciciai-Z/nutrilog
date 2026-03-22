# Nutrition Tracker —— 产品需求文档（完整版，重建方案 B）

**版本：** 1.0  
**日期：** 2026-03-20  
**状态：** 待用户确认草案  
**决策基础：** 采用重建的新项目方案（Option B），以当前已验证成功的产品行为为参考，而不是继续沿用旧的单文件实现架构。

---

## 1. 文档目的

本 PRD 用于定义 Nutrition Tracker 下一版本的**目标产品**。

它将替代此前分散的若干文档，成为以下内容的主要依据：
- 产品范围
- 功能需求
- 云端同步需求
- UI 语言方向
- 部署与集成边界

本 PRD 的写法遵循以下原则：
1. 吸收当前 Web 版和迁移计划中已验证的需求；
2. 反映最新的产品决策；
3. 为**新的实现项目**服务，而不是为了保留旧架构。

**重要原则：** `REQUIREMENTS_TRACEABILITY_CN.md` 中列出的需求，都必须在本 PRD 中有对应体现。

---

## 2. 产品概述

Nutrition Tracker 是一个**单用户营养记录产品**，用于快速记录每日饮食、查看营养汇总、对比目标值，并支持跨设备访问。

产品目前已经有一个可运行的本地 Web 原型，也已经具备了部分 Google Sheets 同步能力。但旧版本实现方式是一个高度耦合的单一 HTML 文件，UI、状态、存储和同步逻辑全部混在一起。因此，下一版本将以**新的可维护 Web 项目**形式实现，在保留有价值产品行为的前提下，放弃旧架构。

目标体验是：
- 以 Web 为主
- 兼容手机端使用
- 全英文 UI
- 使用 Google Sheets 作为共享云端数据存储
- 使用 Google Apps Script 作为轻量 API 层
- 同一个托管 Web 应用可在 Mac 和 iPhone 上使用

---

## 3. 产品愿景与目标

### 3.1 核心产品目标
1. 让用户能够以尽可能低的阻力完成每日营养记录。
2. 使用统一热量公式，保证营养总量计算一致且准确。
3. 实时对比每日摄入与目标值。
4. 通过 favorites、saved meals、copy yesterday、quick add 等能力提升重复记录效率。
5. 让同一份数据可以在 laptop 和 phone 上访问。
6. 将指定的每日汇总数据同步到 `DailySummary` 和现有 `Biofeedback` sheet。
7. 保持方案足够轻量，适合个人单用户使用。
8. 相较于旧的单文件实现，显著降低后续维护成本。

### 3.2 体验目标
- **快速：** 高频操作应尽量减少点击/输入次数。
- **清晰：** 用户能快速理解今日总量、目标和差距。
- **一致：** 不同设备刷新后看到的值应保持一致。
- **可复用：** 常用食物和常用 meal 组合应可以快速复用。
- **可维护：** 后续迭代应能按文件模块修改，而不是继续维护一个巨大的 HTML 文件。
- **足够安全：** 对于个人项目场景，不应把敏感 token 硬编码到源码或仓库里。

---

## 4. 当前现实与重建决策

### 4.1 当前现实
现有方案已经证明产品方向是成立的：
- 已存在本地 Web 版本；
- 核心每日记录流程已经实现；
- 已经可以将指定数据同步到指定 Google Sheet；
- 当前 UI 仍有中文内容；
- 当前代码实现方式是单一 HTML 文件。

### 4.2 重建决策
下一版本将以**新项目**形式实现，而不是继续沿用旧架构做增量修补。

### 4.3 选择重建的原因
之所以选择重建，是基于以下已确认事实：
- 旧代码耦合严重；
- 改动一个点会牵动很多地方；
- 英文化 UI 会涉及很多位置；
- 后续还要继续做云同步稳定化和移动端友好体验；
- 历史本地数据迁移不是强制要求；
- 不需要保留旧项目的每一条实现细节。

### 4.4 复用策略
新项目应复用：
- 已验证的产品流程；
- 已验证的功能范围；
- 合理的 Google Sheets 数据结构；
- 现有 Apps Script 同步逻辑的经验；

新项目**不需要**保留：
- 旧的单文件结构；
- 中文 UI 文案；
- 旧 localStorage schema；
- 历史本地数据迁移作为强制上线范围。

---

## 5. 目标用户

### 5.1 主要用户
单个个人用户，特点如下：
- 持续跟踪热量和营养；
- 希望记录流程简单、快速；
- 同时使用 Mac 和 iPhone；
- 能接受 Google Sheets / Apps Script / GitHub Pages 这种轻量方案；
- 不需要多用户协作。

### 5.2 用户特征
- 经常重复吃相似食物和 meal 组合；
- 有时需要估算外食；
- 偏好低维护成本工具；
- 更看重录入效率，而不是复杂分析。
- 使用频率每天不超过5次

---

## 6. 产品范围

### 6.1 本次重建范围内
- 新的可维护 Web app
- 全英文 UI
- 基于 Google Sheets 的跨设备存储
- 按 meal section 记录每日营养
- 主营养数据库加载与缓存
- 自定义食物
- 模糊搜索
- Favorites
- Saved meals（My Meals）
- 复制昨天同一餐次
- Quick Add 宏营养估算记录
- 每日总量与目标对比
- 目标值编辑
- 同步到 `DailySummary`
- 同步到现有 `Biofeedback`
- 使用 `config.txt` + 本地设置 override 的配置方式
- 带 token 的 Apps Script API
- GitHub Pages 部署
- 移动端友好的响应式使用
- 云端临时数据 90 天自动清理

### 6.2 可选 / 加分项
- 已保存的 Favorites, Saved meals, Quick Add 宏营养，自定义食物，都需要存到GoogleSheet, 解决清除 localStorage 后数据丢失情况
- 
### 6.3 暂不纳入范围
- 当前版本内的原生 iOS / Android App
- 多用户账号
- 复杂认证系统（超出简单个人 token 模式）
- 离线优先 / service worker 模式
- 条码扫描
- 图片识别
- 高级健康分析看板
- 除 Google Sheets + Google Apps Script 外的其他后端
- 自动化 Apps Script 部署
- 强制迁移所有历史本地浏览器数据
- 完全逐像素还原现有 JSX 设计稿
- 已保存 meals 的再次编辑
- 更好的搜索体验
- 更好的移动端交互优化
- 更漂亮的图表和汇总
- 可选的旧本地数据手动迁移辅助

---

## 7. 产品原则

1. **单用户优先**
2. **先保证快速记录，再扩展功能广度**
3. **云端数据 + 轻量前端**
4. **英文是维护中的标准语言**
5. **热量计算规则必须全局统一**
6. **重建是为了可维护性，而不是为了换技术而换技术**
7. **如果旧文档与最新确认需求冲突，以最新确认需求为准**

---

## 8. 关键用户故事

| ID | 用户故事 | 验收意图 |
|---|---|---|
| U1 | 作为用户，我希望在 iPhone 上新增一条记录后，在 Mac 上刷新也能看到。 | 跨设备日志一致。 |
| U2 | 作为用户，我希望在一个设备上新增 custom food 后，另一个设备也能搜索到。 | 自定义食物跨设备同步。 |
| U3 | 作为用户，我希望完成初始设置后，搜索功能不需要反复手动上传数据库。 | 打开页面后即可搜索。 |
| U4 | 作为用户，我希望能快速复用常用食物和 meal 组合。 | Favorites 和 saved meals 减少重复操作。 |
| U5 | 作为用户，我希望在不方便搜索数据库时，也能快速估算并记录外食。 | Quick Add 生效。 |
| U6 | 作为用户，我希望点击同步按钮后，能把指定日期的数据同时写到两个 summary sheet。 | 同时更新 `DailySummary` 和 `Biofeedback`。 |
| U7 | 作为用户，我希望在不改源码的情况下，更新配置。 | `config.txt` 和本地设置能控制 URL / ID。 |
| U8 | 作为用户，我希望系统自动清理旧的临时记录。 | 90 天清理规则生效。 |
| U9 | 作为用户，我希望维护中的产品全部使用英文界面。 | UI 和同步出的标签使用英文。 |
| U10 | 作为用户，我希望新项目结构清晰，后续维护成本更低。 | 用模块化代码替代单文件原型。 |

---

## 9. 功能需求

### FR-1 主营养数据库

#### 描述
系统必须支持一个主营养数据库，用于搜索、营养计算和创建记录。

#### 需求
- 应支持以 `Nutrition Database.csv` 为原始来源的主食物数据库。
- 在云端版本中，规范数据源应为 Google Sheets 的 `NutritionDB` tab。
- 应在本地缓存营养数据库，以便后续快速搜索。
- 应提供手动刷新动作，重新加载缓存数据库。
- 完成 setup / migration 后，搜索功能不应依赖反复手动上传。

#### 数据说明
- 旧数据库列映射和已有数据结构应视为重建时的实现参考。

---

### FR-2 统一热量公式

#### 描述
热量必须根据三大宏营养统一计算，而不是直接信任原始数据库里的 calorie 字段。

#### 公式
`calories = round(fat × 9 + carbs × 4 + protein × 4)`

#### 需求
此公式必须适用于：
- add-item preview
- 最终创建 item
- inline amount editing
- saved meal totals
- search result preview
- favorite display
- Quick Add preview and creation
- daily totals
- 云同步 payload 中凡是由 entry 推导 calories 的位置

---

### FR-3 按餐次记录每日营养

#### 描述
每条营养记录必须归属于选定日期下的某个 meal section。

#### 餐次分类
- Breakfast
- Snack
- Lunch
- Dinner
- Other

#### 需求
- 用户必须能把一条 item 加到指定 meal section。
- 每条 log entry 必须包含所需营养值和显示时间。
- 系统必须计算并展示每个 meal 的 subtotal。
- 系统必须按日期存储和读取数据。
- 当日期切换时，必须刷新该日期的 logs 和 totals。
- 所有 sync 动作必须使用当前 selected date，而不是硬编码 today。

---

### FR-4 餐次区块快捷操作

#### 描述
每个 meal section 都应有快捷操作，减少重复工作。

#### 必需动作
- Add into this meal section
- Copy yesterday’s same meal section
- Open Quick Add bound to this meal section

---

### FR-5 食物搜索

#### 描述
用户通过关键词搜索食物，并选择结果进行记录。

#### 需求
- 必须支持模糊关键词搜索。
- 搜索结果应支持键盘导航：上下箭头、Enter、Escape。
- `/` 键应全局聚焦到 search box。
- 搜索结果应同时包含标准 foods 和 saved meals。
- 搜索结果中的 saved meals 应有视觉区分。
- Add flow 必须支持 amount 输入、meal 选择和确认前的营养 preview。
- 当搜索无结果时，UI 应提供 Add New Food 路径。

---

### FR-6 Favorites

#### 描述
系统必须支持用于高频单个食物的 favorites。

#### 需求
- 从 search result 中可以执行 favorite 动作。
- 从 logged entry 中也可以执行 favorite 动作。
- 产品必须提供 Favorites tab。
- Favorite 卡片应支持 quick add。
- Favorite 卡片应支持 remove favorite。
- Favorites 作用于单个 food，而不是整份 saved meal。

---

### FR-7 Saved Meals（My Meals）

#### 描述
系统必须支持可复用的、由多个食物组成的命名 meal template。

#### 需求
- 产品必须提供专门的 `My Meals` / Saved Meals 区域。
- 用户必须能够通过 builder 流程创建 saved meal。
- Builder 必须允许搜索并添加多个 foods。
- 用户必须能为 meal 命名。
- Builder 必须实时显示营养总量。
- Saved meal 必须能直接加到任意 meal section。
- Saved meal 必须可从全局 search 搜到。
- Saved meal 必须可删除。
- 编辑 saved meal 内 food 数量时，totals 必须实时更新。
- 实现上应避免数量编辑时的 disruptive re-render 或 focus loss。
- 创建后的完整再编辑能力是 desirable，但如需控制交付复杂度，可视为 optional。

---

### FR-8 复制昨天同一餐次

#### 描述
用户可将昨天同一 meal section 的内容复制到当前选定日期。

#### 需求
- Copy 必须按 meal section 执行，而不是复制整天。
- 复制后的 items 必须立即出现在当前日期 log 中。
- 营养值必须保持一致，并保持统一热量规则。
- 如果昨天该餐次没有条目，应给出清晰提示。
- 如果今天该餐次已有条目，系统可询问 append 确认。

---

### FR-9 Quick Add

#### 描述
Quick Add 用于在不方便搜索数据库时做估算记录。

#### 输入字段
- Protein
- Carbs
- Fat
- Fibre（根据较新的 PRD，属于必填输入的一部分）
- 可选的 calorie override 可在实现时决定是否保留旧本地行为参考

#### 需求
- Calories 必须按统一热量公式实时自动计算。
- Quick Add 必须绑定到目标 meal section。
- Quick Add 必须同时创建：
  - 一条 log entry
  - 一条可复用 custom food 记录
- 生成命名规则必须遵循已有 meal/date/time convention，例如 `morning_09032026_121436`。
- 删除由 Quick Add 生成的 entry 时，也必须删除对应 linked custom food。

---

### FR-10 Custom Foods

#### 描述
系统必须支持用户自定义食物，用于数据库中缺失的食物以及 Quick Add 产物。

#### 需求
- 产品必须支持 custom food 字段：
  `name, amount, unit, cals, pro, cho, fat, fibre, na, k`
- 导入或新建的 custom food 必须立刻可搜索。
- 在云端版本中，custom foods 必须存储在 `CustomFoods` sheet tab。
- 新 custom food ID 应从旧 custom food 高位 ID 规则继续，或使用实现上安全的等价方案。
- 删除 Quick Add 生成的 custom food 时，应遵循 legacy linked deletion 行为。
- 在搜索无结果时必须有 Add New Food 路径。

---

### FR-11 Entry 编辑、删除与餐次移动

#### 描述
用户必须能在创建后维护已记录的 entries。

#### 需求
- 已记录 entry 的 amount 必须可编辑。
- 当 amount 改变时，营养值必须实时重算。
- 普通 entries 必须可以独立删除。
- Quick Add 生成的 entry 删除时，必须同时触发 linked custom food 删除。
- Drag/drop 或等价交互应支持将 entry 移动到另一个 meal section。该能力在当前 app 中已验证，因此应保留在重建范围内，除非实现阶段明确降级。

---

### FR-12 每日营养汇总

#### 描述
产品必须按选定日期汇总营养摄入。

#### 跟踪指标
1. Calories
2. Protein
3. Carbs
4. Fat
5. Fibre
6. Sodium
7. Potassium

#### 需求
- App 必须实时汇总选定日期的所有 entries。
- App 必须显示 consumed、target 和 gap。
- Progress bars 必须显示完成度。
- 视觉 warning 状态应区分 normal / approaching / exceeded。
- 至少 Calories、Protein、Carbs、Fat 这几张 summary cards 必须保留在主布局中可见。

---

### FR-13 每日目标值

#### 描述
产品必须支持可编辑的每日营养目标。

#### 默认目标
- Calories: 1593 kcal
- Protein: 138 g
- Carbs: 134 g
- Fat: 56 g
- Fibre: 40 g
- Sodium: 2784 mg
- Potassium: 4871 mg

#### 需求
- Targets 必须可编辑。
- 保存后的 targets 必须持久化。
- 比较逻辑必须使用最新保存值。
- 构建 `DailySummary` sync payload 时，必须能拿到目标值。
- 应支持 Restore Defaults 动作。

---

### FR-14 日期导航与历史查看

#### 描述
用户必须能按日期导航并查看历史记录。

#### 需求
- 提供 previous / next date 导航。
- 不允许选择未来日期。
- 日期选择应支持 date picker 或等价的直接选择方式。
- 切换 selected date 时必须重新加载该日期的 log 和 summary。

---

### FR-15 Google Sheets 云端存储

#### 描述
Google Sheets 是目标版本的共享后端。

#### 必需 tabs
- `DailyLog`
- `CustomFoods`
- `NutritionDB`
- `DailySummary`
- 原有 sheet 中现存的 `Biofeedback` tab

#### 需求
- 每日 logs 必须存储在云端 `DailyLog` tab。
- Custom foods 必须存储在 `CustomFoods`。
- Nutrition database 必须从 `NutritionDB` 读取。
- 每日 totals 必须同步到 `DailySummary`。
- 同步流程还必须通过单独 Apps Script endpoint 更新现有 `Biofeedback` tab。
- 在一个设备上的修改，另一个设备刷新后应可看到。

---

### FR-16 Apps Script API 要求

#### 描述
Google Apps Script 是静态前端和 Google Sheets 之间的 API 层。

#### Apps Script 1 Endpoints
系统必须支持与以下等价的 endpoints：
- `getLog`
- `addEntry`
- `deleteEntry`
- `getCustomFoods`
- `addCustomFood`
- `deleteCustomFood`
- `getNutritionDB`
- `syncDailySummary`
- `purgeOldData`

#### Apps Script 2 Endpoint
- `syncBiofeedback`

#### 需求
- 前端必须通过合适的 GET/POST 与这些 endpoints 交互。
- 重建后可以调整内部代码组织，但必须保留功能 API contract。

---

### FR-17 认证与安全

#### 描述
系统必须在保持简单的前提下，具备足够的个人使用防护。

#### 需求
- 认证 token 绝不能硬编码在 app source 或 repo 中。
- Token 必须存储在 Apps Script `PropertiesService` 中。
- Token 可以通过 app settings UI 输入并存储在本地设备上。
- Token 不能存储在 `config.txt` 中。
- 错误 token 请求必须返回 unauthorized failure。

---

### FR-18 配置管理

#### 描述
App 必须支持无需改代码的非敏感部署配置。

#### 需求
- 产品必须使用 repo root 下的 `config.txt` 文件存放非敏感配置。
- `config.txt` 必须包含非敏感项，如：
  - Apps Script 1 URL
  - Apps Script 2 URL
  - new sheet ID
  - biofeedback sheet ID
- 敏感 token 必须不在此文件中。
- 保存在 localStorage 中的 device-local settings 必须 override `config.txt`。
- Settings UI 必须以实用方式暴露这些字段。
- 更新配置不应要求修改源码。

---

### FR-19 同步到 Daily Summary 和 Biofeedback

#### 描述
用户必须能够把选定日期的 totals 写回 summary sheets。

#### 需求
- 用户触发的 sync action 必须把 selected-date totals 写入 `DailySummary`。
- 同一触发动作也必须把 selected-date totals 写入现有 `Biofeedback` tab。
- `Biofeedback` 的日期匹配必须保持此前验证过的比较行为。
- Sync 按钮必须清晰提示 success / failure。当前 prototype 已经具备该模式。

---

### FR-20 数据保留与清理

#### 描述
旧的临时云端记录应被自动清理。

#### 需求
- `DailyLog` 中超过 90 天的 rows 必须可清理。
- `CustomFoods` 中超过 90 天的 rows 必须可清理。
- `NutritionDB` 和长期 summary/history 数据应按定义长期保留。
- 清理应在 page load 时自动运行，或采用同等低摩擦方式。

---

### FR-21 UI 语言与内容标准

#### 描述
维护中的产品语言标准是英文。

#### 需求
- 所有可见 UI 文本必须是英文。
- 所有由 app 控制的 sheet-facing labels 和 synced content 必须用英文。
- Tabs、headers、buttons、toasts、modals、placeholders、messages、settings labels 都必须使用英文。
- 旧 app 中的中文 UI 仅视为 legacy content，不属于目标行为。当前 legacy HTML 中仍有中文，重建必须移除。

---

### FR-22 托管与部署

#### 描述
新的 Web app 必须作为静态站点托管。

#### 需求
- 通过 GitHub Pages 发布。
- 托管后的 app 必须可通过同一个 public URL 在 Mac 和 iPhone 上访问。
- 正常使用不应依赖本地服务器。
- 重建后可调整仓库结构，不必维持旧的单文件布局，只要部署仍然静态且简单。

---

### FR-23 Legacy 数据迁移策略

#### 描述
旧文档曾要求做本地数据迁移。最新决策将其从 mandatory 降级为 optional。

#### 需求
- 仍应支持将以下源文件导入 Google Sheets：
  - `Nutrition Database.csv` → `NutritionDB`
  - `CustomisedFood.csv` → `CustomFoods`
  - `DailyNutrition.xlsx` → `DailySummary`
- Legacy 浏览器 `nt_log_*` 迁移**可以**通过手动 in-app migration tool 支持，但不再是发布必需项。
- 重建计划不能因为 legacy local data migration 复杂而被阻塞。

---

### FR-24 Excel 导出与保存记录

#### 描述
已验证的当前 app 具备本地 export 和 save-record 行为。

#### 需求
- 重建版本应保留用户导出 daily nutrition records 到 Excel 的能力，除非后续产品决策明确删除。当前已验证 app 使用 `DailyNutrition.xlsx` 风格导出和 Save Record 动作。
- Save/export 可以用更简单、可维护的新实现方式完成，不必保留旧单文件 API。

---

### FR-25 Settings 与实用工具动作

#### 描述
产品必须提供一个实用的 settings 区域用于管理 app。

#### 必需区域
- target editing
- token input
- URL / Sheet ID overrides
- manual DB refresh / reload
- optional migration action（如果纳入）
- save/export related controls（如适用）

---

## 10. 信息架构

### 10.1 主要页面 / 区域
1. **Today / Log**
   - date navigation
   - search
   - meal sections
   - daily log entries
2. **Favorites**
3. **Saved Meals**
4. **Settings / Targets**
5. **Summary panel / dashboard area**

### 10.2 MVP 必需流程
- 打开 app 并查看 selected day
- search 并 add food
- quick add
- edit amount
- delete entry
- 从 favorites 添加
- 从 saved meals 添加
- copy yesterday’s meal section
- 修改 targets
- sync summary sheets
- 在 Mac 和 iPhone 上都能使用 app

---

## 11. 数据模型概览

### 11.1 核心实体
- NutritionDB food
- CustomFood
- LogEntry
- SavedMeal
- DailyTarget
- DailySummary sync payload

### 11.2 LogEntry 最小字段
- id
- foodId 或等价来源引用
- name
- amount
- unit
- meal
- time
- calories
- protein
- carbs
- fat
- fibre
- sodium
- potassium

### 11.3 模型偏好
为避免未来不一致，重建版应在 entries 中保存足够的 snapshot nutrition data，而不是完全依赖未来实时查表。

---

## 12. 非功能性需求

### 12.1 平台与兼容性
- 最新 iPhone Safari
- Mac Safari
- Mac Chrome

### 12.2 性能
- Daily log 读取目标应低于 3 秒，允许 Apps Script 冷启动影响。

### 12.3 部署
- 静态前端
- 不需要传统后端服务器
- 产品范围不要求 npm/build 复杂性，但如果内部构建工具能显著提升可维护性且不破坏部署简单性，则允许使用。既有文档总体偏向轻量 vanilla deployment。

### 12.4 安全
- 源码和仓库里不能有 secrets
- 使用 token 保护请求
- 对个人使用场景足够即可

### 12.5 语言
- 维护版本只使用英文。

### 12.6 网络
- 需要网络
- offline mode 不在当前范围内。

### 12.7 可维护性
- 重建版必须使用模块化代码组织，而不是单文件原型。
- 后续 AI 辅助开发应能够按文件逐步进行。

---

## 13. 验收标准

当满足以下条件时，可认为本版本重建产品可接受：

1. 同一个 hosted app URL 可在 Mac 和 iPhone 打开。
2. 在一个设备新增 food entry，另一个设备刷新后能看到。
3. 在一个设备新增 custom food，另一个设备刷新后可搜索到。
4. 完成 setup 后，search 不再依赖反复手动上传文件。
5. Favorites 可以新增、查看并复用。
6. Saved meals 可以创建、搜索并添加。
7. Quick Add 会创建一个可复用的 linked custom food。
8. Copy Yesterday 按 meal section 工作。
9. Calories 在所有位置都按统一公式推导。
10. App 中 daily totals 更新正确。
11. Sync 会把 selected date 的数据写入 `DailySummary` 和 `Biofeedback`。
12. 错误 token 请求会安全失败。
13. 旧的临时记录可在 90 天后清理。
14. UI 和 sheet-facing labels 全部是英文。
15. 代码库不再是单文件架构。

---

## 14. 需求冲突处理说明

### 14.1 Migration 冲突处理
旧 PRD 把本地历史迁移当作 required。  
**当前决策：** legacy browser log data 迁移是 optional，不是 release 必需项。

### 14.2 架构冲突处理
旧文档默认继续沿用单文件实现。  
**当前决策：** 产品需求保留，但实现方式重建为新的模块化项目。

### 14.3 App 冲突处理
更早的讨论提到未来 App。  
**当前决策：** 当前版本仍以 Web-first、mobile-friendly 为范围；原生 app 是后续阶段，不是当前 release requirement。

### 14.4 UI 设计冲突处理
现有 JSX 设计文件仅作为偏好参考，不是锁死规格。

---

## 15. 本 PRD 控制的交付物

本 PRD 管理：
- 重建后的功能范围
- 云同步行为
- English UI 要求
- 部署预期
- 验收标准

本 PRD 不单独定义：
- 具体实现任务拆分
- coding prompts
- 详细交付排期

这些应在后续实施计划文档中定义。
