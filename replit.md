# Nook OS — Internet Café Management System

## Overview
Nook OS is a full-featured management system for internet cafés, gaming centers, and coworking spaces. It handles real-time session tracking, seat allocation, billing, client accounts (prepaid balances), staff operations, and analytics.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 6
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5
- **Routing**: React Router 7
- **Animations**: Motion (Framer Motion)
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime)
- **Charts**: Recharts
- **PDF Export**: jsPDF + jsPDF-AutoTable
- **Date Utilities**: date-fns
- **Offline Storage**: Dexie (IndexedDB)
- **PWA**: vite-plugin-pwa

## Project Structure
```
src/
  App.tsx              # Root app with auth guards & routing
  main.tsx             # Entry point
  components/
    layout/            # TopBar, BottomNav, GlobalSearch
    sessions/          # SessionCard, BillingModeSelector
    ui/                # Button, Input, Badge, BottomSheet, NumPad, Toast, etc.
  hooks/
    useRealtime.ts     # Supabase realtime subscriptions
    useAudit.ts        # Audit log helper
  i18n/                # Multilingual support (fr/en)
  lib/
    supabase.ts        # Supabase client (untyped — service layer provides typing)
    pdf.ts             # PDF report generation
    crypto.ts          # Encryption utilities
    services/          # Service layer — all Supabase queries centralized here
      sessions.ts      # Session CRUD + billing helpers
      clients.ts       # Client account CRUD
      transactions.ts  # Balance transaction helpers (debit/credit)
      products.ts      # Product catalog + session_consumptions
      audit.ts         # Audit log writer & reader
    offline/           # Offline-first engine (Dexie-backed)
      db.ts            # IndexedDB schema (sessions, products, consumptions, outbox)
      queue.ts         # Outbox queue with retry logic
      sync.ts          # Sync runner — replays outbox on reconnect
  pages/               # All app pages
  shared/
    components/        # Shared UI components (OfflineBanner, etc.)
    hooks/             # Shared hooks (useConnectivity)
  stores/
    authStore.ts       # Auth state (owner/staff/cafe)
    sessionStore.ts    # Active sessions state
    uiStore.ts         # UI state (toasts, language)
  types/
    index.ts           # All TypeScript types (BillingMode, SessionConsumption, etc.)
supabase/
  migrations/
    001_billing_mode.sql  # Add billing_mode + session_consumptions table
```

## Key Features
1. **Session Management**: Real-time active session tracking, seat grid, timer, extras
2. **Dual Billing Modes**: 
   - `time` — total = timeCost + extras (traditional time-based billing)
   - `consumption` — total = sum of consumptions only (time is never charged)
3. **Client Accounts**: Prepaid balance system, visit history, spending logs
4. **Staff System**: PIN-based login, granular role permissions, audit logs
5. **Reports**: Daily/weekly/monthly analytics with PDF export
6. **Offline Mode**: Dexie-backed IndexedDB cache + outbox queue; auto-syncs on reconnect
7. **PWA**: Installable as mobile app

## Dev Server
- Runs on port **5000** (configured in `vite.config.ts`)
- `npm run dev` — starts Vite dev server

## Environment Variables (Replit Secrets)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Database Migrations
Run `supabase/migrations/001_billing_mode.sql` in the Supabase SQL editor to:
- Add `billing_mode TEXT DEFAULT 'time'` to the `sessions` table
- Create `session_consumptions` table (for consumption billing mode)
- Add `billing_mode` and `breakdown JSONB` to `balance_transactions`

## Billing Rules (Important — Hard Rules)
- **`time` mode**: `total_amount = timeCost` ONLY. Extras/consumptions are tracked for informational purposes only and are NEVER added to the billed total.
- **`consumption` mode**: `total_amount = extras_total` ONLY. Time cost is NEVER included.
- All monetary values: `Math.max(0, Math.round(amount * 100) / 100)` — non-negative, 2dp
- Session duration: `Math.floor(elapsedMs / 60_000)` — whole minutes, no float drift

## Bug Fixes Applied (Full-Stack Audit)
- **Billing bug** (`SessionDetailPage`): `displayTotal` and `handleEndSession` now strictly enforce `time → timeCost only` / `consumption → extras_total only`. Extras are never double-counted.
- **SessionCard amount**: computed per `billing_mode`, never mixes time + extras.
- **Dexie boolean index bug** (`queue.ts`): IndexedDB cannot index booleans as integer 0/1; `getPendingEntries`, `getFailedEntries`, `getPendingCount` now use in-memory filter after `.toArray()`.
- **Duplicate language state**: removed `language` from `uiStore`; single source of truth is `useLanguageStore` in `src/i18n/index.ts`.
- **`useAudit` hook**: consolidated to delegate to `logAuditAction` service function (no direct Supabase calls in hook).
- **`ClientDetailPage`**: fully migrated to service layer — `getClient`, `getClientTransactions`, `getSessionsByClient`, `rechargeClientAccount`, `updateClientBalance`.
- **`ClientsPage`**: migrated to `getClients` / `createClient` service functions.
- **`DashboardPage`**: `loadStats` now uses `getCompletedSessions` service function.
- **`App.tsx` `initAuth`**: wrapped in try/catch so missing Supabase credentials no longer hang the loading spinner indefinitely.
- **`index.html`**: added `body { background: #080b12; margin: 0 }` inline style so the shell is always dark before CSS loads.
- **`sessions.ts` service**: added `getSessionsByClient(clientId)` function.

## Scalability Improvements Applied
- **Service layer enforced**: Zero raw `supabase.from()` calls remain in any page component.
- **Parallel DB queries**: `ClientDetailPage` loads client, transactions, and sessions concurrently via `Promise.all`.
- **Debounced stats refresh**: Dashboard stats re-fetch is debounced (800ms).
- **Selective column fetching**: Stats queries fetch only needed columns.
- **Offline-first**: Writes go through the outbox queue when offline; sync runs on reconnect.
- **Connectivity detection**: 15-second ping interval + browser online/offline events.
- **Dynamic imports**: Dexie/sync kept out of the initial bundle via dynamic `import()`.
- **Secure ID generation**: `crypto.randomUUID()` for toast IDs.
- **Host config**: `allowedHosts: true` + `host: '0.0.0.0'` in Vite for Replit proxying.
