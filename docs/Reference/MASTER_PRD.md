# MASTER_PRD.md

## 1. Product Overview
Nutrition Tracker is a personal nutrition logging system for a single user. It should support daily food logging on Web first and App second, with Google Sheets as the shared cloud data store so records stay in sync between laptop and phone.

## 2. Product Goal
Build a maintainable English-language nutrition tracker that supports fast daily logging, simple review, and cross-device sync.

## 3. Target User
- Single user only: the product owner
- Devices: Mac/iPhone 13 Pro
- Usage pattern: daily self-tracking, fast entry, low-friction review

## 4. Current Reality
A local Web version already exists and core functionality has been validated.
Current known facts:
- Core Web logging flow exists
- Syncing specified data to a specified Google Sheet already exists
- Current codebase is heavily coupled and concentrated in a single HTML file
- Current UI contains Chinese text and needs to be standardized to English
- Existing historical local data migration is optional, not mandatory

## 5. Product Principles
1. Personal-use only; do not overbuild.
2. Sync reliability is more important than advanced visuals.
3. Fast logging matters more than analytics in early versions.
4. Web and App should share the same data model.
5. English UI is the target standard going forward.
6. Rebuild is acceptable if it reduces maintenance cost.

## 6. Scope Strategy
### In scope for next version
- Web app with clean structure
- English UI
- Google Sheets sync as primary cloud store
- Daily logging and editing
- Food search and add flow
- Daily totals and target comparison
- Saved meals / templates (if low complexity)
- Basic delete / edit / move entry actions
- Stable sync error handling

### Nice to have
- Better charts
- Smarter quick add
- Better favorites management
- Improved mobile-first interaction polish

### Out of scope for now
- Multi-user
- Authentication / permissions
- Commercialization
- Complex reporting dashboards
- Mandatory migration of all local historical data
- Pixel-perfect implementation of current JSX design file

## 7. Core User Scenarios
1. Open the app and view today's totals and meals
2. Search food and quickly add to breakfast/lunch/dinner/snacks
3. Edit amount or delete an entry
4. Save a repeated meal template and reuse it
5. See progress against calorie and macro targets
6. Use the same data from laptop and phone

## 8. Functional Requirements
### FR-1 Daily logging
- User can add food to a meal bucket for a given date
- User can edit amount and delete an entry
- User can move an entry between meals if implemented with low complexity

### FR-2 Food data
- User can search food data quickly
- System can support custom foods
- Food record should include calories/macros and key metadata required by current flow

### FR-3 Daily summary
- System shows per-meal and daily totals
- System compares totals against targets

### FR-4 Targets
- User can set daily nutrition targets
- Targets are available across devices

### FR-5 Sync
- System reads and writes core records to Google Sheets
- Sync errors are visible to user
- Sync structure should be stable and documented

### FR-6 Language standard
- UI text for the maintained version is English
- Chinese text in legacy Web UI is not the long-term standard

## 9. Non-Functional Requirements
- Maintainable codebase
- Clear file/module separation
- Low token usage for future AI-assisted development
- Easy manual inspection of cloud data
- Good enough mobile usability even before full native app

## 10. Success Criteria
- Logging can be completed quickly on Web
- Same data can be viewed/updated on another device
- Codebase is no longer a single-file prototype
- Future AI edits can be done file-by-file
- English UI is consistent
