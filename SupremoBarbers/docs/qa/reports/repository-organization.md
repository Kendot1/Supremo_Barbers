# Repository organization verification

## Changes

- Grouped active screens under `src/features/` by responsibility.
- Separated shared layout and feedback components from workflow screens.
- Extracted existing domain interfaces from App into `src/types/domain.ts` without changing their fields.
- Moved Edge Function sources to the package-root `supabase/` directory and updated the browser rule re-export.
- Preserved previous dashboards under `src/legacy/`, diagnostic interfaces under `src/devtools/`, and historical scaffolding/setup/reference files under `docs/archive/`.
- Grouped previous QA evidence into `docs/qa/screenshots/` and `docs/qa/reports/`.
- Preserved the previous root design brief under `docs/archive/landing-redesign-brief.md`; replaced the root README with actual setup and architecture guidance.
- Added `npm test` and repository structure/import regression tests.
- Left environment files, live database configuration values, business rules, styles, and UI markup unchanged.

## Executed checks

- Baseline: all five appointment-rule tests and production build passed before changes.
- New structure suite: three expected failures before reorganization; all four checks passed afterward.
- Final `npm test`: nine tests passed, zero failures.
- Final `npm run build`: passed; 3,381 modules transformed. Generated asset names and reported sizes match the baseline build.
- `git diff --check`: passed (Git emitted line-ending conversion notices only).
- Real Chrome/Playwright against the production preview at port 4186: landing, Terms, Privacy, and booking-to-registration lazy navigation passed at 375px and 1440px; no page exceptions and no auth-screen horizontal overflow.
- Backend and reference moves were checked against HEAD; no unexpected content changes outside relocated frontend import consumers.

## Limits

- Node prints a module-type auto-detection warning when loading the shared TypeScript rules. Tests still pass. The package module system was not changed merely to suppress this warning.
- Repository-wide lint/type-check tooling is not configured. Existing React type dependencies are missing and historical code contains known type/syntax issues; this refactor does not claim full-project type safety.
- Authenticated workflows and backend deployment were not exercised; no credentials or production data were used.
- The attempted AGENTS.md cross-reference update was not applied because approval timed out. Existing agent instructions were preserved.
- Browser smoke output is saved outside the repository at `C:/Users/Admin/AppData/Local/hermes/cache/scratch/supremo-qa/organization-smoke-results.json`.
