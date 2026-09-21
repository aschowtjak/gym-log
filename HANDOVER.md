# Übergabe: Gym Log

Stand: 21.09.2026, nach dem Rückbau auf eine Seite. `PROMPT.md` enthält den
Auftrag dieser Session und ist erledigt — historisch interessant, keine offene
Aufgabe mehr.

---

## 1. Ziel der App

Beim Training am Handy sofort sehen, mit welchem Gewicht jede Übung heute dran
ist — abgeleitet aus der letzten Einheit. Das Arbeitsgewicht ergibt sich
vollständig aus: Gewicht der letzten Einheit + „alles geschafft?". War alles
geschafft, wird beim nächsten Mal erhöht — um wie viel, tippt der Nutzer selbst
ein. Die App rechnet nichts hoch, schlägt keine Schrittweite vor und kennt keine
Einzelsätze.

---

## 2. Technische Basis

- Reine Client-PWA, kein Build, keine Abhängigkeiten, kein Server, kein Account.
- Plain HTML + CSS + JavaScript (globale Skripte, keine Module — läuft auch über `file://`).
- IndexedDB für alle Daten (`js/db.js`), Service Worker für Offline-Betrieb (`sw.js`).
- Deutschsprachige Oberfläche, Dark Theme, Mobile-First (Zielgerät: Android-Handy).
- Lokal starten: `python -m http.server 8099` (Konfiguration liegt in `.claude/launch.json`).

### Dateien

```
index.html               App-Shell: Topbar, Container, Speichern-Leiste, Modal
css/style.css             gesamtes Design, CSS-Variablen, Dark Theme
js/db.js                  IndexedDB-Wrapper: open/all/get/put/del/clear/putAll
js/seed.js                Übungskatalog, Pläne Tag A / Tag B, Demodaten-Rezept
js/chart.js                abhängigkeitsfreies SVG-Liniendiagramm (Chart.line)
js/app.js                  State, Views, Speicherlogik, Events
manifest.webmanifest      PWA-Manifest
sw.js                      Service Worker, stale-while-revalidate
icons/                     icon-192.png, icon-512.png
README.md                 Funktionsbeschreibung + Deployment-Anleitung
```

### Datenmodell

IndexedDB `gymlog`, vier Stores (unverändert gegenüber der Vorversion):

| Store | keyPath | Inhalt |
|---|---|---|
| `exercises` | `id` | `{id, name, muscle, unit}` — `unit`: `kg` / `s` / `x` (ohne Gewicht) |
| `plans` | `id` | `{id, name, order, items:[{exerciseId, block, targetSets, targetReps, hint}]}` |
| `workouts` | `id` | `{id, date, startedAt, finishedAt, planId, planName, entries:[…], demo?:true}` |
| `meta` | `key` | `seed`, `demoSeeded`, `draft` |

Workout-Eintrag jetzt **deutlich schlanker** als vorher: `{exerciseId, block, weight, done}`.
Kein `status`-String mehr, kein `up`-Feld, kein Altformat mit Einzelsätzen. `done` ist
das einzige Bewertungsfeld ("alles geschafft?"); der ↑-Marker der nächsten Einheit wird
beim Rendern **abgeleitet** (`lastLog(...).done`), nie gespeichert.

`meta.draft` hält die aktuell eingetragenen, noch nicht gespeicherten Werte pro Plan
(`{ [planId]: { [exerciseId]: {weight, done, suggested} } }`), debounced persistiert,
damit ein Reload mitten im Eintragen nichts verliert. `suggested` ist die Vorbelegung
aus der letzten Einheit und wird nur für `touched()` gebraucht (siehe Abschnitt 5).

---

## 3. Aufbau der Oberfläche (eine Seite, keine Tabs)

`js/app.js` kennt genau zwei „Views": `main` (Tagesumschalter + Plan-/Gewichtstabelle)
und `planEdit` (Plan bearbeiten, erreichbar nur über das Zahnrad-Menü). Kein Tabbar,
kein separater Fortschritts- oder Verlaufs-Bildschirm mehr.

- **Tagesumschalter** (`.daybar`) oben: ein Button pro Plan (`S.plans`), erwartet genau
  zwei Pläne (Tag A / Tag B). `S.day` hält die aktuell gewählte `planId`.
- **Plan-/Gewichtstabelle** (`<table class="ptab">`): pro Übung zwei bis drei `<tr>`:
  1. die eigentliche Planzeile (Block, Übung + Hinweis, Sätze × Wdh.),
  2. bei Übungen mit Gewicht (`unit !== 'x'`) eine zweite Zeile über die volle Breite
     mit Gewichtsfeld, ↑-Marker und dem Haken „alles geschafft" (`.wctrl`),
  3. bei aufgeklappter Historie eine dritte Zeile mit Kurve (`Chart.line`) und Liste
     der letzten Einheiten.
  Die zweite Zeile ist bewusst eine eigene `<tr>` statt in dieselbe Zelle gequetscht —
  dadurch bleiben die Tippflächen groß, ohne dass Klicks auf Eingabefeld/Haken versehentlich
  die Historie auf- oder zuklappen (das Toggle hängt nur an der ersten `<tr>`).
- **Speichern-Leiste** (`#savebar`, fixiert unten) ersetzt die alte Tabbar/Restbar.
- **Zahnrad-Menü** (Modal): Liste der Pläne → „Plan bearbeiten", dazu Backup
  Export/Import, „Demodaten löschen" (nur sichtbar, wenn welche existieren) und
  „Alle Daten löschen".

### Wichtige Funktionen in `js/app.js`

- `ensureDraft(planId)` — befüllt `S.draft[planId]` einmalig aus `lastLog(...)`, wird
  danach beim Rendern nicht mehr angefasst (sonst würden Tippen/Haken beim Neurendern
  überschrieben).
- `touched(entry)` — wie im Altcode: eine Übung gilt nur dann als heute bewertet, wenn
  der Haken gesetzt ist ODER das Gewicht vom vorbelegten Wert abweicht. Reine
  „unverändert stehen gelassene" Vorgaben landen beim Speichern nicht im Verlauf.
- `lastLog(exId, planId)` / `seriesFor(exId, planId)` — schlüsseln **ausschließlich**
  über `planId + exerciseId`, nie über den Block. Das ist Absicht (siehe Abschnitt 5).
- `saveWorkout()` — baut aus `S.draft[S.day]` nur die berührten Einträge, speichert sie
  als neues Workout, verwirft danach den Draft dieses Plans (wird beim nächsten Rendern
  aus der frisch gespeicherten Einheit neu aufgebaut).

---

## 4. Demodaten

`js/seed.js` enthält `DEMO_PROGRESSIONS` (Startgewicht, Schrittweite, `done`-Verlauf pro
Übung und Tag) und `DEMO_DAYS_AGO` (Zeitpunkte der acht Einheiten, alternierend Tag A/B,
über die letzten 42 Tage). `buildDemoWorkouts()` in `js/app.js` rechnet daraus konkrete
Workouts: das Gewicht einer Einheit ist immer „vorheriges Gewicht + Schrittweite, falls
die vorherige Einheit `done: true` war, sonst unverändert" — dieselbe Logik, die auch
die App selbst für den ↑-Marker verwendet, nur einmalig vorgerechnet.

`ensureDemo()` erzeugt diese Workouts **nur beim allerersten Start** (kein `workouts`
in der DB) und setzt danach `meta.demoSeeded = true`, egal ob erzeugt wurde oder nicht.
Dadurch kommen gelöschte Demodaten nie von selbst zurück. Ein vollständiges „Alle Daten
löschen" leert auch diesen Meta-Key mit, die App startet beim nächsten Laden also wieder
im ursprünglichen Vorführzustand.

Getestet: alle acht Demo-Einheiten zeigen plausible, steigende Gewichte, drei Einträge
sind bewusst `done: false` (Latzug/Seated Leg Curl in Tag A, Ruderzug in Tag B), die
jeweils letzte Einheit pro Tag ist überall `done: true` — direkt nach dem ersten Öffnen
sind also sowohl vorbelegte Gewichte als auch ↑-Marker sichtbar, und jede Übung hat eine
Kurve mit vier Punkten.

---

## 5. Fachliche Festlegungen (unverändert von der letzten Übergabe)

1. **Tag A und Tag B sind strikt getrennt.** Historie und Vorbelegung immer über
   `planId + exerciseId`. Betrifft Hip Thrust Maschine, Seated Leg Curl,
   Beinpresse einbeinig — im Test zeigen beide Tage tatsächlich unterschiedliche
   Gewichte für dieselbe Übung.
2. **Nur Übungen mit Zusatzgewicht werden protokolliert.** Band Pull-Aparts, Dead Bugs
   (Tag A), Side Plank, Hyperextensions (Tag B) — `unit === 'x'` bzw. `'s'` bei Side
   Plank, in beiden Fällen ohne Eingabefeld/Haken in der Tabelle.
3. **Kein automatisches Hochrechnen.** Die Vorgabe im Eingabefeld ist immer exakt das
   letzte Gewicht; der ↑-Marker ist nur ein Hinweis, keine Berechnung.
4. **Unbewertete Übungen werden nicht gespeichert** (`touched()`, siehe oben).

---

## 6. Stolperfallen

- **Service Worker beim Entwickeln:** `sw.js` liefert per stale-while-revalidate zuerst
  den Cache. Nach Code-Änderungen im Browser-Pane erst Registrierung und Caches löschen,
  sonst testet man die alte Version:
  ```js
  const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister();
  const ks = await caches.keys(); for (const k of ks) await caches.delete(k); location.reload();
  ```
  Für ausgelieferte Updates `const CACHE = 'gymlog-v3'` hochzählen (aktuell v3).
- **Demodaten kommen nach dem Löschen nicht zurück** — das ist Absicht (`meta.demoSeeded`).
  Für einen erneuten Vorführzustand während der Entwicklung: `indexedDB.deleteDatabase('gymlog')`
  und neu laden, oder gezielt `DB.clear('meta')` + `DB.clear('workouts')`.
- **Koordinaten im Browser-Pane:** Screenshots kommen teils in doppelter Auflösung zurück,
  Klickkoordinaten beziehen sich aber auf 375 × 812. Im Zweifel `find` + `ref` benutzen;
  nach jedem Rerender sind alte `ref`-IDs ungültig (stale), also nicht wiederverwenden.
- **`confirm()`-Dialoge** (Demodaten löschen, Alle Daten löschen, Backup-Import) werden
  von der Browser-Pane-Automatisierung automatisch abgebrochen, nicht bestätigt. Zum
  Testen dieser Pfade die jeweilige Funktion direkt per `javascript_tool` aufrufen statt
  über den Klick auf den Button.
- **Datum:** `todayISO()` rechnet die Zeitzone heraus, `tsOf()` hängt `T12:00:00` an,
  damit Sommerzeit keine Tagessprünge erzeugt. Beibehalten.

---

## 7. Deployment (unverändert)

Die App braucht HTTPS, damit sie installierbar und offline nutzbar ist.

- **Netlify Drop** (https://app.netlify.com/drop): Ordner ins Browserfenster ziehen, URL ist sofort da.
- **GitHub Pages**: Repo anlegen, pushen, Settings → Pages → Branch `main` / root.
- Am Handy in Chrome öffnen → ⋮ → „App installieren".

Alle Daten liegen ausschließlich im Browser des Geräts. Backups laufen über
Menü → „Backup exportieren" (JSON). Das ist auch der Weg auf ein neues Handy.
