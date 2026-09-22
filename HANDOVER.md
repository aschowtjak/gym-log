# Übergabe: Gym Log

Stand: 22.09.2026 (Abend), nach dem Rückbau auf eine Seite, einer Feedback-Runde aus dem
echten Betrieb (Deployment, Nutzung am Handy), einer zweiten Runde mit Layout-Umbau + neuen
Features, einer dritten Runde mit der finalen Optik der Block-Karten und einer vierten
Runde mit echten Funktionsänderungen: Verlaufs-Chart entschlackt (keine Marker mehr, keine
Status-Spalte), Haken bleiben nach dem Speichern erhalten, Datum ist editierbar inkl.
rückwirkendem Bearbeiten vergangener Einheiten, und die Verlauf-Seite zeigt jetzt
Fortschritts-Charts pro Übung statt einer flachen Sitzungsliste (siehe Abschnitt 9 für
Details und Code-Stellen). Keine offenen Aufgaben aus `PROMPT.md` mehr.

**⚠️ Offener Pull Request, noch nicht gemerged:**
[github.com/aschowtjak/gym-log/pull/1](https://github.com/aschowtjak/gym-log/pull/1)
(Branch `block-cards-and-stopwatch` → `master`). Enthält die strukturelle Umstellung auf
Block-Karten, die Finisher→Block-C-Zusammenlegung, den `nextBlock()`-Bugfix, die
Stoppuhr, die finale Optik der Block-Karten samt Zeilen-Layout, Umbenennung „Tag A/B" →
„Trainingseinheit 1/2", eine Migration für Bestandsdaten und (vierte Runde) editierbares
Datum/rückwirkendes Bearbeiten, persistente Haken und die neue Chart-Verlauf-Seite.
Solange der PR offen ist, weiterhin auf **diesem Branch** committen und pushen (nicht auf
`master`), damit alles im selben PR landet:
```
git checkout block-cards-and-stopwatch   # falls nicht schon aktiv
# Änderungen machen, committen
git push
```
Die live auf GitHub Pages laufende Version (https://aschowtjak.github.io/gym-log/) baut
aus `master` und zeigt bis zum Merge weiterhin den **vorherigen** Stand (ohne Block-Karten,
ohne Stoppuhr, Finisher noch als eigener Block) — das ist normal und kein Fehler.

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
js/seed.js                Übungskatalog, Pläne Trainingseinheit 1 / 2, Demodaten-Rezept
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

`meta.draft` hält die aktuell eingetragenen, noch nicht (oder zuletzt) gespeicherten Werte
pro Plan (`{ [planId]: { _date, [exerciseId]: {weight, done} } }`), debounced persistiert.
Seit der vierten Runde trägt jeder Draft zusätzlich `_date` — das Datum, für das er gilt
(siehe `curDateFor()`/`ensureDraft()` in Abschnitt 3). Ein Reload mitten im Eintragen
verliert dadurch weiterhin nichts, UND die Haken bleiben nach dem Speichern angehakt
(kein `delete S.draft[planId]` mehr in `saveWorkout()`).

**Ein Workout pro `planId` + `date`.** `saveWorkout()` sucht vor dem Schreiben nach einem
bestehenden Eintrag mit demselben Plan und demselben Kalendertag und überschreibt ihn
(gleiche `id`, gleiche `startedAt`), statt einen zweiten anzulegen. Wer also abends
nochmal öffnet und nachträgt, produziert keinen Karteileichen-Eintrag — Absicht,
Nutzerwunsch aus der ersten Feedback-Runde. Seit der vierten Runde ist `date` nicht mehr
zwingend „heute": `S.dates[planId]` (ephemer, nicht persistiert) hält das aktuell auf der
Hauptseite gewählte Datum, editierbar über ein `<input type="date">` und ein Dropdown mit
vergangenen Einheiten dieses Plans — dasselbe Mittel dient sowohl dem Nachtragen für heute
als auch dem rückwirkenden Bearbeiten vergangener Einheiten (siehe Abschnitt 3).

---

## 3. Aufbau der Oberfläche (eine Seite, keine Tabs)

`js/app.js` kennt drei „Views": `main` (Tagesumschalter + Plan-/Gewichtstabelle),
`planEdit` (Plan bearbeiten) und `history` (Liste aller gespeicherten Einheiten) —
letztere beide nur über das Zahnrad-Menü erreichbar. Kein Tabbar.

- **Tagesumschalter** (`.daybar`) oben: ein Button pro Plan (`S.plans`), erwartet genau
  zwei Pläne (Trainingseinheit 1 / 2, bis 22.09. „Tag A/B"). `S.day` hält die aktuell
  gewählte `planId`.
- **Datums-/Kontextzeile** (`.daymeta`) direkt darunter, seit der vierten Runde mit
  zwei Eingabeelementen (`.daymeta-row`): einem editierbaren `<input type="date"
  data-in="cur-date">` (Default heute, `max` = heute — keine Einträge für die Zukunft)
  und einem `<select data-in="hist-pick">` mit allen vergangenen Einheiten **dieses
  Plans**, das beim Auswählen ebenfalls nur das Datum setzt. Beide schreiben in
  `S.dates[planId]` (ephemer, s.o.) und lösen `render()` aus; `onChange()` behandelt
  beide identisch. Darunter ein Fließtext (`.daymeta-txt`, `fmtFullDate` des gewählten
  Datums) — für heute wie bisher „heute bereits gespeichert…" / „zuletzt <Datum>" /
  „noch nie trainiert", für ein anderes Datum „wird bearbeitet (Speichern überschreibt)"
  bzw. „neue Einheit, noch nicht gespeichert", plus ein `heute`-Link (`data-action="today"`)
  zum Zurückspringen. `curDateFor(planId)` kapselt „`S.dates[planId]` oder heute" und wird
  überall verwendet, wo früher hart `todayISO()` stand (`ensureDraft`, `planRow` fürs
  ↑-Badge, `saveWorkout`).
- **Plan-/Gewichtsübersicht — eine Karte pro Block, ein einziges CSS-Grid** (`.blk-card`,
  finale Optik vom 22.09.): `viewMain()` fasst aufeinanderfolgende Plan-Positionen mit
  demselben Blockbuchstaben (`grpKey()`/`grpLabel()`) zu einer Karte zusammen; die
  Überschrift zeigt jetzt auch die Sätze („Block A · 3 Sätze" — genommen vom ersten
  Item der Gruppe, Sätze sind seit dieser Runde je Block einheitlich, siehe Abschnitt 7).
  `.blk-card` selbst ist `display:grid;grid-template-columns:1fr auto auto` (Name |
  ↑-Badge | Pille) — **eine** Grid-Spaltenstruktur für die ganze Karte, dadurch sind
  Badges und Pillen über alle Zeilen hinweg automatisch spaltenbündig (Grid berechnet
  pro Spalte die Breite des breitesten Inhalts), ganz ohne feste Pixelwerte. Trenner
  zwischen Übungen sind eigene `<div class="ex-div">`-Elemente (`grid-column:1/-1`),
  **keine** CSS-Sibling-Regel mehr wie früher (`.ex-item + .ex-item`), weil die Übungen
  keine gemeinsamen Wrapper-Divs mehr haben, sondern direkte Grid-Kinder sind.
  Pro Übung: `.nm` (Name fett + Chevron `.chev-ico`, Hinweis darunter dezent) — trägt
  `data-action="toggle-hist"`, **nur** dieser Bereich ist tippbar für die Historie.
  `.bc` ist die Badge-Spalte (↑, falls letztes Mal geschafft — leer sonst, verschiebt
  dadurch nie die Pille daneben). Bei Übungen mit Gewicht folgt `.fp` — Wiederholungen ×
  Gewicht **und** der Haken als **ein** Bauteil: `.fp-main` zeigt Wdh. als Text + das
  editierbare Gewichtsfeld (`data-in="weight"`, unverändert) + Einheit, `.fp-tgl` ist der
  Haken, per senkrechtem Strich abgetrennt (nur der Pfeil, kein Text mehr — siehe
  Abschnitt 7). Übungen ohne Gewicht (`unit:'x'`) zeigen statt `.fp` nur `.reps-plain`
  (reiner Text, nicht fett, gleiche Größe wie die Wdh.-Angabe in der Pille). Bei
  aufgeklappter Historie hängt `historyBox()` (Kurve + Tabelle, `grid-column:1/-1`) direkt
  unter der jeweiligen Übung im selben Grid — seit der vierten Runde **ohne** Marker-Punkte
  in der Kurve und **ohne** Status-Spalte in der Tabelle (siehe Abschnitt 9, Punkt A).
  „Finisher" gibt es seit der zweiten Runde nicht mehr als eigene Gruppe — beide Pläne
  haben ihn als „C3" in Block C integriert (`js/seed.js`, `SEED_PLANS`).
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
- **Verlauf** (`viewHistory()`, seit der vierten Runde komplett neu — siehe Abschnitt 9,
  Punkt C): keine flache Sitzungsliste mehr. Oben derselbe Plan-Umschalter wie auf der
  Hauptseite (`.daybar`, eigener State `S.histPlan`, nicht `S.day` — Hauptseite und
  Verlauf-Seite können unabhängig auf verschiedenen Plänen stehen), darunter eine
  horizontal scrollbare Chip-Reihe (`.filter-row`/`.fchip`, `HIST_FILTERS`) mit „Letzte
  10" / „Gesamt" / „12/6/2/1 Mon." (`S.histFilter`, `filterSeries()`). Für jede Übung
  des gewählten Plans mit Gewicht (`unit !== 'x'`) **und** vorhandenen Daten eine eigene
  Karte (`.hist-card`): Name + Block-Label, darunter `chartCard()` mit Kurve + Tabelle
  für exakt die gefilterte Punktreihe (bei „Letzte 10" identisch zur Hauptseiten-Historie,
  bei einem Zeitraum-Filter ggf. weniger/mehr Punkte). Tippen auf eine Tabellenzeile
  öffnet `openWorkoutDetail()` für die ganze Einheit dieses Tages — der einzige
  verbliebene Weg zum Löschen einer ganzen Einheit (`deleteWorkout()`), seit die
  Verlauf-Seite keine anklickbare Sitzungsliste mehr ist.

### Wichtige Funktionen in `js/app.js`

- `curDateFor(planId)` — `S.dates[planId]` oder heute; einzige Quelle für „welches Datum
  wird gerade auf der Hauptseite bearbeitet". `S.dates` ist ephemer (nicht in IndexedDB),
  setzt sich beim Reload also immer auf heute zurück.
- `ensureDraft(planId)` — baut `S.draft[planId]` **nur neu auf, wenn sich das Datum
  geändert hat** (`cur._date !== curDateFor(planId)`), sonst bleibt der bestehende Draft
  unangetastet (das ist der Haken-Reset-Fix, siehe Abschnitt 9, Punkt B). Beim Neuaufbau:
  gibt es für das Zieldatum schon ein gespeichertes Workout, werden dessen **eigene**
  Werte geladen (rückwirkendes Bearbeiten); sonst wie bisher Vorbelegung aus
  `lastLog(exId, planId, date)` mit `done:false`.
- `lastLog(exId, planId, beforeDate?)` / `seriesFor(exId, planId)` — schlüsseln
  **ausschließlich** über `planId + exerciseId`, nie über den Block (Absicht, siehe
  Abschnitt 5). `lastLog()` nimmt seit der vierten Runde optional ein `beforeDate`: nur
  Einträge **strikt vor** diesem Datum zählen als „letztes Mal" — wichtig beim
  rückwirkenden Bearbeiten, damit die Einheit am bearbeiteten Datum selbst nicht als ihr
  eigenes „vorheriges Mal" zählt. `seriesFor()` liefert seither auch `id` (Workout-ID)
  je Punkt, für die anklickbaren Zeilen in `chartCard()`.
- `chartCard(chartPts, tablePts, unit, opts)` — Kurve + Tabelle, geteilt zwischen
  `historyBox()` (Hauptseite, Kurve unbegrenzt/Tabelle letzte 10, `opts.clickable`
  weggelassen) und `viewHistory()` (Verlauf-Seite, beide Punktreihen gleich gefiltert,
  `opts.clickable:true` öffnet `openWorkoutDetail()` per Tabellenzeile).
- `filterSeries(pts, filter)` — wendet die Verlauf-Seiten-Filterauswahl auf eine
  `seriesFor()`-Reihe an (`'10'` = letzte 10 Punkte, `'all'` = alles, sonst Monate ×
  30 Tage als grobe Näherung, kein Kalendermonat).
- `saveWorkout()` — loggt **alle** Übungen von `curDateFor(plan.id)` mit Gewicht > 0 oder
  gesetztem Haken, auch unverändert übernommene (siehe Abschnitt 5, Punkt 4).
  Überschreibt einen bereits vorhandenen Eintrag für `planId + Datum` statt einen zweiten
  anzulegen. **Löscht den Draft danach nicht mehr** (nur noch `saveDraft()`) — Haken
  bleiben nach dem Speichern angehakt, ein Reset passiert erst über `ensureDraft()`, wenn
  ein anderes Datum gewählt wird.
- `nextBlock(items)` — schlägt beim Hinzufügen einer Übung im Plan-Editor den nächsten
  Blockcode vor (z.B. „C3" → „C4"). **Bugfix 21.09.:** sucht jetzt rückwärts nach dem
  letzten Eintrag mit auswertbarem Blockcode (`/^[A-Za-z]\d+$/`), statt nur den
  allerletzten Plan-Eintrag anzuschauen. Vorher fiel die Zählung auf „A1" zurück, sobald
  der letzte Eintrag einen nicht passenden Blockcode hatte (genau der Fall war „Finisher"
  am Planende — mit ausgelöst durch den Nutzer-Bugreport, dass neu hinzugefügte Übungen
  „nicht im richtigen Block" landeten).
- `ensureMigration()` (neu, 22.09.) — einmaliger Nachzieh-Schritt für Bestandsinstallationen,
  läuft in `init()` **vor** `ensureSeed()` (wichtig, siehe unten). `ensureSeed()` legt
  Übungen/Pläne nur an, rührt aber nie an bereits vorhandenen — das ist Absicht (sonst
  würden eigene Planänderungen überschrieben), heißt aber auch: Namens-/Block-/Sätze-
  Änderungen an `SEED_PLANS`/`SEED_EXERCISES` erreichen Bestandsnutzer nie von selbst.
  `ensureMigration()` benennt bekannte alte Übungsnamen um (`renameEx`-Map, z.B.
  „Beinpresse einbeinig (≤90°)" → „Beinpresse einbeinig"), benennt `Tag A`/`Tag B` zu
  `Trainingseinheit 1`/`Trainingseinheit 2` um und gleicht danach pro Plan-Item
  `block`/`targetSets`/`targetReps`/`hint` mit der passenden `SEED_PLANS`-Zeile ab
  (**nur** wenn der Übungsname exakt matcht — eigene Ergänzungen des Nutzers, die in
  keiner `SEED_PLANS`-Zeile vorkommen, bleiben unangetastet). Gate über `meta.migration`,
  läuft nur einmal. **Reihenfolge ist kritisch:** liefe `ensureSeed()` zuerst, würde es
  für jeden Bestandsnutzer mit noch „Tag A/B" benannten Plänen zusätzlich frische
  „Trainingseinheit 1/2"-Pläne anlegen (Namen matchen ja noch nicht) — Duplikate. Beim
  Testen dieser Migration unbedingt eine **komplett leere** IndexedDB simulieren
  (`indexedDB.deleteDatabase('gymlog')`, promise-verpackt, siehe Abschnitt 6) und danach
  von Hand alte Datensätze reinschreiben, sonst testet man nur den Neuinstallations-Pfad.

---

## 4. Demodaten

`js/seed.js` enthält `DEMO_PROGRESSIONS` (Startgewicht, Schrittweite, `done`-Verlauf pro
Übung und Trainingseinheit) und `DEMO_DAYS_AGO` (Zeitpunkte der acht Einheiten,
alternierend Einheit 1/2, über die letzten 42 Tage). `buildDemoWorkouts()` in
`js/app.js` rechnet daraus konkrete Workouts: das Gewicht einer Einheit ist immer „vorheriges Gewicht + Schrittweite, falls
die vorherige Einheit `done: true` war, sonst unverändert" — dieselbe Logik, die auch
die App selbst für den ↑-Marker verwendet, nur einmalig vorgerechnet.

`ensureDemo()` erzeugt diese Workouts **nur beim allerersten Start** (kein `workouts`
in der DB) und setzt danach `meta.demoSeeded = true`, egal ob erzeugt wurde oder nicht.
Dadurch kommen gelöschte Demodaten nie von selbst zurück. Ein vollständiges „Alle Daten
löschen" leert auch diesen Meta-Key mit, die App startet beim nächsten Laden also wieder
im ursprünglichen Vorführzustand.

Getestet: alle acht Demo-Einheiten zeigen plausible, steigende Gewichte, drei Einträge
sind bewusst `done: false` (Latzug/Seated Leg Curl in Einheit 1, Ruderzug in Einheit 2),
die jeweils letzte Einheit pro Trainingstag ist überall `done: true` — direkt nach dem
ersten Öffnen sind also sowohl vorbelegte Gewichte als auch ↑-Marker sichtbar, und jede
Übung hat eine Kurve mit vier Punkten.

---

## 5. Fachliche Festlegungen

1. **Trainingseinheit 1 und 2 sind strikt getrennt.** Historie und Vorbelegung immer über
   `planId + exerciseId`. Betrifft Hip Thrust Maschine, Seated Leg Curl,
   Beinpresse einbeinig — im Test zeigen beide Einheiten tatsächlich unterschiedliche
   Gewichte für dieselbe Übung.
2. **Nur Übungen mit Zusatzgewicht werden protokolliert.** Band Pull-Aparts, Dead Bugs
   (Einheit 1), Side Plank, Hyperextensions (Einheit 2) — `unit === 'x'` bzw. `'s'` bei
   Side Plank, in beiden Fällen ohne Eingabefeld/Haken, nur `.reps-plain`-Text.
3. **Kein automatisches Hochrechnen.** Die Vorgabe im Eingabefeld ist immer exakt das
   letzte Gewicht; der ↑-Marker ist nur ein Hinweis, keine Berechnung.
4. **Speichern loggt immer die ganze Einheit** (seit der Feedback-Runde vom 21.09., löst
   die alte `touched()`-Regel ab): eine Übung mit Gewicht > 0 landet im Verlauf, auch
   wenn nichts geändert wurde — genau dieser Fall bedeutet „gleiches Gewicht, nicht als
   geschafft markiert", also kein ↑-Marker beim nächsten Mal. Nur Übungen ganz ohne
   Gewicht (kein Vorwert, nichts eingetippt) UND ohne Haken werden übersprungen, es gibt
   keine Möglichkeit mehr, eine Übung bewusst „für heute auslassen" zu markieren, ohne
   das Gewichtsfeld leer zu lassen. Versehentlich mitgeloggte Übungen lassen sich über
   Verlauf → Übungskarte → Tabellenzeile antippen → „Löschen" wieder entfernen (löscht die
   ganze Einheit, kein Löschen einzelner Übungen innerhalb einer Einheit).
5. **Haken bleiben nach dem Speichern erhalten** (seit der vierten Runde, siehe Abschnitt 9
   Punkt B): kein automatischer Reset mehr bei jedem Speichern desselben Tages. Ein Reset
   passiert nur noch implizit, wenn `ensureDraft()` ein **anderes** Datum sieht als das im
   Draft gespeicherte `_date` — also beim Wechsel auf ein Datum ohne (oder mit anderem)
   Draft, z.B. an einem neuen Kalendertag oder nach Auswahl eines anderen Datums im
   Datumsfeld/Dropdown.
6. **Rückwirkendes Bearbeiten nutzt dieselbe Hauptseite, keine eigene Ansicht.** Das
   Datumsfeld bzw. Dropdown auf der Hauptseite ist der einzige Mechanismus für „Datum
   ändern" **und** „vergangene Einheit bearbeiten" — bewusste Design-Entscheidung aus
   dieser Runde, um nicht zwei parallele Bearbeitungswege zu pflegen.

---

## 6. Stolperfallen

- **Service Worker beim Entwickeln:** `sw.js` liefert per stale-while-revalidate zuerst
  den Cache. Nach Code-Änderungen im Browser-Pane erst Registrierung und Caches löschen,
  sonst testet man die alte Version:
  ```js
  const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister();
  const ks = await caches.keys(); for (const k of ks) await caches.delete(k); location.reload();
  ```
  Für ausgelieferte Updates `const CACHE = 'gymlog-v9'` hochzählen (aktuell v9).
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
- **`<script src>` ohne Charset kann als Latin-1 statt UTF-8 dekodiert werden.** Pythons
  `http.server` sendet für `.js`-Dateien `Content-Type: text/javascript` **ohne**
  `charset`-Parameter. Laut Spec sollte der Browser dann die Dokument-Kodierung erben
  (`<meta charset="utf-8">`), das griff im Browser-Pane dieser Session aber nicht
  zuverlässig — Sonderzeichen (ä/ü/ß/≤/°/–) kamen als Mojibake zurück (`Ã¤` statt `ä`),
  **inklusive** unsichtbarer Folgefehler: ein String-Vergleich in `ensureMigration()`
  gegen einen mojibake'd geladenen Text schlug lautlos fehl. Fix (22.09., committet):
  `charset="utf-8"` explizit auf jedem `<script src>`-Tag in `index.html` plus
  `@charset "UTF-8";` als erste Zeile in `css/style.css`. Seitdem sauber. Falls je wieder
  Sonderzeichen komisch aussehen: zuerst hier nachsehen, nicht an der eigenen Encoding-
  Vermutung zweifeln.
- **Browser-Pane cacht Ressourcen teils hartnäckig, quer zu `cache:'no-store'`.** In
  dieser Session lieferte derselbe Server-Prozess (auch nach Neustart, auch in neuem Tab)
  für dieselbe URL mal alten, mal neuen Datei-Inhalt — sogar `fetch(url,{cache:'no-store'})`
  bekam manchmal Alt-Content. Robuster Workaround beim Testen von Code-Änderungen:
  **immer** einen Cache-Buster an die HTML-Dokument-URL selbst hängen, nicht nur an
  referenzierte `<script>`/`<link>`-Pfade (`index.html?nav=<eindeutig>` reicht, Query wird
  vom Server ignoriert, erzwingt aber eine echte Neuabfrage). Ohne das kann eine
  „frische" Testseite trotzdem ein Alt-`index.html` mit alten Query-Strings in seinen
  eigenen `<script src>`-Tags ausliefern.
- **`indexedDB.deleteDatabase()` ist kein Promise und kann lautlos blockieren.** Läuft
  noch eine offene Verbindung auf derselben Seite (z.B. weil `init()` gerade `DB.open()`
  aufgerufen hat), hängt der Request im `blocked`-Zustand, ohne Fehler zu werfen — ein
  unverpacktes `indexedDB.deleteDatabase('gymlog')` liefert dann scheinbar sofort
  zurück, hat aber nichts gelöscht. Richtig: Promise wrappen (`onsuccess`/`onblocked`/
  `onerror`) **und** vorher auf eine Seite ohne offene DB-Verbindung navigieren (z.B.
  `/manifest.webmanifest`, lädt kein `app.js`), sonst bleibt die Löschung blockiert.

---

## 7. Design-Recherche & finale Optik (umgesetzt, dritte Runde, mehrere Iterationen)

Auf Nutzerwunsch online nach Design-Trends für Fitness-/Trainings-Apps recherchiert
(Dribbble, Mobbin, GitHub-Themen „fitness-tracker", Bento-Grid-Trend 2026). Kernaussagen:
dunkle, fast schwarze Flächen (~#0B0B0F) mit **genau einer** kräftigen Akzentfarbe,
**große Zahlen** für Live-Werte, **Bento-Grid-Sektionen** (abgegrenzte Kacheln, 12–24px
Radius) — deckt sich mit dem Block-Karten-Layout.

**Karten-Optik:** Drei Richtungen als Vergleichs-Mockup gegenübergestellt (Artifact
https://claude.ai/artifact/DEPd9BAV6CWV5CZYDK12Er, privat): Bento Minimal (Akzentfarbe
pro Block), High-Contrast Numeric (sehr große Gewichtszahl, Rest gedämpft) und Soft
Depth (weicher Schatten, heller Verlauf, großer Radius, einfarbig). Entscheidung: **Soft
Depth als Basis**, kombiniert mit der Zahlenhierarchie aus High-Contrast Numeric —
einfarbig geblieben (weiterhin `--acc2`), keine Akzentfarbe pro Block.

**Zeilen-Layout:** Ursprünglich Name+Hinweis/Sätze links, Gewicht rechts, Haken als
eigene Zeile darunter — dem Nutzer zu gequetscht und nicht spaltenbündig (unterschiedlich
breite Elemente je Zeile). Mehrere Iterationen (Artifact
https://claude.ai/artifact/FFhQNS3eiCGeZXfRKwRE2S, privat, 6 Versionen durchlaufen) bis
zur finalen Form:
- Sätze wandern aus der Zeile in die Block-Überschrift („Block A · 3 Sätze") — dafür
  müssen Sätze **innerhalb eines Blocks einheitlich** sein; Ausreißer wurden auf Wunsch
  des Nutzers vereinheitlicht (Beinpresse einbeinig 4→3, Hip Thrust 4→3, Seated Leg Curl
  2–3→3, Hyperextensions 2–3→3, siehe `SEED_PLANS`).
  Wiederholungen und Gewicht zu einer Pille kombiniert („5–8 × 57,5 kg"), nur die
  Gewichtszahl ist ein echtes `<input>`, Wdh./Einheit sind Text.
- Der Haken ist jetzt **in** der Pille integriert, per senkrechtem Strich abgetrennt
  (`.fp-tgl`, eigenes Bauteil mit gemeinsamem Rahmen) — keine eigene Zeile mehr.
- **Ganze Karte ist ein CSS-Grid** (`.blk-card{display:grid;grid-template-columns:1fr
  auto auto}`), nicht mehr Flex pro Zeile — dadurch sind Badge- und Pillen-Spalte über
  alle Zeilen einer Karte automatisch gleich breit (Grid nimmt die Breite des breitesten
  Inhalts je Spalte), ohne feste Pixelwerte. Der ↑-Badge (letztes Mal geschafft) hat eine
  eigene Spalte **vor** der Pille, verschiebt sie dadurch nie, ob vorhanden oder nicht.
- Exemplarisch bei ungetrackten Übungen (kein Gewicht, z.B. Band Pull-Aparts) geprüft:
  Entscheidung „ohne Pille" — nur Text, nicht fett wie ein Wert, sondern **gleiche
  Schriftgröße/-farbe wie die Wdh.-Angabe** in den Pillen der anderen Zeilen (12,5px,
  gedämpft) — macht optisch klar, dass hier nichts editierbar ist. Der Übungsname selbst
  bleibt fett wie überall.
- Mehr Innenabstand pro Übung (13px → 17px) auf Wunsch, wirkte vorher zu eng.
- Wording des Hakens: **nur ein Pfeil-Icon** (↑), kein Text mehr — der Pfeil ist dieselbe
  Metapher wie der bestehende ↑-Badge, spart Platz in der schmalen Pille. Fachlich
  bedeutet der Haken weiterhin nur „soll das Gewicht beim nächsten Mal steigen" (`done`
  im Datenmodell, unverändert).
- Exemplarisch geprüft, dass der Pop-Effekt beim Antippen (Größenänderung per
  `transform:scale`) nichts verschiebt: Animation betrifft nur die Skalierung, kein
  Reflow, plus genug `gap` zu Nachbarelementen — dafür extra als echte, klickbare
  Checkbox im Mockup gebaut statt nur statisch gezeigt.

**Weitere Inhalts-Anpassungen (auf Wunsch, zusammen mit dem Layout):**
- „Tag A"/„Tag B" → „Trainingseinheit 1"/„Trainingseinheit 2".
- „Beinpresse einbeinig (≤90°)" → Name „Beinpresse einbeinig", `≤90°` wandert in den
  Hinweistext. Gleiches Prinzip bei „Kabel-Außenrotation (90/90)" → Hinweis „90/90, …"
  (nicht explizit vom Nutzer genannt, aber dieselbe Systematik — Winkel-/ROM-Angaben in
  Klammern raus aus dem Namen, rein in den Hinweis; Geräte-/Ausrüstungs-Kürzel wie
  „(Maschine)", „(KH)" bleiben im Namen, da Teil der Identifikation, kein Zusatzhinweis).

**Migration für Bestandsinstallationen:** Da `ensureSeed()` nie an vorhandenen Plänen/
Übungen rührt, würden diese Änderungen bei bereits laufenden Installationen (wie der des
Nutzers, die noch „Tag A/B" mit separatem „Finisher"-Block und einer selbst
hinzugefügten Übung hatte) nie ankommen. `ensureMigration()` (siehe Abschnitt 3) holt das
einmalig nach, ohne eigene Ergänzungen des Nutzers anzufassen.

---

## 8. Deployment

Läuft produktiv über **GitHub Pages**: Repo `aschowtjak/gym-log` (öffentlich, enthält nur
Code, keine Trainingsdaten), Pages-Quelle Branch `master`, Verzeichnis `/` (root). Solange
PR #1 offen ist, wirkt sich `git push` auf den Feature-Branch **nicht** auf die live
Seite aus — die baut nur aus `master`. Erst nach dem Mergen von PR #1 nach `master` zieht
GitHub Pages automatisch nach; danach am Handy zweimal öffnen (Service-Worker-Cache, siehe
Abschnitt 6). Wer den neuen Stand vorher testen will: lokal `python -m http.server 8099`
auf dem `block-cards-and-stopwatch`-Branch, oder `gh pr checkout 1`.

Am Handy: https://aschowtjak.github.io/gym-log/ in Chrome öffnen → ⋮ → „App
installieren". Alle Trainingsdaten liegen ausschließlich im Browser des Geräts (IndexedDB).
Backups laufen über Menü → „Backup exportieren" (JSON) — das ist auch der Weg auf ein
neues Handy.

Alternativen, falls das Repo mal nicht die richtige Wahl ist: **Netlify Drop**
(https://app.netlify.com/drop, Ordner reinziehen, sofortige URL, kein Git nötig) oder
lokal im Heim-WLAN (`python -m http.server 8099`, ohne HTTPS aber ohne Installierbarkeit).

---

## 9. Vierte Runde (22.09., Abend): Verlauf/Charts, Haken-Reset, Datum, Verlauf-Seite (erledigt)

Drei Wünsche aus der Design-Session, diesmal echte Funktionsänderungen statt Styling.
Alle drei sind umgesetzt und im Browser-Pane (412×915) durchgespielt; Details/Codestellen
stehen jetzt direkt in Abschnitt 3 (UI) und Abschnitt 5 (fachliche Festlegungen). Kurz
zusammengefasst, inkl. der Klärungen mit dem Nutzer vor dem Coden:

**A) Verlaufs-Chart entschlackt.** Vorher zur Wahl gestellt (Entwurfs-Artifact mit
Kurve mit/ohne Marker, je simuliert über 5 und 10 Datenpunkte): Nutzer hat sich für
**„nur Linie"** entschieden. Umgesetzt: `js/chart.js` zeichnet keine Punkte/Hit-Targets
mehr (`dots`/`hits` komplett entfernt), `seriesFor()` liefert kein `c`/`label` mehr
(unbenutzt). Die Status-Spalte (✓/✗) ist aus der Tabelle raus. Zusätzlich (Nutzerwunsch
aus derselben Rückfrage, nicht ursprünglich geplant): die Tabelle ist jetzt ein
scrollbares Fenster (`.histtab-wrap`, `max-height:220px`, `th` sticky) statt einer
unbegrenzt wachsenden Liste.

**B) Haken bleiben nach dem Speichern erhalten, Datum editierbar, rückwirkendes
Bearbeiten.** Vor dem Coden geklärt: **ein** Mechanismus für beides, keine getrennte
Ansicht — das Datumsfeld/Dropdown auf der Hauptseite ist zugleich der Editor für
vergangene Einheiten (siehe Abschnitt 3, Abschnitt 5 Punkt 5+6). Kernstück ist
`curDateFor(planId)` + das `_date`-Feld im Draft (`ensureDraft()` baut nur bei
Datumswechsel neu auf) — macht Haken-Persistenz und rückwirkendes Bearbeiten zum
selben Mechanismus, ohne Sonderfälle.

**C) Verlauf-Seite neu.** Vor dem Coden geklärt (alle drei Empfehlungen bestätigt):
ersetzt die bisherige Verlauf-Ansicht im Menü (keine neue Hauptseiten-Sektion), zeigt
alle Übungen des gewählten Plans automatisch als Kartenraster (keine Auswahl/Suche
nötig), Filter „Letzte 10" zählt pro Übung (nicht global). Umgesetzt als
Plan-Umschalter + Filter-Chips + `chartCard()`-Karten pro Übung, siehe Abschnitt 3.
Das frühere „Pläne oben, Charts darunter" aus dem Auftrag wurde als Plan-**Umschalter**
oben auf der eigenständigen Verlauf-Seite interpretiert (nicht als Verschmelzung mit
der Hauptseiten-Gewichtsübersicht) — passt zur Entscheidung, die bisherige Ansicht zu
ersetzen statt die Hauptseite zu verlängern.

Keine offenen Punkte aus dieser Runde. Mögliche Folgethemen, die im Gespräch nicht
explizit gefordert, aber durch die Umsetzung nahegelegt wurden (nicht angefangen):
Löschen einzelner Übungen innerhalb einer Einheit (aktuell weiterhin nur ganze Einheit),
und ob der `1-Monat`-Filter mit Kalendermonaten statt „30 Tage" rechnen soll.
