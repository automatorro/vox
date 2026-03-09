

## Audit: Probleme identificate in aplicatie

### Probleme gasite

**1. Branding inconsistent: "TaskMaster" pe pagina de autentificare**
- `src/pages/Auth.tsx` linia 133: afiseaza `TaskMaster` in loc de `DAYVOX`
- Subtitlul "Organizează-ți ziua eficient" nu se potriveste cu branding-ul "Vox - Asistentul tău personal" din Header
- OG meta tags in `index.html` (linia 18) folosesc "Vox" nu "DAYVOX"

**2. Erori React: "Function components cannot be given refs"**
- Componenta `App` genereaza multiple warning-uri in consola deoarece `Toaster`, `Sonner`, `PWAInstallPrompt` nu folosesc `React.forwardRef()`. Sunt warning-uri cosmetice dar polueaza consola.

**3. Toolbar supraancarcata pe mobile**
- Toolbar-ul din `Index.tsx` (liniile 449-549) contine 10 butoane: Pilot, Focus, Planifica, Template, Locatii, Dispozitie, Obiceiuri, Rezumat AI, plus user info si logout. Pe mobile, aceste butoane nu au loc si se trunchieaza.

### Plan de rezolvare

**Task 1: Fix branding — inlocuieste "TaskMaster" cu "DAYVOX"**
- `src/pages/Auth.tsx`: schimba "TaskMaster" → "DAYVOX", actualizeaza subtitlul
- `index.html`: uniformizeaza OG tags la "DAYVOX"

**Task 2: Rezolva toolbar overflow pe mobile**
- Grupeaza butoanele secundare (Locatii, Dispozitie, Obiceiuri, Template, Rezumat AI) intr-un meniu dropdown "Mai multe" pe ecrane mici
- Pastreaza butoanele principale vizibile (Dashboard/Calendar/Matrix + Pilot/Focus)

**Task 3: Curata warning-urile React din consola (optional/low priority)**
- Aceste warning-uri nu afecteaza functionarea, dar se pot rezolva prin wrapping componentele in `forwardRef` sau prin ajustarea modului in care sunt renderizate in `App.tsx`

### Prioritizare
1. Fix branding (rapid, impactant vizual)
2. Toolbar overflow pe mobile (UX issue real)
3. Warning-uri React (nice-to-have)

