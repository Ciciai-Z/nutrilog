# TECH_APPROACH.md

## 1. Recommendation
Choose **Option B: build a new maintainable project**.

## 2. Why Option B is recommended
The existing code has already been assessed as heavily coupled: UI, state, storage, sync, and rendering are mixed in a single HTML file. That makes every change expensive and risky.

Because:
- the project is single-user
- historical data migration is optional
- rebuild is acceptable
- Google Sheets sync logic already proves the concept

the lowest-risk long-term decision is to rebuild a cleaner version rather than continue repairing the old prototype.

## 3. Decision rule
Choose B when most of the following are true:
- one-file architecture
- many global variables/functions
- widespread inline events
- rendering/state/storage tightly mixed
- future scope includes sync + mobile + English UI + maintainability
- preserving every legacy implementation detail is not required

This project matches those conditions.

## 4. What “B” means
Rebuild the project as a new Web codebase using the validated product behavior, not using the old file as the implementation foundation.

Reuse:
- validated user flows
- PRD requirements
- existing Google Sheets structure where sensible
- existing sync learnings

Do not force reuse of:
- old file structure
- old UI language/content
- old local storage schema
- old historical data

## 5. Architecture direction
### Recommended stack
- Web: native HTML/CSS/JS or lightweight TypeScript build later if needed
- Data sync: Google Sheets + Apps Script
- App: later, after Web + sync stabilize

### Suggested Web structure
- `web/index.html`
- `web/styles/`
- `web/scripts/config.js`
- `web/scripts/date-utils.js`
- `web/scripts/repo.js`
- `web/scripts/sync.js`
- `web/scripts/render.js`
- `web/scripts/events.js`
- `web/scripts/store.js`

## 6. Data model approach
Use a stable cloud-first model for core records.
Recommended entities:
- Food
- LogEntry
- DailyTarget
- SavedMeal

For log history, prefer snapshot-style nutrition values in entries where this reduces future inconsistency.

## 7. Google Sheets role
Google Sheets is the shared backend for:
- log entries
- targets
- possibly saved meals if needed

Apps Script exposes minimal API actions:
- read daily logs
- create entry
- update entry
- delete entry
- read/update targets

## 8. Migration policy
Historical local data migration is optional.
Recommended default:
- no forced legacy migration
- only migrate manually if the data is truly valuable and the mapping is simple

## 9. Language policy
The maintained product uses English UI text.
Chinese is treated as legacy prototype content, not target production language.

## 10. Why not keep refactoring the old file
Refactoring the old prototype may still leave:
- hidden coupling
- regression risk
- higher token costs
- slower onboarding for every future change

A rebuild gives cleaner documents, cleaner prompts, and lower maintenance cost.

## 11. Risk controls for rebuild
- Keep scope narrow
- Reuse validated requirements
- Implement features in phases
- Use the old version only as behavioral reference, not as architectural template
