# Supremo Barber system architecture

This document records the architecture verified from the current repository. It is intentionally implementation-oriented so future changes can preserve the existing appointment, payment, and role rules.

## Runtime topology

```text
Browser (React + Vite + Tailwind v4)
  ├─ App.tsx: session bootstrap, role routing, appointment/notification refresh
  ├─ LandingPage / LoginPage / role dashboards
  ├─ services/api.service.ts: API contract, auth headers, timeout, cache
  └─ utils/authStorage.ts: sessionStorage-backed session and legacy cleanup
          │
          ▼
Supabase Edge Function: make-server-70e1fc66
  ├─ Hono HTTP routes and CORS
  ├─ verified Supabase Auth token → public.users profile
  ├─ role/ownership policy checks
  ├─ service-role Supabase client for database operations
  ├─ in-memory request deduplication and caches
  └─ email, Cloudflare R2 upload, and AI integrations
          │
          ▼
Supabase Auth + PostgreSQL tables
  users, user_devices, barbers, services, appointments, payments,
  reviews, service_favorites, notifications, audit_logs, settings,
  earnings, and related tables referenced by the Edge Function.
```

The deployed frontend uses the Edge Function API at `https://<project>.supabase.co/functions/v1/make-server-70e1fc66/api`. The repository does not contain database migrations, so the live schema and RLS policies remain deployment-managed.

The canonical pure appointment-rule module is stored at `src/supabase/functions/server/appointmentRules.ts` so Supabase can bundle it with the Edge Function. The browser entry point at `src/utils/appointmentRules.ts` re-exports that module; this avoids a deploy-time import that walks outside the function directory.

## Role workflows

- Guest: landing content, public service/review reads, contact inquiry, AI chat, login and registration.
- Customer: authenticated profile/device management, own appointments, booking, payment-proof submission, cancellation, favorites, notifications, and reviews.
- Barber: own barber profile/availability, assigned appointments, completion/cancellation/status actions, and earnings/review views.
- Admin/staff: operational dashboard, all appointment/user/service/barber/payment/review/audit/settings workflows. `staff` now follows the operational dashboard route instead of the unknown-role fallback.

The active role entry points are now `CustomerWorkspace`, `BarberWorkspace`, and `AdminWorkspace`, all built on the shared `redesign/RoleShell`. Customer navigation is organized around the next visit (overview, guided booking, appointments, services, live availability, profile); barber navigation is organized around the floor (today, schedule, calendar, history, earnings, availability, profile); admin navigation is grouped by operating work (command center, appointments, payments, people, catalog, insights, and system controls). Existing API-backed modules remain connected inside these new page structures so the redesign does not bypass booking, payment, authorization, or notification behavior.

## Critical integrity rules now enforced at the API boundary

- Protected API calls require a verified Supabase access token and an active `users` profile.
- Public API access is explicit rather than implicit; public landing reads are limited to the service, barber, and review collections plus public auth/contact/chat routes.
- Elevated registration roles require an already authenticated privileged operator. Anonymous registration produces customers; the existing first-user auto-admin behavior is preserved when no role is supplied.
- User/profile/device mutations are owner-or-privileged only. Non-privileged profile updates cannot change role, activation, email, or revocation fields.
- Appointment reads and mutations are scoped to the customer/barber owner or privileged staff. Customer availability responses are reduced to scheduling fields and cache keys include the access scope.
- Payment creation is limited to the appointment customer or privileged staff; payment verification/update operations are privileged.
- Payment creation now reads the appointment balance server-side, rejects closed appointments and non-positive/mismatched amounts, normalizes legacy payment field names, and requires an HTTPS proof URL for GCash submissions while retaining privileged cash booking support.
- Favorites, notifications, reviews, audit reads, settings writes, uploads, analytics, and destructive admin utilities have explicit access checks.
- The customer cancellation endpoint used by the UI now exists, validates ownership and terminal status, preserves the current cancelled/refunded convention, and invalidates the appointment cache.
- Shared active-status rules now drive booking counts, analytics upcoming lists, customer history, and live slot availability so approved/verified bookings cannot be omitted from conflict visibility.
- Appointment creation now validates required references, future/non-Sunday dates, active service/barber records, uses the database service price, rejects overlapping active slots, and serializes same-barber/date writes within an Edge Function isolate.
- Customer rescheduling is now accepted only with a new date/time, the existing two-day notice rule, a single-use reschedule count, a valid status, and a conflict-free slot. Customer cancellation uses the dedicated endpoint from the dashboard instead of a generic optimistic update.
- Appointment updates enforce role-specific fields and valid status transitions; customers cannot edit ownership, pricing, or payment verification, and customer availability responses expose scheduling fields only.
- Public registration now uses the database count returned by Supabase rather than treating a `head: true` query's null data as proof that every account is the first user.

## UI system

The UI is Tailwind-native and uses a deliberately different workspace composition: an espresso navigation rail on desktop, compact mobile navigation, editorial page headers, task-oriented hero panels, operational queues, timeline cards, metric tiles, status pills, schedule surfaces, and reusable responsive role primitives. The visual language uses warm cream surfaces, espresso ink, amber gold, terracotta accents, editorial serif display type, and rounded tactile controls. Existing workflow modules are framed by the new page hierarchy rather than being exposed as disconnected legacy tabs.

## Known deployment limitations

- The current root build script is `vite build`; the repository has a focused checked-in appointment-rules test suite, but no active repository-wide TypeScript/lint script. The Edge Function is Deno code and is not type-checked by the frontend build.
- Live Supabase migrations/RLS policies are not present in this repository, so database-level enforcement still needs to be audited against the linked project before deployment.
- Browser screenshot QA could not be completed in this environment because no browser surface was available. The production bundle and local HTTP smoke checks were completed instead.
- The Edge Function source is not type-checked by the frontend build in this repository; deploy-time Deno checks and live Supabase integration tests still require the linked project/toolchain.
- The in-memory booking lock protects concurrent requests handled by one Edge Function isolate. A database-side exclusion/locking constraint would be the stronger cross-isolate guarantee, but no checked-in migrations exist and production schema changes were intentionally not attempted.
