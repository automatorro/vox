
# DAYVOX - Master Plan de Dezvoltare
## Versiunea 1.0 | Februarie 2026

---

## Cuprins
1. Analiza Stării Actuale
2. Viziune Arhitecturală
3. Roadmap pe Faze
4. Detalii Tehnice per Fază
5. Tracking Milestone-uri

---

## 1. Analiza Stării Actuale

### Infrastructura Existentă

**Frontend:**
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- React Query pentru state management
- React Router pentru navigare

**Backend (Lovable Cloud):**
- Baza de date: `profiles`, `items`, `categories`
- Edge Functions: `ai-agent`, `ai-prioritize`, `ai-matrix`, `morning-summary`, `google-calendar`, `send-notification-email`, `parse-voice-input`
- Realtime activat pe `items`
- RLS complet configurat

**Funcționalități Implementate:**
- Autentificare utilizatori
- CRUD pentru Tasks, Events, Reminders
- Recurență (zilnic, săptămânal, lunar, anual)
- Categorii și filtrare
- Matrice Eisenhower
- Calendar lunar cu drag-and-drop
- Focus Mode cu Pomodoro Timer (local state)
- AI: Prioritizare, Rezumat Matinal, Agent Vocal
- Sincronizare Google Calendar
- Notificări (push + email)
- Detecție conflicte și supraîncărcare

---

## 2. Viziune Arhitecturală

### Principii de Design

```text
+-------------------------------------------------------------------+
|                        DAYVOX ARCHITECTURE                         |
+-------------------------------------------------------------------+
|                                                                     |
|  +-----------------------+    +-----------------------+             |
|  |   PRESENTATION LAYER  |    |    SERVICE WORKERS    |             |
|  |   React Components    |    |    (PWA + Offline)    |             |
|  +-----------+-----------+    +-----------+-----------+             |
|              |                            |                         |
|  +-----------v----------------------------v-----------+             |
|  |                 STATE MANAGEMENT                    |             |
|  |  React Query + Context + Zustand (pentru PWA)      |             |
|  +------------------------+----------------------------+             |
|                           |                                         |
|  +------------------------v----------------------------+             |
|  |              HOOKS / BUSINESS LOGIC                 |             |
|  |  useItems, useFocusSessions, useProductivity, etc   |             |
|  +------------------------+----------------------------+             |
|                           |                                         |
|  +------------------------v----------------------------+             |
|  |                 SUPABASE CLIENT                     |             |
|  |     Database | Realtime | Storage | Auth            |             |
|  +------------------------+----------------------------+             |
|                           |                                         |
|  +------------------------v----------------------------+             |
|  |                 EDGE FUNCTIONS                      |             |
|  |  AI Agent | Smart Scheduler | Analytics | PWA Push  |             |
|  +-----------------------------------------------------+             |
+-------------------------------------------------------------------+
```

### Noile Tabele de Date (Planificate)

```text
+------------------+     +-------------------+     +------------------+
|  focus_sessions  |     |     subtasks      |     |    templates     |
+------------------+     +-------------------+     +------------------+
| id               |     | id                |     | id               |
| user_id          |     | item_id (FK)      |     | user_id          |
| item_id (FK)     |     | title             |     | name             |
| started_at       |     | completed         |     | description      |
| ended_at         |     | sort_order        |     | items_json       |
| duration_seconds |     | created_at        |     | is_routine       |
| phase            |     +-------------------+     | created_at       |
| completed        |                               +------------------+
+------------------+     
                         +-------------------+     +------------------+
+------------------+     |       tags        |     |    item_tags     |
| productivity_    |     +-------------------+     +------------------+
|   daily_stats    |     | id                |     | item_id (FK)     |
+------------------+     | user_id           |     | tag_id (FK)      |
| id               |     | name              |     +------------------+
| user_id          |     | color             |
| date             |     | created_at        |
| focus_minutes    |     +-------------------+
| tasks_completed  |
| sessions_count   |
| most_productive_ |
|   hour           |
+------------------+
```

---

## 3. Roadmap pe Faze

### FAZA 1: Fundație Productivitate (2-3 săptămâni)
**Obiectiv:** Persistența datelor Focus Mode + Statistici de bază

- [x] Focus Mode cu Pomodoro Timer (implementat local)
- [ ] Tabel `focus_sessions` în baza de date
- [ ] Hook `useFocusSessions` pentru persistență
- [ ] Tabel `productivity_daily_stats` agregat
- [ ] Componentă `ProductivityStats` cu grafice
- [ ] Edge function `aggregate-productivity` (cron zilnic)

**Deliverables:**
- Istoricul timpului focusat per task persistat
- Grafic săptămânal cu ore productive
- "Focus Streak" și achievements

---

### FAZA 2: Subtasks și Checklist-uri (1-2 săptămâni)
**Obiectiv:** Descompunere task-uri complexe

- [ ] Tabel `subtasks` în baza de date
- [ ] Actualizare `ItemCard` cu progress bar
- [ ] Componentă `SubtaskList` inline
- [ ] AI breakdown în `ai-agent` (tool existent de extins)
- [ ] Actualizare formulare creare/editare

**Deliverables:**
- Task-uri cu subtask-uri expandabile
- Progress bar pe card
- AI poate sugera breakdown

---

### FAZA 3: PWA și Notificări Native (2 săptămâni)
**Obiectiv:** Experiență app nativă

- [ ] Service Worker pentru caching și offline
- [ ] Manifest.json pentru instalare
- [ ] Push notifications cu Web Push API
- [ ] Background sync pentru items
- [ ] Edge function `web-push-send`
- [ ] Tabel `push_subscriptions` pentru device tokens

**Deliverables:**
- App instalabilă pe mobil/desktop
- Notificări când browser-ul e închis
- Mod offline funcțional

---

### FAZA 4: Smart Scheduling AI (2-3 săptămâni)
**Obiectiv:** Planificare inteligentă automată

- [ ] Edge function `smart-scheduler`
- [ ] Analiză calendar pentru gap-uri libere
- [ ] Sugestii time-blocking bazate pe:
  - Durata estimată task
  - Prioritate și deadline
  - Ore productive ale utilizatorului
- [ ] UI pentru acceptare/refuz sugestii
- [ ] Integrare în Morning Summary

**Deliverables:**
- "Când ar fi bine să fac X?" - răspuns AI
- Planificare automată a zilei
- Protecție buffer între task-uri

---

### FAZA 5: Templates și Rutine (1-2 săptămâni)
**Obiectiv:** Automatizare task-uri repetitive

- [ ] Tabel `templates`
- [ ] UI pentru creare/editare template
- [ ] Aplicare template cu un click
- [ ] Rutine predefinite (Morning, Weekly Review)
- [ ] Sugestii AI pentru template-uri bazate pe pattern-uri

**Deliverables:**
- Creează rutină personalizată
- "Aplică rutină Morning"
- Template-uri partajabile (viitor)

---

### FAZA 6: Tags și Organizare Avansată (1 săptămână)
**Obiectiv:** Flexibilitate maximă în organizare

- [ ] Tabele `tags` și `item_tags`
- [ ] Multi-select tags pe items
- [ ] Filtrare combinată (category + tags)
- [ ] View "All by Tag"
- [ ] Culori customizabile per tag

**Deliverables:**
- Tag-uri multiple per item
- Filtrare avansată
- Organizare contextuală

---

### FAZA 7: Adaptive Notifications (2 săptămâni)
**Obiectiv:** Notificări care învață din comportament

- [ ] Tracking notification interaction (dismissed, snoozed, actioned)
- [ ] Tabel `notification_feedback`
- [ ] Edge function `analyze-notification-patterns`
- [ ] Sugestii adaptive: "Observ că ignori reminder-ele de la 9:00. Să le mut la 10:00?"
- [ ] Smart snooze bazat pe pattern-uri

**Deliverables:**
- Notificări care se adaptează
- Sugestii de reschedule proactive
- Reducere "notification fatigue"

---

### FAZA 8: Collaboration (Viitor - Opțional)
**Obiectiv:** Lucru în echipă

- [ ] Workspaces partajate
- [ ] Task assignment
- [ ] Comments pe items
- [ ] Activity feed

---

## 4. Detalii Tehnice per Fază

### FAZA 1: Focus Sessions Schema

```sql
-- Migration: create_focus_sessions_table
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL DEFAULT 'work', -- 'work', 'short_break', 'long_break'
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON focus_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE focus_sessions;

-- Daily stats aggregation table
CREATE TABLE productivity_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  focus_minutes INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  most_productive_hour INTEGER, -- 0-23
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE productivity_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own stats" ON productivity_daily_stats
  FOR ALL USING (auth.uid() = user_id);
```

### FAZA 2: Subtasks Schema

```sql
-- Migration: create_subtasks_table
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subtasks" ON subtasks
  FOR ALL USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;
```

### FAZA 3: PWA Manifest

```json
{
  "name": "DAYVOX - Smart Productivity",
  "short_name": "DAYVOX",
  "description": "Your AI-powered productivity companion",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f23",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### FAZA 4: Smart Scheduler Prompt

```text
SYSTEM: You are an intelligent calendar optimizer.
Given the user's:
- Existing events and tasks
- Productivity patterns (most productive hours)
- Task durations and priorities
- Preferred buffer time between activities

Generate an optimized daily schedule that:
1. Places high-priority tasks in peak productivity hours
2. Respects existing events
3. Includes buffer time (15 min default)
4. Groups similar tasks when possible
5. Leaves time for breaks

OUTPUT: JSON with time_blocks array
```

---

## 5. Tracking Milestone-uri

### Status Legend
- [ ] - Not Started
- [~] - In Progress  
- [x] - Completed
- [!] - Blocked/Issues

---

### FAZA 1: Fundație Productivitate
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Creare tabel `focus_sessions` | [x] | 2026-02-07 | Migration aplicată cu succes |
| Creare tabel `productivity_daily_stats` | [x] | 2026-02-07 | Include streak_days |
| Hook `useFocusSessions` | [x] | 2026-02-07 | CRUD complet + stats |
| Actualizare `usePomodoroTimer` pentru persistență | [x] | 2026-02-07 | Integrat în FocusMode |
| Componentă `ProductivityStats` | [x] | 2026-02-07 | Grafice Recharts weekly/monthly |
| Edge function `aggregate-productivity` | [ ] | - | Opțional - agregare client-side |
| Pagină/View Statistics | [x] | 2026-02-07 | Modal din Focus Mode |
| **MILESTONE COMPLET** | [x] | 2026-02-07 | Faza 1 finalizată |

---

### FAZA 2: Subtasks și Checklist-uri
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Creare tabel `subtasks` | [x] | 2026-02-09 | Migration cu RLS și Realtime |
| Hook `useSubtasks` | [x] | 2026-02-09 | CRUD + useSubtaskCounts pentru batch |
| Componentă `SubtaskList` | [x] | 2026-02-09 | Inline editing cu checkboxes |
| Progress bar pe ItemCard | [x] | 2026-02-09 | Vizual cu Progress component |
| Extindere AI Agent pentru breakdown | [ ] | - | Tool `project_breakdown` |
| Update CreateItemDrawer | [ ] | - | Opțional - add în create flow |
| Update EditItemDrawer | [x] | 2026-02-09 | Secțiune subtasks adăugată |
| **MILESTONE COMPLET** | [~] | - | În curs - lipsește AI breakdown |

---

### FAZA 3: PWA și Notificări Native
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Creare manifest.json | [ ] | - | - |
| Service Worker basic | [ ] | - | Caching static assets |
| Offline mode pentru items | [ ] | - | IndexedDB sync |
| Tabel `push_subscriptions` | [ ] | - | - |
| Edge function `web-push-send` | [ ] | - | - |
| Integrare Web Push API | [ ] | - | VAPID keys |
| Install prompt UI | [ ] | - | - |
| **MILESTONE COMPLET** | [ ] | - | - |

---

### FAZA 4: Smart Scheduling AI
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Edge function `smart-scheduler` | [ ] | - | - |
| Gap analysis în calendar | [ ] | - | - |
| Productivity hours tracking | [ ] | - | Din focus_sessions |
| Time-blocking suggestions UI | [ ] | - | - |
| Accept/Reject flow | [ ] | - | - |
| Integrare Morning Summary | [ ] | - | - |
| **MILESTONE COMPLET** | [ ] | - | - |

---

### FAZA 5: Templates și Rutine
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Creare tabel `templates` | [ ] | - | - |
| Hook `useTemplates` | [ ] | - | - |
| UI creare template | [ ] | - | - |
| Apply template flow | [ ] | - | Bulk create items |
| Rutine predefinite | [ ] | - | Morning, Weekly |
| **MILESTONE COMPLET** | [ ] | - | - |

---

### FAZA 6: Tags și Organizare Avansată
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Creare tabele `tags`, `item_tags` | [ ] | - | - |
| Hook `useTags` | [ ] | - | - |
| Multi-select pe forms | [ ] | - | - |
| Filtrare combinată | [ ] | - | - |
| View by Tag | [ ] | - | - |
| **MILESTONE COMPLET** | [ ] | - | - |

---

### FAZA 7: Adaptive Notifications
| Task | Status | Data Completare | Note |
|------|--------|-----------------|------|
| Tabel `notification_feedback` | [ ] | - | - |
| Tracking interaction | [ ] | - | - |
| Edge function `analyze-patterns` | [ ] | - | - |
| Sugestii adaptive UI | [ ] | - | - |
| Smart snooze | [ ] | - | - |
| **MILESTONE COMPLET** | [ ] | - | - |

---

## Reguli de Actualizare a Acestui Document

1. **După fiecare implementare completă**, marchează task-ul cu [x] și adaugă data
2. **La început de fază**, schimbă status-ul primului task în [~]
3. **La blocări**, marchează cu [!] și adaugă detalii în Note
4. **La finalizarea fazei**, confirmă MILESTONE COMPLET cu [x]
5. **Adaugă note** despre decizii tehnice importante luate pe parcurs

---

## Priorități Recomandate

**Implementează în această ordine pentru impact maxim:**

1. **FAZA 1** - Fundație critică, valorifică Focus Mode existent
2. **FAZA 3** - PWA aduce experiență nativă, engagement crescut  
3. **FAZA 2** - Subtasks completează workflow-ul de task management
4. **FAZA 4** - Smart Scheduling diferențiază aplicația
5. **FAZELE 5-7** - Nice-to-have, în funcție de feedback utilizatori

---

*Document creat: 7 Februarie 2026*
*Ultima actualizare: -* 
*Autor: DAYVOX AI Architect*
