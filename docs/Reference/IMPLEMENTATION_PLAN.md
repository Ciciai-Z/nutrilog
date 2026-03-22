# IMPLEMENTATION_PLAN.md

## 1. Overall Recommendation
Proceed with a **new project build (Option B)**, based on updated requirements and validated current behavior.

## 2. Why documents should follow the new requirements
Yes — if choosing B, the new documents should describe the **target product**, not the legacy prototype structure.
However, they should still record current reality:
- what already works
- what can be reused
- what is deliberately discarded

That prevents the old implementation from controlling the new system.

## 3. Phase Plan

### Phase 0 — Documentation consolidation
Deliverables:
- MASTER_PRD.md
- TECH_APPROACH.md
- UI_DECISIONS.md
- IMPLEMENTATION_PLAN.md

Goals:
- unify scope
- define rebuild decision
- freeze English UI direction
- define migration as optional

### Phase 1 — Backend/data contract stabilization
Tasks:
- confirm Google Sheets tables/columns
- document Apps Script endpoints
- define canonical data model
- decide which data lives in sheet vs local cache

Success criteria:
- clear data contract
- sync API documented
- no ambiguity about sheet structure

### Phase 2 — New Web MVP build
Tasks:
- create clean project structure
- implement English UI
- implement daily logging flow
- implement read/write sync with Google Sheets
- implement totals/targets
- basic error states

Success criteria:
- daily logging works on laptop
- data syncs to Google Sheets reliably
- codebase is modular

### Phase 3 — Expand Web usability
Tasks:
- saved meals/templates
- custom foods if needed
- improved mobile responsiveness
- polish edit/delete flows

### Phase 4 — Mobile/App decision
Decision gate:
- if responsive Web is sufficient, continue with Web-first
- if app convenience is still strongly needed, build App MVP using same data model

Recommended first App scope:
- today summary
- search/add food
- edit/delete entry
- sync with same Google Sheets backend

## 4. Rebuild vs refactor decision standard
Keep refactoring only if:
- old code is modular enough
- sync logic is isolated
- language cleanup is simple
- future changes can be done file-by-file safely

Rebuild if:
- single file controls everything
- change impact is broad
- English conversion touches too many places
- future mobile/sync work would compound the mess

Current recommendation: **Rebuild**.

## 5. Immediate next actions
1. Freeze these documents
2. Inventory current Google Sheets structure and existing sync behavior
3. Start new Web project scaffold
4. Re-implement only the validated core flows first
5. Treat legacy local data migration as optional follow-up

## 6. Deliverable rule
Every future implementation phase should produce:
- code changes
- summary markdown
- known risks
- next-step task list
