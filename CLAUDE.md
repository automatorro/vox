# CLAUDE.md — DAYVOX Codebase Guide

This file documents the architecture, conventions, and workflows for the DAYVOX project. It is intended for AI assistants (and humans) contributing to this codebase.

---

## Project Overview

**DAYVOX** is an AI-powered personal productivity application (Romanian: "Asistent Personal Inteligent"). It combines task management, calendar scheduling, Pomodoro focus tracking, and voice-driven AI to help users plan and manage their day.

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **PWA**: vite-plugin-pwa with Workbox service workers
- **Platform**: Developed and hosted via [Lovable](https://lovable.dev)

---

## Development Commands

```bash
# Start development server (localhost:8080)
npm run dev

# Production build
npm run build

# Development build (with source maps)
npm run build:dev

# Lint (ESLint)
npm run lint

# Preview production build
npm run preview
```

> **Package manager**: Both `bun.lockb` and `package-lock.json` exist. Prefer `npm` for consistency unless explicitly using Bun.

> **No test suite** is currently configured. There are no test files or test runners in the project.

---

## Repository Structure

```
vox/
├── src/
│   ├── components/          # Feature components (33+)
│   │   └── ui/              # shadcn/ui base components (50+) — DO NOT EDIT
│   ├── pages/               # Route-level page components
│   │   ├── Index.tsx        # Main dashboard (large, complex)
│   │   ├── Auth.tsx         # Sign in / sign up
│   │   └── NotFound.tsx     # 404 page
│   ├── hooks/               # All custom React hooks (business logic)
│   ├── integrations/
│   │   └── supabase/        # Auto-generated Supabase client + TypeScript types
│   ├── types/
│   │   └── index.ts         # Domain type definitions
│   ├── data/                # Static mock/seed data for development
│   ├── lib/
│   │   └── utils.ts         # Utility helpers (cn, etc.)
│   ├── App.tsx              # Router, providers, global layout
│   ├── main.tsx             # React root entry point
│   └── index.css            # Global CSS (Tailwind base + CSS variables)
├── supabase/                # Supabase project config (migrations, etc.)
├── public/                  # Static assets (favicon, PWA icons)
├── .lovable/
│   └── plan.md              # Development roadmap and phase tracking
├── vite.config.ts           # Vite + PWA config
├── tailwind.config.ts       # Theme customization
├── tsconfig.json            # TypeScript config
├── components.json          # shadcn/ui config
└── eslint.config.js         # ESLint rules
```

---

## Architecture

```
Presentation Layer (React Components)
         ↓
State Management (React Query + local useState)
         ↓
Custom Hooks  ← Business logic lives here
         ↓
Supabase JS Client
         ↓
Supabase Backend (Database | Auth | Realtime | Edge Functions)
```

### Key Principles

1. **Business logic belongs in hooks**, not components. Components handle rendering and user interaction only.
2. **React Query** manages all server state. Do not manually cache data.
3. **No global state library** (no Zustand, Redux). Auth state is in `useAuth`; UI state is local `useState`.
4. **Supabase Realtime** is active on the `items` table. Hook into `useItems` for live updates.
5. **shadcn/ui** components in `src/components/ui/` are base primitives — prefer them for all UI elements, do not edit them directly.

---

## Domain Model

All user-created items are one of three discriminated union types, defined in `src/types/index.ts`:

```typescript
type Item = Task | Event | Reminder
```

| Type       | Key Fields                                      |
|------------|-------------------------------------------------|
| `Task`     | `deadline`, `priority`, `importance`, `completed`, `duration?` |
| `Event`    | `startTime`, `duration`, `synced`, `googleId?`  |
| `Reminder` | `time`, `notified`                              |

All three extend `RecurrenceFields`:
```typescript
interface RecurrenceFields {
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: Date;
  parentItemId?: string;
  sortOrder?: number;
}
```

**Priority**: `'low' | 'medium' | 'high' | 'critical'`
**Importance** (Eisenhower axis): `'low' | 'high'`

---

## Custom Hooks Reference

All hooks are in `src/hooks/`. Each hook encapsulates a feature domain:

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth state, sign in/up/out, user profile |
| `useItems` | CRUD for Task/Event/Reminder, Supabase Realtime sync |
| `useCategories` | Category management |
| `useTags` | Tag CRUD and item tag associations |
| `useFocusSessions` | Focus session persistence (Pomodoro records) |
| `usePomodoroTimer` | Pomodoro timer state machine (work/break phases) |
| `useNotifications` | Toast notifications and reminder scheduling |
| `usePushNotifications` | Web Push API subscription management |
| `useGoogleCalendar` | Google Calendar OAuth and sync |
| `useSubtasks` | Subtask CRUD and progress tracking |
| `useTemplates` | Template creation and application |
| `useVoiceInput` | Speech-to-text capture and AI parse |
| `useConfirmationSound` | Audio feedback |
| `useTouchDragDrop` | Touch-based drag and drop |
| `useSwipeNavigation` | Mobile swipe gestures |
| `use-mobile` | Responsive breakpoint detection |
| `use-toast` | shadcn toast imperative API |

---

## Component Inventory

### Pages (`src/pages/`)

- **`Index.tsx`** — The main dashboard. Manages all views (list, calendar, Eisenhower, stats), orchestrates modal state, and imports nearly every feature component. This file is large (~27KB); make targeted edits.
- **`Auth.tsx`** — Sign in / sign up with Zod form validation and Supabase auth.
- **`NotFound.tsx`** — Static 404 page.

### Feature Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `Header.tsx` | Top navigation bar |
| `NavLink.tsx` | Styled navigation link |
| `ItemCard.tsx` | Renders a single Task/Event/Reminder |
| `CreateItemDrawer.tsx` | Drawer for creating new items |
| `EditItemDrawer.tsx` | Drawer for editing existing items |
| `SubtaskList.tsx` | Subtask management within an item |
| `CategoryFilter.tsx` | Filter items by category |
| `CategorySelect.tsx` | Category picker component |
| `TagFilter.tsx` | Filter items by tag(s) |
| `TagSelect.tsx` | Tag picker component |
| `MiniCalendar.tsx` | Compact calendar widget |
| `MonthCalendar.tsx` | Full monthly calendar with drag-and-drop |
| `DayView.tsx` | Day-level schedule view |
| `FocusMode.tsx` | Pomodoro focus session UI |
| `AutoPilotMode.tsx` | AI-driven automatic scheduling mode |
| `EisenhowerMatrix.tsx` | Priority/Importance 2x2 matrix |
| `SmartScheduler.tsx` | AI calendar gap optimizer |
| `AIPrioritization.tsx` | AI priority ranking display |
| `MorningSummaryModal.tsx` | AI-generated morning briefing |
| `ConflictResolutionModal.tsx` | Resolve scheduling conflicts |
| `OverloadResolutionModal.tsx` | Handle overloaded days |
| `VoiceButton.tsx` | Microphone trigger button |
| `VoiceConfirmationModal.tsx` | Confirm voice-parsed items |
| `VoiceConversationalModal.tsx` | Conversational AI voice interface |
| `ScanNoteModal.tsx` | Scan/OCR note input |
| `ProductivityStats.tsx` | Analytics and productivity metrics |
| `QuickStats.tsx` | Summary stat chips |
| `StatsItemsDrawer.tsx` | Drill-down items for stats |
| `TemplatesDrawer.tsx` | Browse and apply item templates |
| `NotificationSettings.tsx` | Push/email notification config |
| `GoogleCalendarSettings.tsx` | Google Calendar sync settings |
| `AuthGuard.tsx` | Route protection wrapper |
| `PWAInstallPrompt.tsx` | PWA install banner |

### UI Primitives (`src/components/ui/`)

These are **shadcn/ui** generated components. Do not edit them. Consume them from feature components.

---

## Supabase Backend

### Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profile data |
| `items` | Tasks, events, reminders (discriminated by `type` column) |
| `categories` | Item categories |
| `tags` | Tag definitions |
| `item_tags` | Many-to-many: items ↔ tags |
| `subtasks` | Subtasks linked to items |
| `focus_sessions` | Pomodoro session records |
| `productivity_daily_stats` | Aggregated daily productivity metrics |
| `templates` | Reusable item templates (JSONB items field) |

Row Level Security (RLS) is fully configured — users can only access their own data.

### Edge Functions

| Function | Purpose |
|----------|---------|
| `ai-agent` | General AI assistant agent |
| `ai-prioritize` | AI item prioritization |
| `ai-matrix` | Eisenhower matrix categorization |
| `morning-summary` | AI-generated daily briefing |
| `smart-scheduler` | AI calendar gap analysis |
| `google-calendar` | Google Calendar OAuth and sync |
| `send-notification-email` | Email notification delivery |
| `parse-voice-input` | Speech transcript → structured item |
| `push-notifications` | Web Push notification delivery |

### Environment Variables

```
VITE_SUPABASE_URL=https://cixmgidhzdtxfhjfjsxp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/public key>
VITE_SUPABASE_PROJECT_ID=cixmgidhzdtxfhjfjsxp
```

The `VITE_SUPABASE_PUBLISHABLE_KEY` is the Supabase **anon key** (safe for client-side use with RLS).

---

## TypeScript Configuration

- **Path alias**: `@/` maps to `./src/` — always use this for imports.
- **Strict mode**: Disabled (`noImplicitAny: false`, `strictNullChecks: false`). Don't assume strict type enforcement.
- **JSX**: `react-jsx` transform (no need to import React in every file).
- `skipLibCheck: true` — type errors in dependencies are ignored.

---

## Styling Conventions

- **Tailwind CSS** for all styling. No CSS modules or styled-components.
- **CSS variables** for theme colors defined in `src/index.css`. Dark theme is default.
- **Custom colors** (in `tailwind.config.ts`):
  - Task, Event, Reminder each have dedicated color tokens.
  - Sidebar has its own color system.
- **Font**: Plus Jakarta Sans (via Google Fonts, cached by service worker).
- **Dark mode**: Class-based (`dark:` prefix). Applied at `<html>` level.
- **Breakpoints**: `xs` (480px), `sm`, `md`, `lg`, `xl`, `2xl` (1536px).
- Use `cn()` from `@/lib/utils` for conditional class merging.

```typescript
import { cn } from "@/lib/utils";
// Usage:
<div className={cn("base-class", condition && "conditional-class")} />
```

---

## Code Conventions

### Component Structure

```typescript
// 1. Imports (React, then external libs, then internal @/ paths)
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useItems";

// 2. Type definitions (props interfaces)
interface MyComponentProps {
  itemId: string;
  onClose: () => void;
}

// 3. Functional component with named export
export function MyComponent({ itemId, onClose }: MyComponentProps) {
  // hooks first
  // derived state
  // handlers
  // render
}
```

- **Named exports** preferred for components; default exports also acceptable.
- **PascalCase** for components, **camelCase** for functions and variables.
- Hooks must start with `use`.
- Keep components focused — extract logic to custom hooks.

### Adding New Items

When creating new `Task`, `Event`, or `Reminder` objects, always use the `useItems` hook's mutation functions — never write directly to Supabase outside of `useItems`.

### Form Validation

Use **Zod** + **React Hook Form** via `@hookform/resolvers/zod`:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ title: z.string().min(1) });
const form = useForm({ resolver: zodResolver(schema) });
```

### Notifications / Toasts

Use the `sonner` toast (preferred for new code) or the shadcn `useToast` hook:

```typescript
import { toast } from "sonner";
toast.success("Item created");
toast.error("Something went wrong");
```

---

## PWA Configuration

- Service worker auto-registers and auto-updates (`registerType: "autoUpdate"`).
- App name: **DAYVOX - Smart Productivity**.
- Theme color: `#0f1419` (dark).
- Google Fonts and GStatic are cached with `CacheFirst` (1-year TTL).
- All JS, CSS, HTML, images, SVGs, and WOFF2 fonts are pre-cached by Workbox.
- OAuth routes (`/~oauth`) are excluded from navigation fallback.

---

## Internationalization

- The app UI is primarily in **Romanian**.
- `date-fns` is used for date formatting — use Romanian locale (`ro`) where applicable.
- HTML `lang` attribute is set to `ro`.
- Do not introduce English-language UI strings without considering the Romanian context.

---

## Development Roadmap (`.lovable/plan.md`)

The project tracks development in phases:

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Focus session persistence & productivity stats | Complete |
| 2 | Subtasks & checklists | In Progress |
| 3 | PWA & native push notifications | In Progress |
| 4 | Smart scheduling AI | Partially Complete |
| 5 | Templates & routines | Complete |
| 6 | Tags & advanced organization | In Progress |
| 7 | Adaptive notifications | Not Started |

When implementing new features, check `.lovable/plan.md` for context, schema requirements, and planned architecture.

---

## Common Pitfalls

1. **Do not edit `src/components/ui/`** — these are auto-generated by shadcn/ui CLI. Re-generate them with `npx shadcn-ui add <component>` if needed.
2. **Do not bypass `useItems`** to write to Supabase directly from components.
3. **`Index.tsx` is intentionally large** — it is the main dashboard orchestrator. Don't split it without understanding all its state dependencies.
4. **No test runner** — there are no tests. Validate changes manually with `npm run dev`.
5. **Both lockfiles exist** — `bun.lockb` and `package-lock.json`. Install with `npm install` to avoid lockfile conflicts.
6. **Realtime is active on `items`** — mutations through `useItems` will automatically refresh UI via Supabase Realtime subscription.
7. **TypeScript is non-strict** — do not assume `null`/`undefined` safety. Add explicit checks when dealing with optional fields.
