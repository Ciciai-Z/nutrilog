# REQUIREMENTS_TRACEABILITY.md

**Rule:** Every requirement listed here must appear in `Nutrition Tracker — Product Requirements Document (Full, Rebuild Option B)`.

## Status Key
- **KEEP** = retain as active requirement in new PRD
- **MODIFY** = keep the intent but update wording/scope for rebuild decision
- **OPTIONAL** = recognized legacy requirement, not mandatory for release
- **DROP** = not included in current PRD scope

---

## A. Product Direction and Scope

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-001 | Product is a single-user nutrition tracker. | Prior PRDs | KEEP | 2, 5 |
| R-002 | Product should support Mac and iPhone access through the same hosted Web app. | Prior PRDs | KEEP | 2, 3, 13 |
| R-003 | No traditional backend server; use static frontend + Google Sheets + Apps Script. | Prior PRDs | KEEP | 2, 6, 12 |
| R-004 | No multi-user accounts. | Prior PRDs | KEEP | 6 |
| R-005 | No native app in current scoped version. | Prior PRDs + latest scope | KEEP | 6, 14 |
| R-006 | Google Sheets is the backend for the target version. | Prior PRDs | KEEP | 2, 9 FR-15 |
| R-007 | English is the maintained language standard. | Prior PRDs + latest user direction | KEEP | 6, 9 FR-21 |
| R-008 | Rebuild as a new maintainable project instead of continuing the single-file legacy architecture. | Latest decision | KEEP | 2, 4, 12, 13 |
| R-009 | Existing partial sync capability and validated local behavior should be used as reference, not as implementation constraint. | Latest decision | KEEP | 2, 4 |

---

## B. Food Database and Search

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-010 | Support main nutrition database sourced from `Nutrition Database.csv`. | Prior PRDs | KEEP | 9 FR-1 |
| R-011 | Canonical cloud source becomes `NutritionDB` sheet tab. | Prior PRDs | KEEP | 9 FR-1, FR-15 |
| R-012 | Cache the nutrition database locally for ongoing search use. | Prior PRDs | KEEP | 9 FR-1 |
| R-013 | Provide manual refresh/reload of the database cache. | Prior PRDs | KEEP | 9 FR-1, FR-25 |
| R-014 | Fuzzy search by keyword. | Prior PRDs | KEEP | 9 FR-5 |
| R-015 | Keyboard navigation for search results (arrows, Enter, Escape). | Prior PRDs | KEEP | 9 FR-5 |
| R-016 | `/` shortcut focuses the search box. | Prior PRDs | KEEP | 9 FR-5 |
| R-017 | Search results include both foods and saved meals. | Prior PRDs | KEEP | 9 FR-5 |
| R-018 | Saved meals are visually distinguishable in search results. | Prior PRDs | KEEP | 9 FR-5 |
| R-019 | Add flow includes amount, meal selection, and nutrition preview. | Prior PRDs | KEEP | 9 FR-5 |
| R-020 | No-result state offers Add New Food path. | Prior PRDs | KEEP | 9 FR-5, FR-10 |

---

## C. Calorie Logic

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-021 | Do not trust raw calorie field as final source. | Prior PRDs | KEEP | 9 FR-2 |
| R-022 | Use unified formula `round(fat×9 + carbs×4 + protein×4)`. | Prior PRDs | KEEP | 9 FR-2 |
| R-023 | Formula applies everywhere calories are displayed, edited, added, or synced. | Prior PRDs | KEEP | 9 FR-2 |

---

## D. Meal-Based Logging

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-024 | Support five meal sections: Breakfast, Snack, Lunch, Dinner, Other. | Prior PRDs | KEEP | 9 FR-3 |
| R-025 | Every entry belongs to one meal section. | Prior PRDs | KEEP | 9 FR-3 |
| R-026 | Show per-meal subtotal. | Prior PRDs | KEEP | 9 FR-3 |
| R-027 | Store and retrieve logs by date. | Prior PRDs | KEEP | 9 FR-3, FR-14 |
| R-028 | Date switch refreshes log and summary. | Prior PRDs | KEEP | 9 FR-3, FR-14 |
| R-029 | Sync always uses selected date, not hardcoded today. | Prior PRDs | KEEP | 9 FR-3 |
| R-030 | Meal headers expose quick add / add / copy-yesterday style actions. | Prior PRDs | KEEP | 9 FR-4 |

---

## E. Favorites and Saved Meals

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-031 | Favorite action available from search results. | Prior PRDs | KEEP | 9 FR-6 |
| R-032 | Favorite action available from logged entries. | Prior PRDs | KEEP | 9 FR-6 |
| R-033 | Favorites tab exists. | Prior PRDs | KEEP | 9 FR-6, 10 |
| R-034 | Favorite cards support quick add and remove. | Prior PRDs | KEEP | 9 FR-6 |
| R-035 | Favorites apply to single foods, not whole meals. | Prior PRDs | KEEP | 9 FR-6 |
| R-036 | Provide Saved Meals / My Meals area. | Prior PRDs | KEEP | 9 FR-7, 10 |
| R-037 | Saved meal builder supports adding multiple foods. | Prior PRDs | KEEP | 9 FR-7 |
| R-038 | Saved meal can be named. | Prior PRDs | KEEP | 9 FR-7 |
| R-039 | Saved meal builder shows real-time totals. | Prior PRDs | KEEP | 9 FR-7 |
| R-040 | Saved meals can be added into any meal section. | Prior PRDs | KEEP | 9 FR-7 |
| R-041 | Saved meals can be searched. | Prior PRDs | KEEP | 9 FR-7 |
| R-042 | Saved meals can be deleted. | Prior PRDs | KEEP | 9 FR-7 |
| R-043 | Editable food quantities inside saved meals update totals live. | Prior PRDs | KEEP | 9 FR-7 |
| R-044 | Saved-meal editing should avoid disruptive re-render/focus loss. | Prior PRDs | KEEP | 9 FR-7 |
| R-045 | Full post-save re-editing of saved meals. | Legacy nice-to-have | OPTIONAL | 9 FR-7 |

---

## F. Copy Yesterday and Quick Add

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-046 | Copy Yesterday works by meal section, not whole day. | Prior PRDs | KEEP | 9 FR-8 |
| R-047 | Copied items appear immediately in current date log. | Prior PRDs | KEEP | 9 FR-8 |
| R-048 | If no entries exist, show clear message. | Prior PRDs | KEEP | 9 FR-8 |
| R-049 | Quick Add supports manual macros for external food. | Prior PRDs | KEEP | 9 FR-9 |
| R-050 | Quick Add auto-calculates calories in real time. | Prior PRDs | KEEP | 9 FR-9 |
| R-051 | Quick Add is bound to a meal section. | Prior PRDs | KEEP | 9 FR-9 |
| R-052 | Quick Add creates both a log entry and reusable custom food. | Prior PRDs | KEEP | 9 FR-9 |
| R-053 | Quick Add naming follows meal/date/time convention. | Prior PRDs | KEEP | 9 FR-9 |
| R-054 | Deleting Quick Add-derived entry also removes linked custom food. | Prior PRDs | KEEP | 9 FR-9, FR-10, FR-11 |
| R-055 | Fibre is part of Quick Add input in newer PRD. | Newer PRD | KEEP | 9 FR-9 |
| R-056 | Manual calorie override inside Quick Add. | Legacy current-app behavior reference | MODIFY | 9 FR-9 |

---

## G. Custom Foods and Entry Maintenance

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-057 | Support custom foods with fields name, amount, unit, cals, pro, cho, fat, fibre, na, k. | Prior PRDs | KEEP | 9 FR-10 |
| R-058 | Custom foods searchable immediately after import/creation. | Prior PRDs | KEEP | 9 FR-10 |
| R-059 | Cloud-backed version stores custom foods in `CustomFoods`. | Prior PRDs | KEEP | 9 FR-10, FR-15 |
| R-060 | New custom food IDs follow legacy high-ID convention or safe equivalent. | Prior PRDs | MODIFY | 9 FR-10 |
| R-061 | Logged entry amount is editable. | Prior PRDs | KEEP | 9 FR-11 |
| R-062 | Nutrients recalculate in real time on amount change. | Prior PRDs | KEEP | 9 FR-11 |
| R-063 | Normal entries can be deleted independently. | Prior PRDs | KEEP | 9 FR-11 |
| R-064 | Drag/drop or equivalent move between meals. | Validated current app behavior | KEEP | 9 FR-11 |

---

## H. Summary, Targets, and Date Navigation

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-065 | Track Calories, Protein, Carbs, Fat, Fibre, Sodium, Potassium. | Prior PRDs | KEEP | 9 FR-12 |
| R-066 | Summarize selected-day intake in real time. | Prior PRDs | KEEP | 9 FR-12 |
| R-067 | Show consumed, target, and gap. | Prior PRDs | KEEP | 9 FR-12 |
| R-068 | Progress bars indicate completion. | Prior PRDs | KEEP | 9 FR-12 |
| R-069 | Warning states distinguish normal / approaching / exceeded. | Prior PRDs | KEEP | 9 FR-12 |
| R-070 | Default targets remain 1593 / 138 / 134 / 56 / 40 / 2784 / 4871. | Prior PRDs | KEEP | 9 FR-13 |
| R-071 | Targets are editable and persistent. | Prior PRDs | KEEP | 9 FR-13 |
| R-072 | Restore Defaults action exists. | Validated current app behavior | KEEP | 9 FR-13 |
| R-073 | Previous / next date navigation. | Prior PRDs | KEEP | 9 FR-14 |
| R-074 | Future dates not selectable. | Validated current app behavior | KEEP | 9 FR-14 |
| R-075 | Date picker or equivalent direct selection. | Validated current app behavior | KEEP | 9 FR-14 |

---

## I. Cloud Sync and API

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-076 | Required sheet tabs: DailyLog, CustomFoods, NutritionDB, DailySummary. | Prior PRDs | KEEP | 9 FR-15 |
| R-077 | Existing Biofeedback tab remains sync target. | Prior PRDs | KEEP | 9 FR-15, FR-19 |
| R-078 | Changes on one device appear on the other after refresh. | Prior PRDs | KEEP | 9 FR-15, 13 |
| R-079 | Apps Script 1 supports getLog, addEntry, deleteEntry, getCustomFoods, addCustomFood, deleteCustomFood, getNutritionDB, syncDailySummary, purgeOldData. | Prior PRDs | KEEP | 9 FR-16 |
| R-080 | Apps Script 2 supports syncBiofeedback. | Prior PRDs | KEEP | 9 FR-16 |
| R-081 | Frontend uses GET/POST to those endpoints as appropriate. | Prior PRDs | KEEP | 9 FR-16 |
| R-082 | Sync button writes selected date totals to both DailySummary and Biofeedback. | Prior PRDs | KEEP | 9 FR-19 |
| R-083 | Preserve Biofeedback date-matching behavior from validated implementation/migration docs. | Prior PRDs | KEEP | 9 FR-19 |
| R-084 | Sync success/failure must be visible to user. | Validated current app behavior | KEEP | 9 FR-19 |

---

## J. Security, Config, Deployment

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-085 | Token must never be hardcoded in source or repo. | Prior PRDs | KEEP | 9 FR-17, 12 |
| R-086 | Token stored in Apps Script PropertiesService. | Prior PRDs | KEEP | 9 FR-17 |
| R-087 | Token can be entered in settings and stored on device. | Prior PRDs | KEEP | 9 FR-17, FR-25 |
| R-088 | Token must not be stored in config.txt. | Prior PRDs | KEEP | 9 FR-17, FR-18 |
| R-089 | Wrong token returns unauthorized failure. | Prior PRDs | KEEP | 9 FR-17, 13 |
| R-090 | config.txt stores only non-sensitive config. | Prior PRDs | KEEP | 9 FR-18 |
| R-091 | config.txt includes script URLs and sheet IDs. | Prior PRDs | KEEP | 9 FR-18 |
| R-092 | localStorage overrides config.txt. | Prior PRDs | KEEP | 9 FR-18 |
| R-093 | User can update live config without code edits. | Prior PRDs | KEEP | 9 FR-18 |
| R-094 | Host on GitHub Pages. | Prior PRDs | KEEP | 9 FR-22 |
| R-095 | Same public URL works on Mac and iPhone. | Prior PRDs | KEEP | 9 FR-22, 13 |
| R-096 | Normal use requires no local server. | Prior PRDs | KEEP | 9 FR-22 |

---

## K. Data Retention, Migration, and Export

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-097 | Purge DailyLog entries older than 90 days. | Prior PRDs | KEEP | 9 FR-20 |
| R-098 | Purge CustomFoods older than 90 days. | Prior PRDs | KEEP | 9 FR-20 |
| R-099 | NutritionDB and long-term summary/history remain permanent where defined. | Prior PRDs | KEEP | 9 FR-20 |
| R-100 | Support importing `Nutrition Database.csv` → NutritionDB. | Prior PRDs | KEEP | 9 FR-23 |
| R-101 | Support importing `CustomisedFood.csv` → CustomFoods. | Prior PRDs | KEEP | 9 FR-23 |
| R-102 | Support importing `DailyNutrition.xlsx` → DailySummary. | Prior PRDs | KEEP | 9 FR-23 |
| R-103 | Legacy browser `nt_log_*` migration via in-app tool. | Older PRDs + project plan | OPTIONAL | 9 FR-23 |
| R-104 | Historical local migration must be preserved. | Older PRDs | MODIFY | 14.1, 9 FR-23 |
| R-105 | Preserve export / Save Record user value from validated current app. | Validated current app behavior | KEEP | 9 FR-24 |
| R-106 | Export can use a simpler new implementation, not necessarily old file APIs. | Latest rebuild decision | KEEP | 9 FR-24 |

---

## L. UI and Maintainability

| ID | Requirement | Source | Status | PRD Section |
|---|---|---|---|---|
| R-107 | All visible UI text is English. | Prior PRDs + latest direction | KEEP | 9 FR-21 |
| R-108 | Sheet-facing labels controlled by app are English. | Prior PRDs | KEEP | 9 FR-21 |
| R-109 | Tabs, headers, buttons, toasts, placeholders, modals, settings labels are English. | Prior PRDs | KEEP | 9 FR-21 |
| R-110 | Legacy Chinese UI should not continue into rebuilt product. | Latest direction + current app reality | KEEP | 9 FR-21 |
| R-111 | Product remains Web-first and mobile-friendly. | Latest direction | KEEP | 2, 6, 10, 12 |
| R-112 | Rebuild must use modular code organization. | Latest decision | KEEP | 12.7, 13 |
| R-113 | Future AI-assisted changes should be file-by-file. | Latest decision | KEEP | 12.7 |

---

## M. Explicitly Dropped / Not Current Scope

| ID | Requirement | Source | Status | Reason |
|---|---|---|---|---|
| R-114 | Mandatory native iOS/Android app in this version. | Earlier future aspiration | DROP | Current scoped release is Web-first only. |
| R-115 | Multi-user account system. | Older general possibilities | DROP | Not needed for single-user product. |
| R-116 | Offline-first support. | General possibility | DROP | Explicitly out of scope. |
| R-117 | Barcode scanning / photo recognition. | General possibility | DROP | Explicitly out of scope. |
| R-118 | Pixel-perfect implementation of existing JSX mockup. | Design reference only | DROP | UI file is preference reference, not fixed spec. |

---

## Consistency Check

This traceability file is written so that:
1. every **KEEP**, **MODIFY**, and **OPTIONAL** requirement is reflected in the PRD,
2. every **DROP** item is intentionally excluded from active PRD scope,
3. requirement conflicts are surfaced instead of silently merged.

The user should review this file together with the PRD and confirm:
- all desired requirements are present,
- any modified requirement is acceptable,
- any optional requirement that should be promoted to mandatory is identified now.
