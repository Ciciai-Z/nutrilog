# REQUIREMENTS_TRACEABILITY_CN.md

**规则：** 本文件中的每一条需求，都必须在 `Nutrition Tracker —— 产品需求文档（完整版，重建方案 B）` 中有对应体现。

## 状态说明
- **KEEP** = 在新 PRD 中作为有效需求保留
- **MODIFY** = 保留需求意图，但会按重建方案调整表述或范围
- **OPTIONAL** = 承认其为 legacy 需求，但不是当前 release 的强制要求
- **DROP** = 不纳入当前 PRD 范围

---

## A. 产品方向与范围

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-001 | 产品是单用户 nutrition tracker。 | 既有 PRD | KEEP | 2, 5 |
| R-002 | 产品应支持通过同一个 hosted Web app 在 Mac 和 iPhone 上访问。 | 既有 PRD | KEEP | 2, 3, 13 |
| R-003 | 不使用传统后端服务器；使用 static frontend + Google Sheets + Apps Script。 | 既有 PRD | KEEP | 2, 6, 12 |
| R-004 | 不做多用户账号。 | 既有 PRD | KEEP | 6 |
| R-005 | 当前版本不要求原生 App。 | 既有 PRD + 最新范围 | KEEP | 6, 14 |
| R-006 | Google Sheets 是目标版本的后端。 | 既有 PRD | KEEP | 2, 9 FR-15 |
| R-007 | 英文是维护中的标准语言。 | 既有 PRD + 最新方向 | KEEP | 6, 9 FR-21 |
| R-008 | 采用新建可维护项目，而不是继续沿用单文件 legacy 架构。 | 最新决策 | KEEP | 2, 4, 12, 13 |
| R-009 | 现有部分 sync 能力和已验证行为应作为参考，而不是实现约束。 | 最新决策 | KEEP | 2, 4 |

---

## B. 食物数据库与搜索

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-010 | 支持以 `Nutrition Database.csv` 为来源的主数据库。 | 既有 PRD | KEEP | 9 FR-1 |
| R-011 | 云端规范数据源为 `NutritionDB` sheet tab。 | 既有 PRD | KEEP | 9 FR-1, FR-15 |
| R-012 | 在本地缓存营养数据库供后续搜索使用。 | 既有 PRD | KEEP | 9 FR-1 |
| R-013 | 提供数据库缓存手动刷新/重载。 | 既有 PRD | KEEP | 9 FR-1, FR-25 |
| R-014 | 支持模糊关键词搜索。 | 既有 PRD | KEEP | 9 FR-5 |
| R-015 | 搜索结果支持键盘导航（上下、Enter、Escape）。 | 既有 PRD | KEEP | 9 FR-5 |
| R-016 | `/` 快捷键聚焦 search box。 | 既有 PRD | KEEP | 9 FR-5 |
| R-017 | 搜索结果同时包含 foods 和 saved meals。 | 既有 PRD | KEEP | 9 FR-5 |
| R-018 | Saved meals 在搜索结果中有视觉区分。 | 既有 PRD | KEEP | 9 FR-5 |
| R-019 | Add flow 包含 amount、meal 选择、营养 preview。 | 既有 PRD | KEEP | 9 FR-5 |
| R-020 | 搜索无结果时提供 Add New Food 路径。 | 既有 PRD | KEEP | 9 FR-5, FR-10 |

---

## C. 热量逻辑

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-021 | 不应把原始 calorie 字段当作最终可信来源。 | 既有 PRD | KEEP | 9 FR-2 |
| R-022 | 使用统一公式 `round(fat×9 + carbs×4 + protein×4)`。 | 既有 PRD | KEEP | 9 FR-2 |
| R-023 | 该公式适用于所有显示、编辑、创建、同步 calories 的位置。 | 既有 PRD | KEEP | 9 FR-2 |

---

## D. 按餐次记录

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-024 | 支持五个 meal sections：Breakfast、Snack、Lunch、Dinner、Other。 | 既有 PRD | KEEP | 9 FR-3 |
| R-025 | 每条 entry 必须归属于一个 meal section。 | 既有 PRD | KEEP | 9 FR-3 |
| R-026 | 显示每个 meal 的 subtotal。 | 既有 PRD | KEEP | 9 FR-3 |
| R-027 | 按日期存取 logs。 | 既有 PRD | KEEP | 9 FR-3, FR-14 |
| R-028 | 切换日期时刷新 log 和 summary。 | 既有 PRD | KEEP | 9 FR-3, FR-14 |
| R-029 | Sync 使用 selected date，而不是硬编码 today。 | 既有 PRD | KEEP | 9 FR-3 |
| R-030 | Meal header 提供 quick add / add / copy-yesterday 快捷动作。 | 既有 PRD | KEEP | 9 FR-4 |

---

## E. Favorites 与 Saved Meals

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-031 | Search result 中可执行 favorite。 | 既有 PRD | KEEP | 9 FR-6 |
| R-032 | Logged entry 中可执行 favorite。 | 既有 PRD | KEEP | 9 FR-6 |
| R-033 | 存在 Favorites tab。 | 既有 PRD | KEEP | 9 FR-6, 10 |
| R-034 | Favorite 卡片支持 quick add 和 remove。 | 既有 PRD | KEEP | 9 FR-6 |
| R-035 | Favorites 只作用于单个 food，不作用于整份 meal。 | 既有 PRD | KEEP | 9 FR-6 |
| R-036 | 提供 Saved Meals / My Meals 区域。 | 既有 PRD | KEEP | 9 FR-7, 10 |
| R-037 | Saved meal builder 支持添加多个 food。 | 既有 PRD | KEEP | 9 FR-7 |
| R-038 | Saved meal 可以命名。 | 既有 PRD | KEEP | 9 FR-7 |
| R-039 | Saved meal builder 实时显示 totals。 | 既有 PRD | KEEP | 9 FR-7 |
| R-040 | Saved meal 可以加入任意 meal section。 | 既有 PRD | KEEP | 9 FR-7 |
| R-041 | Saved meals 可被搜索。 | 既有 PRD | KEEP | 9 FR-7 |
| R-042 | Saved meals 可删除。 | 既有 PRD | KEEP | 9 FR-7 |
| R-043 | 编辑 saved meal 内 food 数量时，totals 实时更新。 | 既有 PRD | KEEP | 9 FR-7 |
| R-044 | Saved meal 编辑时应避免 disruptive re-render / focus loss。 | 既有 PRD | KEEP | 9 FR-7 |
| R-045 | Saved meals 创建后完整再编辑。 | legacy nice-to-have | OPTIONAL | 9 FR-7 |

---

## F. Copy Yesterday 与 Quick Add

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-046 | Copy Yesterday 按 meal section 工作，而不是整天。 | 既有 PRD | KEEP | 9 FR-8 |
| R-047 | 复制后 items 立即出现在当前日期 log 中。 | 既有 PRD | KEEP | 9 FR-8 |
| R-048 | 如果没有昨天数据，给出清晰提示。 | 既有 PRD | KEEP | 9 FR-8 |
| R-049 | Quick Add 支持手动输入宏营养估算外食。 | 既有 PRD | KEEP | 9 FR-9 |
| R-050 | Quick Add 实时自动计算 calories。 | 既有 PRD | KEEP | 9 FR-9 |
| R-051 | Quick Add 绑定到 meal section。 | 既有 PRD | KEEP | 9 FR-9 |
| R-052 | Quick Add 同时创建 log entry 和 reusable custom food。 | 既有 PRD | KEEP | 9 FR-9 |
| R-053 | Quick Add naming 遵循 meal/date/time convention。 | 既有 PRD | KEEP | 9 FR-9 |
| R-054 | 删除 Quick Add 生成 entry 时，同时删除 linked custom food。 | 既有 PRD | KEEP | 9 FR-9, FR-10, FR-11 |
| R-055 | Fibre 是较新 PRD 中 Quick Add 输入的一部分。 | 新 PRD | KEEP | 9 FR-9 |
| R-056 | Quick Add 中保留手动 calorie override。 | legacy 当前 app 行为参考 | MODIFY | 9 FR-9 |

---

## G. Custom Foods 与 Entry 维护

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-057 | 支持字段为 name, amount, unit, cals, pro, cho, fat, fibre, na, k 的 custom foods。 | 既有 PRD | KEEP | 9 FR-10 |
| R-058 | Custom foods 导入/创建后应立即可搜索。 | 既有 PRD | KEEP | 9 FR-10 |
| R-059 | 云端版本将 custom foods 存储在 `CustomFoods`。 | 既有 PRD | KEEP | 9 FR-10, FR-15 |
| R-060 | 新 custom food ID 采用 legacy 高位 ID 规则或安全等价方案。 | 既有 PRD | MODIFY | 9 FR-10 |
| R-061 | 已记录 entry 的 amount 可编辑。 | 既有 PRD | KEEP | 9 FR-11 |
| R-062 | amount 变化时营养值实时重算。 | 既有 PRD | KEEP | 9 FR-11 |
| R-063 | 普通 entries 可独立删除。 | 既有 PRD | KEEP | 9 FR-11 |
| R-064 | Drag/drop 或等价方式支持在餐次间移动 entry。 | 当前 app 已验证行为 | KEEP | 9 FR-11 |

---

## H. Summary、Targets 与日期导航

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-065 | 跟踪 Calories、Protein、Carbs、Fat、Fibre、Sodium、Potassium。 | 既有 PRD | KEEP | 9 FR-12 |
| R-066 | 实时汇总 selected-day intake。 | 既有 PRD | KEEP | 9 FR-12 |
| R-067 | 显示 consumed、target、gap。 | 既有 PRD | KEEP | 9 FR-12 |
| R-068 | 用 progress bars 表示完成度。 | 既有 PRD | KEEP | 9 FR-12 |
| R-069 | Warning 状态区分 normal / approaching / exceeded。 | 既有 PRD | KEEP | 9 FR-12 |
| R-070 | 默认目标保持 1593 / 138 / 134 / 56 / 40 / 2784 / 4871。 | 既有 PRD | KEEP | 9 FR-13 |
| R-071 | Targets 可编辑且持久化。 | 既有 PRD | KEEP | 9 FR-13 |
| R-072 | 提供 Restore Defaults。 | 当前 app 已验证行为 | KEEP | 9 FR-13 |
| R-073 | 提供 previous / next date 导航。 | 既有 PRD | KEEP | 9 FR-14 |
| R-074 | 不允许选择未来日期。 | 当前 app 已验证行为 | KEEP | 9 FR-14 |
| R-075 | 提供 date picker 或等价直接选择。 | 当前 app 已验证行为 | KEEP | 9 FR-14 |

---

## I. 云同步与 API

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-076 | 必需 sheet tabs：DailyLog、CustomFoods、NutritionDB、DailySummary。 | 既有 PRD | KEEP | 9 FR-15 |
| R-077 | 现有 Biofeedback tab 保留为 sync 目标。 | 既有 PRD | KEEP | 9 FR-15, FR-19 |
| R-078 | 在一个设备的修改，另一个设备刷新后可见。 | 既有 PRD | KEEP | 9 FR-15, 13 |
| R-079 | Apps Script 1 支持 getLog、addEntry、deleteEntry、getCustomFoods、addCustomFood、deleteCustomFood、getNutritionDB、syncDailySummary、purgeOldData。 | 既有 PRD | KEEP | 9 FR-16 |
| R-080 | Apps Script 2 支持 syncBiofeedback。 | 既有 PRD | KEEP | 9 FR-16 |
| R-081 | 前端通过 GET/POST 与这些 endpoints 交互。 | 既有 PRD | KEEP | 9 FR-16 |
| R-082 | Sync 按钮把 selected date totals 写入 DailySummary 和 Biofeedback。 | 既有 PRD | KEEP | 9 FR-19 |
| R-083 | 保留 Biofeedback 的日期匹配逻辑。 | 既有 PRD | KEEP | 9 FR-19 |
| R-084 | 用户能看到 sync 成功/失败提示。 | 当前 app 已验证行为 | KEEP | 9 FR-19 |

---

## J. 安全、配置与部署

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-085 | Token 不能硬编码在源码或仓库中。 | 既有 PRD | KEEP | 9 FR-17, 12 |
| R-086 | Token 存储于 Apps Script PropertiesService。 | 既有 PRD | KEEP | 9 FR-17 |
| R-087 | Token 可在 settings 中输入并存储在本地设备。 | 既有 PRD | KEEP | 9 FR-17, FR-25 |
| R-088 | Token 不可存储于 config.txt。 | 既有 PRD | KEEP | 9 FR-17, FR-18 |
| R-089 | 错误 token 返回 unauthorized failure。 | 既有 PRD | KEEP | 9 FR-17, 13 |
| R-090 | config.txt 仅存储非敏感配置。 | 既有 PRD | KEEP | 9 FR-18 |
| R-091 | config.txt 包含 script URLs 与 sheet IDs。 | 既有 PRD | KEEP | 9 FR-18 |
| R-092 | localStorage overrides config.txt。 | 既有 PRD | KEEP | 9 FR-18 |
| R-093 | 用户无需改代码即可更新 live config。 | 既有 PRD | KEEP | 9 FR-18 |
| R-094 | 使用 GitHub Pages 托管。 | 既有 PRD | KEEP | 9 FR-22 |
| R-095 | 同一 public URL 在 Mac 与 iPhone 上都可使用。 | 既有 PRD | KEEP | 9 FR-22, 13 |
| R-096 | 正常使用不需要 local server。 | 既有 PRD | KEEP | 9 FR-22 |

---

## K. 数据保留、迁移与导出

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-097 | 清理超过 90 天的 DailyLog entries。 | 既有 PRD | KEEP | 9 FR-20 |
| R-098 | 清理超过 90 天的 CustomFoods。 | 既有 PRD | KEEP | 9 FR-20 |
| R-099 | NutritionDB 和长期 summary/history 保持长期保存。 | 既有 PRD | KEEP | 9 FR-20 |
| R-100 | 支持导入 `Nutrition Database.csv` → NutritionDB。 | 既有 PRD | KEEP | 9 FR-23 |
| R-101 | 支持导入 `CustomisedFood.csv` → CustomFoods。 | 既有 PRD | KEEP | 9 FR-23 |
| R-102 | 支持导入 `DailyNutrition.xlsx` → DailySummary。 | 既有 PRD | KEEP | 9 FR-23 |
| R-103 | 通过 in-app tool 迁移 legacy 浏览器 `nt_log_*`。 | 旧 PRD + 迁移计划 | OPTIONAL | 9 FR-23 |
| R-104 | 历史本地迁移必须保留。 | 旧 PRD | MODIFY | 14.1, 9 FR-23 |
| R-105 | 保留当前 app 已验证的 export / Save Record 用户价值。 | 当前 app 已验证行为 | KEEP | 9 FR-24 |
| R-106 | 导出可用更简单新实现，不必保留旧 file API。 | 最新重建决策 | KEEP | 9 FR-24 |

---

## L. UI 与可维护性

| ID | 需求 | 来源 | 状态 | PRD 对应章节 |
|---|---|---|---|---|
| R-107 | 所有可见 UI 文本为英文。 | 既有 PRD + 最新方向 | KEEP | 9 FR-21 |
| R-108 | 由 app 控制的 sheet-facing labels 为英文。 | 既有 PRD | KEEP | 9 FR-21 |
| R-109 | Tabs、headers、buttons、toasts、placeholders、modals、settings labels 等都为英文。 | 既有 PRD | KEEP | 9 FR-21 |
| R-110 | Legacy 中文 UI 不应延续到重建版。 | 最新方向 + 当前现实 | KEEP | 9 FR-21 |
| R-111 | 产品保持 Web-first 且 mobile-friendly。 | 最新方向 | KEEP | 2, 6, 10, 12 |
| R-112 | 重建版必须使用模块化代码组织。 | 最新决策 | KEEP | 12.7, 13 |
| R-113 | 后续 AI 辅助修改应可以按文件进行。 | 最新决策 | KEEP | 12.7 |

---

## M. 明确不纳入当前范围

| ID | 需求 | 来源 | 状态 | 原因 |
|---|---|---|---|---|
| R-114 | 当前版本必须包含原生 iOS / Android App。 | 更早期未来设想 | DROP | 当前版本范围仍是 Web-first。 |
| R-115 | 多用户账号系统。 | 泛化设想 | DROP | 单用户产品不需要。 |
| R-116 | Offline-first 支持。 | 泛化设想 | DROP | 明确不在当前范围。 |
| R-117 | 条码扫描 / 图片识别。 | 泛化设想 | DROP | 明确不在当前范围。 |
| R-118 | 逐像素还原现有 JSX mockup。 | 设计参考 | DROP | UI 文件只是 preference reference。 |

---

## 一致性检查

本需求追踪文档的目标是：
1. 所有 **KEEP**、**MODIFY**、**OPTIONAL** 需求，都在 PRD 中有体现；
2. 所有 **DROP** 项目，都被明确排除在当前 PRD 有效范围外；
3. 需求冲突会被显式写出，而不是被悄悄合并。

建议用户与 PRD 一起检查本文件，并确认：
- 所有你真正需要的需求是否都已存在；
- 被标记为 MODIFY 的项是否可接受；
- 被标记为 OPTIONAL 的项里，是否有你希望提升为 KEEP 的内容。
