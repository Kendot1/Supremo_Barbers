# Supremo Barber

Appointment scheduling and barbershop management application built with React 18, Vite, Tailwind CSS 4, and Supabase Edge Functions.

## Development

The application lives in `SupremoBarbers/`. Run commands from that directory:

```sh
cd SupremoBarbers
npm ci
npm run dev
```

Vite serves the app at `http://localhost:3000`. Use `.env.example` as the environment-variable reference and supply your own local configuration. Do not commit credentials. Backend access requires the appropriate Supabase project and legitimate accounts; historical demo credentials are not setup instructions.

```sh
npm test           # Appointment rules and repository structure/import checks
npm run test:rules # Appointment rules only
npm run build      # Production bundle in build/
npm run preview    # Serve the production bundle locally
```

There is currently no configured repository-wide lint or TypeScript-check command. Vite transpiles TypeScript but does not type-check it.

## Repository layout

```text
SupremoBarbers/
  src/
    App.tsx                 Application state and role/view composition
    main.tsx                Browser bootstrap
    features/
      admin/                Administration and reporting
      auth/                 Login and password confirmation
      barber/               Barber workspace, profile, schedule, earnings
      booking/              Booking and appointment workflows
      chat/                 Assistant and conversational booking
      customer/             Customer workspace, profile, favorites, services
      legal/                Privacy and terms pages
      marketing/            Public landing page and contact form
      notifications/        Notification interfaces
      payments/             Payment submission and verification
    components/
      ui/                   Shared UI primitives
      layout/               Role shell and footer
      feedback/             Loading and error boundaries
      fallback/             Image fallback
    hooks/                  Reusable React hooks
    services/               API and integration adapters
    types/                  Shared domain types; no imports from App.tsx
    utils/                  Pure helpers and browser/Supabase utilities
    assets/                 Local images
    devtools/               Existing diagnostic and setup interfaces
    legacy/                 Previous dashboards, preserved but not routed
  supabase/                 Edge Function source and backend configuration
  tests/                    Node test suites
  tools/diagnostics/        Historical manual password/hash diagnostics
  docs/
    system-architecture.md  Runtime and authorization architecture
    repository-structure.md Organization and contribution conventions
    qa/                     Existing screenshots and validation reports
    archive/                Historical briefs, setup notes, and scaffolding
```

The outer repository contains this README; the inner directory remains the application/package root to avoid breaking existing development commands and deployment paths.

## Backend and shared rules

The canonical appointment rules remain inside `SupremoBarbers/supabase/functions/server/appointmentRules.ts` so the Edge Function can bundle them in isolation. `src/utils/appointmentRules.ts` re-exports them for browser consumers and tests.

Moving the backend directory does not deploy it or change the live database. Review backend configuration against the intended project before deploying. Database migrations are not included in this repository.

## Contributing

See [repository conventions](SupremoBarbers/docs/repository-structure.md) and [system architecture](SupremoBarbers/docs/system-architecture.md). Keep feature code with its owning feature, share only genuinely reusable components, and run tests plus the production build before submitting changes.
