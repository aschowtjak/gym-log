# Übergabe: Gym Log

Stand: 21.09.2026, nach dem Rückbau auf eine Seite, einer Feedback-Runde aus dem echten
Betrieb (Deployment, Nutzung am Handy) und einer zweiten Runde mit Layout-Umbau + neuen
Features. `PROMPT.md` enthält den Auftrag für die **nächste** Session (Design) — der
ursprüngliche Umbau-Auftrag ist historisch, keine offene Aufgabe mehr.

**⚠️ Aktueller Stand ist NICHT gepusht.** Auf ausdrücklichen Wunsch des Nutzers liegen die
Änderungen dieser Session nur lokal in `D:\Claude Code\Fitness App` (`git status` zeigt sie
als „modified", nicht committed). Die live auf GitHub Pages laufende Version
(https://aschowtjak.github.io/gym-log/) entspricht noch dem **vorherigen** Stand (ohne
Block-Karten, ohne Stoppuhr, Finisher noch als eigener Block). Committen/pushen erst, wenn
der Nutzer das Design final abgenommen hat — siehe `PROMPT.md`.

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
(`{ [planId]: { [exerciseId]: {weight, done} } }`), debounced persistiert, damit ein
Reload mitten im Eintragen nichts verliert.

**Ein Workout pro `planId` + `date`.** `saveWorkout()` sucht vor dem Schreiben nach einem
bestehenden Eintrag mit demselben Plan und demselben Kalendertag und überschreibt ihn
(gleiche `id`, gleiche `startedAt`), statt einen zweiten anzulegen. Wer also abends
nochmal öffnet und nachträgt, produziert keinen Karteileichen-Eintrag — Absicht,
Nutzerwunsch aus der ersten Feedback-Runde.

---

## 3. Aufbau der Oberfläche (eine Seite, keine Tabs)

`js/app.js` kennt drei „Views": `main` (Tagesumschalter + Plan-/Gewichtstabelle),
`planEdit` (Plan bearbeiten) und `history` (Liste aller gespeicherten Einheiten) —
letztere beide nur über das Zahnrad-Menü erreichbar. Kein Tabbar.

- **Tagesumschalter** (`.daybar`) oben: ein Button pro Plan (`S.plans`), erwartet genau
  zwei Pläne (Tag A / Tag B). `S.day` hält die aktuell gewählte `planId`.
- **Datums-/Kontextzeile** (`.daymeta`) direkt darunter: heutiges Datum ausgeschrieben
  (`fmtFullDate`) plus, je nach Zustand, „heute bereits gespeichert (erneutes Speichern
  überschreibt)", „zuletzt <Datum>" oder „noch nie trainiert". Zweck: sofort erkennbar,
  dass eine neue, datierte Einheit begonnen wird, und was beim Speichern passiert.
- **Plan-/Gewichtsübersicht — eine Karte pro Block** (`.blk-card`, seit dem Layout-Umbau
  vom 21.09.): keine Tabelle mehr. `viewMain()` fasst aufeinanderfolgende Plan-Positionen
  mit demselben Blockbuchstaben (`grpKey()`/`grpLabel()`, z.B. „A1"/„A2"/„A3" → Gruppe „A"
  → Überschrift „Block A") zu einer eigenen umrandeten Karte zusammen. Innerhalb einer
  Karte ist jede Übung ein `.ex-item`, getrennt nur durch eine dünne Linie
  (`.ex-item + .ex-item{border-top}`), **keine Nummerierung**. Pro Übung: links
  `.ex-left` gestapelt (Name mit Chevron `.chev-ico` → Sätze × Wdh. → Hinweis, dezent),
  rechts `.ex-weight` **rechtsbündig** (Gewichtsfeld + ↑-Marker), darunter der Haken
  „alles geschafft". `.ex-left` trägt `data-action="toggle-hist"` — **nur** dieser Bereich
  ist tippbar für die Historie, Gewichtsfeld/Haken lösen bewusst nichts aus (eigenes
  Element, kein Event-Bubbling-Problem). Bei aufgeklappter Historie hängt `historyBox()`
  (Kurve + Liste) direkt unter dem Haken im selben `.ex-item`.
  „Finisher" gibt es seit dieser Runde nicht mehr als eigene Gruppe — beide Pläne haben
  ihn testweise als „C3" in Block C integriert (`js/seed.js`, `SEED_PLANS`).
- **Speichern-Leiste** (`#savebar`, fixiert unten) ersetzt die alte Tabbar/Restbar.
- **Stoppuhr** (seit 21.09., zweite Runde): Icon im Topbar neben dem Zahnrad
  (`data-action="stopwatch"`), von jeder Seite aus erreichbar — nicht an eine bestimmte
  Übung gekoppelt, der Nutzer liest die Sekunden ab und trägt sie von Hand ins
  entsprechende Gewichtsfeld ein (z.B. Side Plank, `unit:'s'`). Zustand lebt in
  `S.stopwatch` (`startedAt`, `elapsed`, `running`), nicht in IndexedDB — bewusst
  flüchtig. Läuft über `setInterval` + `Date.now()`-Differenz weiter, auch wenn das
  Modal geschlossen wird; ein Badge im Topbar (`#swBadge`) zeigt dann die laufende Zeit
  kompakt an. Siehe `swTick()`/`swStart()`/`swPause()`/`swReset()` in `js/app.js`.
- **Zahnrad-Menü** (Modal): „Verlauf" → alle Einheiten (`nav('history')`), dazu Liste
  der Pläne → „Plan bearbeiten", Backup Export/Import, „Demodaten löschen" (nur sichtbar,
  wenn welche existieren) und „Alle Daten löschen". Der Nutzer hat in der zweiten
  Feedback-Runde bestätigt, dass die Verlauf-Liste im Menü als Zugriffspunkt reicht —
  kein separater, prominenterer Einstiegspunkt nötig.
- **Verlauf** (`viewHistory()`): alle Workouts, neueste zuerst, nach Monat gruppiert,
  Demo-Einheiten mit „· Demo" markiert. Tippen öffnet `openWorkoutDetail()` als Modal
  (Block/Übung/Gewicht/Status je Eintrag, noch als `<table class="ptab">` — unverändert)
  mit „Löschen" (`deleteWorkout()`, einzelne Einheit endgültig entfernen — z.B. um eine
  versehentlich mitgeloggte Übung wieder loszuwerden, siehe Abschnitt 5).

### Wichtige Funktionen in `js/app.js`

- `ensureDraft(planId)` — befüllt `S.draft[planId]` einmalig aus `lastLog(...)`, wird
  danach beim Rendern nicht mehr angefasst (sonst würden Tippen/Haken beim Neurendern
  überschrieben).
- `lastLog(exId, planId)` / `seriesFor(exId, planId)` — schlüsseln **ausschließlich**
  über `planId + exerciseId`, nie über den Block. Das ist Absicht (siehe Abschnitt 5).
- `saveWorkout()` — loggt **alle** Übungen des Tages mit Gewicht > 0 oder gesetztem
  Haken, auch unverändert übernommene (siehe Abschnitt 5, Punkt 4). Überschreibt einen
  bereits vorhandenen Eintrag für `planId + heutiges Datum` statt einen zweiten
  anzulegen. Verwirft danach den Draft dieses Plans (wird beim nächsten Rendern aus der
  frisch gespeicherten Einheit neu aufgebaut).
- `nextBlock(items)` — schlägt beim Hinzufügen einer Übung im Plan-Editor den nächsten
  Blockcode vor (z.B. „C3" → „C4"). **Bugfix 21.09.:** sucht jetzt rückwärts nach dem
  letzten Eintrag mit auswertbarem Blockcode (`/^[A-Za-z]\d+$/`), statt nur den
  allerletzten Plan-Eintrag anzuschauen. Vorher fiel die Zählung auf „A1" zurück, sobald
  der letzte Eintrag einen nicht passenden Blockcode hatte (genau der Fall war „Finisher"
  am Planende — mit ausgelöst durch den Nutzer-Bugreport, dass neu hinzugefügte Übungen
  „nicht im richtigen Block" landeten).

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
4. **Speichern loggt immer die ganze Einheit** (seit der Feedback-Runde vom 21.09., löst
   die alte `touched()`-Regel ab): eine Übung mit Gewicht > 0 landet im Verlauf, auch
   wenn nichts geändert wurde — genau dieser Fall bedeutet „gleiches Gewicht, nicht als
   geschafft markiert", also kein ↑-Marker beim nächsten Mal. Nur Übungen ganz ohne
   Gewicht (kein Vorwert, nichts eingetippt) UND ohne Haken werden übersprungen, es gibt
   keine Möglichkeit mehr, eine Übung bewusst „für heute auslassen" zu markieren, ohne
   das Gewichtsfeld leer zu lassen. Versehentlich mitgeloggte Übungen lassen sich über
   Verlauf → Einheit öffnen → „Löschen" wieder entfernen (löscht die ganze Einheit, kein
   Löschen einzelner Übungen innerhalb einer Einheit).

---

## 6. Stolperfallen

- **Service Worker beim Entwickeln:** `sw.js` liefert per stale-while-revalidate zuerst
  den Cache. Nach Code-Änderungen im Browser-Pane erst Registrierung und Caches löschen,
  sonst testet man die alte Version:
  ```js
  const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister();
  const ks = await caches.keys(); for (const k of ks) await caches.delete(k); location.reload();
  ```
  Für ausgelieferte Updates `const CACHE = 'gymlog-v6'` hochzählen (aktuell v6).
- **Zielgerät Pixel 7a/8:** im Browser-Pane mit `resize_window` auf 412 × 915 testen
  (CSS-Pixel-Viewport beider Geräte in Chrome, DPR 2.625), nicht mehr 375 × 812
  (iPhone-Maß aus dem ersten Umbau). Das Layout ist fluid und braucht dafür keine
  eigene Media Query, aber neue UI-Elemente hier gegenprüfen.
- **Screenshot-Tool manchmal flaky:** vereinzelt kommen gekachelte/doppelte Screenshots
  oder ein `Screenshot timed out`-Fehler zurück, obwohl die Seite korrekt ist (DOM/State
  per `javascript_tool` prüfen bestätigt das). Hilft meist: `tabs_select` auf den
  Ziel-Tab (Fenster nach vorne holen), dann erneut screenshotten. Ebenso können `find`-
  Refs nach einem Klick/Rerender auf einen falschen Koordinatenwert zeigen, ohne einen
  „stale"-Fehler zu werfen — im Zweifel `javascript_tool` zur Zustandskontrolle nutzen
  statt sich auf den Screenshot allein zu verlassen.
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

## 7. Design-Recherche & drei Richtungsvorschläge (offen für nächste Session)

Auf Nutzerwunsch online nach Design-Trends für Fitness-/Trainings-Apps recherchiert
(Dribbble, Mobbin, GitHub-Themen „fitness-tracker", Bento-Grid-Trend 2026). Kernaussagen:
dunkle, fast schwarze Flächen (~#0B0B0F) mit **genau einer** kräftigen Akzentfarbe,
**große Zahlen** für Live-Werte, **Bento-Grid-Sektionen** (abgegrenzte Kacheln, 12–24px
Radius) — deckt sich mit dem in dieser Session gebauten Block-Karten-Layout. Details und
Quellen: siehe Chatverlauf dieser Session.

Drei ausgearbeitete Richtungen, rein auf CSS-Variablen der bestehenden App aufgesetzt
(keine neue Schrift, keine Bibliothek):

1. **Bento Minimal** — größerer Karten-Radius (20px statt 14px), jeder Block (A/B/C)
   bekommt eine eigene Akzentfarbe für die Überschrift (Blau/Violett/Grün) statt überall
   dasselbe Blau.
2. **High-Contrast Numeric** — Gewichtszahl wird sehr groß (~30px) und ist der visuelle
   Fokus, Hinweistext verschwindet/wird kleiner, alles drumherum bewusst gedämpft.
3. **Soft Depth** — weicher Schatten statt harter 1px-Kante um die Block-Karten, minimal
   hellerer Verlauf im Kartenhintergrund, großer Radius (22px), einfarbig (kein
   Regenbogen wie bei Richtung 1).

Ein Vergleichs-Mockup aller drei (mit echtem Inhalt: Block A/B aus Tag A) liegt als
Artifact vor: **https://claude.ai/artifact/DEPd9BAV6CWV5CZYDK12Er** (privat, nur für den
Ersteller sichtbar). Der Nutzer hat sich in dieser Session noch **nicht** für eine
Richtung entschieden — das ist die Aufgabe der nächsten Session, siehe `PROMPT.md`.

Offener Punkt aus derselben Runde: der „alles geschafft"-Haken gefällt dem Nutzer optisch
nicht. Diskutierte Alternativen (noch nicht umgesetzt): Pill-Button zum Antippen,
Gedrückthalten mit Fortschrittsanimation, oder nur visuell abgespeckt. Entscheidung hängt
laut Nutzer von der finalen Block-Karten-Optik ab — erst Design-Richtung festlegen, dann
diesen Punkt nochmal aufgreifen.

---

## 8. Deployment

Läuft bereits produktiv über **GitHub Pages**: Repo `aschowtjak/gym-log` (öffentlich,
enthält nur Code, keine Trainingsdaten), Branch `master`, Pages-Quelle `/` (root).
Ein neuer Stand ist ein normaler `git push` auf `master`; GitHub baut automatisch neu,
danach am Handy zweimal öffnen (Service-Worker-Cache, siehe Abschnitt 6).

Am Handy: https://aschowtjak.github.io/gym-log/ in Chrome öffnen → ⋮ → „App
installieren". Alle Trainingsdaten liegen ausschließlich im Browser des Geräts (IndexedDB).
Backups laufen über Menü → „Backup exportieren" (JSON) — das ist auch der Weg auf ein
neues Handy.

Alternativen, falls das Repo mal nicht die richtige Wahl ist: **Netlify Drop**
(https://app.netlify.com/drop, Ordner reinziehen, sofortige URL, kein Git nötig) oder
lokal im Heim-WLAN (`python -m http.server 8099`, ohne HTTPS aber ohne Installierbarkeit).
