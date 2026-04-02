

## Analiza Completa a User Journey — DAYVOX

### 1. Primul Contact (Landing)

**Stare actuala:** Nu exista landing page. Utilizatorul ajunge direct pe `/auth` (daca nu e autentificat) sau pe `/` (daca e autentificat).

**Problema:** Zero context despre ce face aplicatia inainte de a crea cont. Utilizatorul vede un formular de login/signup fara motivatie clara de a se inregistra.

---

### 2. Autentificare (`/auth`)

**Flux:**
- Taburi: Conectare / Inregistrare
- Signup: Nume complet + Email + Parola (min 6 char)
- Login: Email + Parola
- Validare cu Zod, mesaje de eroare in romana
- Dupa signup → toast "Cont creat!" si redirect la `/`
- Dupa login → redirect la `/`

**Probleme identificate:**
- **Nu exista verificare email** — utilizatorul e redirectat direct la app dupa signup, dar daca auto-confirm nu e activat, va primi eroare la urmatorul login ("Email not confirmed")
- **Nu exista "Am uitat parola"** — zero recovery flow
- **Nu exista onboarding** — dupa primul login, utilizatorul vede un dashboard gol, fara ghidaj

---

### 3. Dashboard Principal (`/`)

**Structura (de sus in jos):**
1. **Header** — logo DAYVOX, butoane notificari, Google Calendar, scan note
2. **Toolbar** — Dashboard / Calendar / Matrix + Pilot / Focus / Mai multe (dropdown) + Logout
3. **Content area** (scroll):
   - QuickStats (taskuri, evenimente, remindere azi)
   - CategoryFilter + TagFilter
   - AIPrioritization
   - MiniCalendar (saptamana curenta)
   - DayView (lista itemuri pt ziua selectata)
4. **Bottom Action Bar** (fix) — Scaneaza / Adauga / Voice

**Probleme identificate:**
- **Empty state inexistent** — cand nu ai taskuri, vezi un dashboard gol fara call-to-action sau sugestie
- **Information overload** — un utilizator nou vede: QuickStats (toate 0), filtre goale, AI prioritization (gol), mini calendar, si o lista goala. Nicio indicatie despre ce sa faca
- **Discovery problem** — functionalitati puternice (Mood, Habits, Templates, Project Breakdown, Smart Scheduler) sunt ascunse in dropdown-ul "Mai multe". Un utilizator nou nu va sti ca exista

---

### 4. Creare Item (3 moduri)

**A) Buton "Adauga"** → CreateItemDrawer
- Selectie tip: Task / Eveniment / Reminder
- Campuri specifice fiecarui tip
- Categorii, taguri, locatii, recurenta
- **OK** — flow clar si complet

**B) Voice Input** → VoiceConversationalModal
- Apasa mic → vorbeste → AI parseaza → confirmare
- Suporta: creare, modificare, interogare, planificare
- **Problema:** nu exista feedback vizual clar daca microfonul e activ pe mobile

**C) Scan Note** → ScanNoteModal
- Upload/foto → OCR → review & edit → salvare
- **OK** — flow complet

---

### 5. Vizualizari

**Dashboard** — lista zilnica cu drag & drop
**Calendar** — luna completa, click pe zi → revine la dashboard cu acea zi
**Eisenhower Matrix** — 4 cadrane urgenta/importanta

**Problema:** Tranzitia Calendar → Dashboard e ok, dar nu exista un "week view" — doar mini calendar (saptamana) si month calendar. Lipseste vizualizarea intermediara.

---

### 6. Functionalitati Avansate (ascunse in "Mai multe")

| Feature | Acces | Stare |
|---------|-------|-------|
| Smart Scheduler | Mai multe → Planifica | Functional |
| Templates | Mai multe → Template | Functional |
| Location Reminders | Mai multe → Locatii | Functional |
| Mood Tracker | Mai multe → Dispozitie | Functional |
| Habit Tracker | Mai multe → Obiceiuri | Functional |
| Morning Summary AI | Mai multe → Rezumat AI | Functional |
| Project Breakdown | Mai multe → Project Breakdown | Functional |
| Auto-Pilot | Buton direct in toolbar | Functional |
| Focus Mode | Buton direct in toolbar | Functional |

**Problema:** Discoverability foarte scazut. 7 din 9 functionalitati avansate sunt intr-un dropdown generic.

---

### 7. Editare & Stergere

- Click pe item → EditItemDrawer (sheet de jos)
- Swipe/buton delete → confirmare → stergere
- Toggle complete pe task-uri
- **OK** — flow standard si functional

---

### 8. Notificari & Integrari

- Push notifications (VAPID/Web Push)
- Email notifications (via edge function)
- Google Calendar sync
- Proximity reminders (GPS)
- **Problema:** Setarile de notificari si Google Calendar sunt accesibile doar din Header, nu si din Settings centralizat

---

### 9. Puncte Critice in Journey

```text
GAPS IN USER JOURNEY:

[Primul vizit] ──→ [Auth] ──→ [Dashboard GOL] ──→ ???
                                    │
                                    ├── Nu stie ce sa faca
                                    ├── Nu vede functionalitati
                                    └── Abandon probabil

[Utilizator recurent] ──→ [Dashboard] ──→ [Functionalitati ascunse]
                                              │
                                              └── Nu descopera Mood/Habits/
                                                  Templates/Scheduler
```

---

### 10. Recomandari Prioritizate

1. **Onboarding Flow** — Ghid interactiv la primul login (3-4 pasi) care prezinta functionalitaile principale si creeaza primul task
2. **Empty States** — Mesaje si CTA-uri cand listele sunt goale ("Adauga primul task", "Incearca Voice Input")
3. **Forgot Password** — Flow de resetare parola (critica pentru retentie)
4. **Feature Discovery** — Tooltips sau "What's new" panel pentru functionalitati ascunse
5. **Settings Page dedicata** — Centralizare: notificari, Google Calendar, profil, preferinte
6. **Weekly View** — Vizualizare intermediara intre zi si luna

