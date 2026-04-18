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
- **AI**: Google Gemini API
- **Charts**: Recharts
- **PDF Export**: jsPDF + jsPDF-AutoTable
- **Date Utilities**: date-fns
- **PWA**: vite-plugin-pwa

## Project Structure
```
src/
  App.tsx              # Root app with auth guards & routing
  main.tsx             # Entry point
  components/
    layout/            # TopBar, BottomNav, GlobalSearch
    sessions/          # SessionCard
    ui/                # Button, Input, Badge, BottomSheet, NumPad, Toast, etc.
  hooks/
    useRealtime.ts     # Supabase realtime subscriptions for sessions & staff
    useAudit.ts        # Audit log helper
  i18n/                # Multilingual support (fr/en/ar)
  lib/
    supabase.ts        # Supabase client
    pdf.ts             # PDF report generation
    crypto.ts          # Encryption utilities
  pages/               # All app pages (Dashboard, Login, Sessions, Clients, Reports, etc.)
  stores/
    authStore.ts       # Auth state (owner/staff/cafe)
    sessionStore.ts    # Active sessions state
    uiStore.ts         # UI state (toasts, language)
  types/
    index.ts           # All TypeScript types & DB schema types
```

## Key Features
1. **Session Management**: Real-time active session tracking, seat grid, timer, extras
2. **Billing**: Time-based cost + extras, multiple payment methods (cash/card/account/free)
3. **Client Accounts**: Prepaid balance system, visit history, spending logs
4. **Staff System**: PIN-based login, granular role permissions, audit logs
5. **Reports**: Daily/weekly/monthly analytics with PDF export
6. **PWA**: Installable as mobile app

## Dev Server
- Runs on port **5000** (configured in `vite.config.ts`)
- `npm run dev` — starts Vite dev server

## Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

## Scalability Improvements Applied
- **Parallel DB queries**: `SessionDetailPage` now fetches session + products concurrently via `Promise.all`
- **Debounced stats refresh**: Dashboard stats re-fetch is debounced (800ms) to avoid spamming the DB on every realtime event
- **Selective column fetching**: Dashboard stats query only fetches needed columns (not `SELECT *`)
- **Result limit**: Stats query capped at 100 completed sessions per day
- **Secure ID generation**: Toast IDs use `crypto.randomUUID()` instead of `Math.random()`
- **Efficient deduplication**: Recent customers query uses early-exit Set iteration for O(n) deduplication
- **Host config**: `allowedHosts: true` + `host: '0.0.0.0'` in Vite for correct Replit proxying
