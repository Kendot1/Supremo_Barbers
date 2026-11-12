# Repository organization

## Ownership rules

- Put screens and workflow-specific components in `src/features/<feature>/`.
- Keep generic UI primitives in `src/components/ui/`, page chrome in `components/layout/`, and loading/error surfaces in `components/feedback/`.
- Keep API calls and integration adapters in `src/services/`. Do not move authorization or appointment/payment rules into presentation code.
- Import shared domain contracts from `src/types/domain.ts`, never from `App.tsx`. The app composes features; features must not depend on its composition root.
- Put reusable React hooks in `src/hooks/` and non-React helpers in `src/utils/`. UI-library internals may keep colocated hooks/helpers.
- Keep Edge Function implementation in `supabase/functions/`. Canonical appointment rules stay within the function directory and are re-exported by the frontend utility.
- Use explicit imports rather than broad barrel exports that hide feature dependencies or defeat lazy loading.
- Preserve filename case exactly. `PasswordInput.tsx` and `password-input.tsx` are distinct existing components with different contracts; do not merge them without consumer tests.

## Preserved historical code

`src/legacy/components/` contains earlier dashboards that are not routed by the current App. Some have existing missing dependencies. They are reference implementations, not supported entry points; do not reconnect them without repairing and testing them.

`src/devtools/` contains existing diagnostic/setup interfaces. Some are still consumed by operational screens. Folder placement does not add authorization or change their behavior; destructive tools must only be used deliberately against an authorized environment.

`docs/archive/` holds previous setup notes, the landing redesign brief, alternative email code, and duplicate exported scaffolding. These files are historical, not authoritative setup guidance. In particular, archived package/Vite/PostCSS/TypeScript files are not active project configuration.

`tools/diagnostics/` preserves manual password/hash diagnostics. They are not run by the build or tests and must not be treated as production authentication code.

## Validation

From `SupremoBarbers/`:

```sh
npm test
npm run build
```

The structure suite checks the source root, feature grouping, separation of domain types, and all local imports reachable from `src/main.tsx`, including lazy imports. It deliberately does not claim that unreferenced legacy experiments compile.

There is no configured repository-wide lint/type-check gate, and the current dependency list lacks TypeScript and React type packages. Adding a real gate requires a separate type-quality cleanup, not suppression of existing errors.

For user-facing changes, also validate rendered routes at mobile and desktop widths with legitimate test accounts for authenticated workflows. Existing historical QA evidence is under `docs/qa/`; it is not proof of the current revision.
