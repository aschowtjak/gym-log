# Prompt für die nächste Session (Verlauf, Datum, Haken-Verhalten)

Alles zwischen den Linien in einen neuen Chat kopieren. Arbeitsverzeichnis vorher auf
`D:\Claude Code\Fitness App` setzen.

---

Im Verzeichnis `D:\Claude Code\Fitness App` liegt „Gym Log", eine lauffähige Trainings-PWA
(Plain HTML/CSS/JS, IndexedDB, Service Worker, kein Build, keine Abhängigkeiten,
deutschsprachig, Dark Theme, Mobile-First, Zielgerät Android/Pixel 7a/8). **Lies zuerst
`HANDOVER.md`** — dort stehen Aufbau, Datenmodell, fachliche Festlegungen und
Stolperfallen, insbesondere **Abschnitt 9** („Nächste Session: Verlauf/Charts,
Haken-Reset, Datum, Verlauf-Seite") — dort stehen zu allen drei Aufgaben unten schon die
genauen Code-Stellen (Datei + Zeile), nicht neu suchen.

**Wichtig:** Es gibt bereits einen offenen Pull Request —
[github.com/aschowtjak/gym-log/pull/1](https://github.com/aschowtjak/gym-log/pull/1),
Branch `block-cards-and-stopwatch` → `master`, noch nicht gemerged. Als Erstes auf diesen
Branch wechseln (`git checkout block-cards-and-stopwatch`, ggf. vorher `git fetch`). Die
live auf GitHub Pages laufende Version baut aus `master` und zeigt deshalb noch nicht
diesen Stand. Anders als in der letzten Session geht es diesmal **nicht** nur um Design —
alle drei Punkte unten ändern echtes Verhalten/Datenfluss. Änderungen als weitere Commits
auf **demselben Branch** (`block-cards-and-stopwatch`) pushen, damit sie in PR #1
erscheinen — keinen neuen Branch/PR aufmachen, nicht auf `master` committen. Der PR bleibt
offen, bis der Nutzer freigibt (dann selbst mergen oder explizit darum bitten).

## Aufgabe

Der Nutzer hat drei Wünsche genannt, in dieser Reihenfolge besprochen. Größe und
Kopplung sind unterschiedlich — am Anfang der Session kurz mit dem Nutzer klären, ob alle
drei in eine Sitzung passen oder er reihum priorisieren will.

### A) Verlaufs-Chart entschlacken

Beim Aufklappen einer Übung (Historie) ist der Status momentan doppelt vorhanden: einmal
als eigene Tabellenspalte (✓/✗), einmal als rote Punktfarbe im Chart bei „nicht
geschafft". Der Nutzer will beides raus — die Info geht aus dem Kurvenverlauf ohnehin
hervor (steigt das Gewicht nicht, war es nicht geschafft). Genaue Fundstellen in
HANDOVER Abschnitt 9, Punkt A.

**Bevor du Code änderst:** Baue ein Entwurfs-Artifact mit zwei Varianten (Kurve mit
Punkten/Markern vs. nur die Linie ohne Punkte), jede davon einmal mit ~10 und einmal mit
~20 Wochen simulierten Trainingsdaten (bei zwei Einheiten im Wechsel sind das grob 5 bzw.
10 Datenpunkte pro Übung) — der Nutzer will sehen, wie es bei mehr Datenpunkten wirkt,
bevor er sich für eine Variante entscheidet. Erst nach seiner Wahl `js/chart.js` und
`seriesFor()`/`historyBox()` in `js/app.js` anpassen.

### B) Haken bleiben nach dem Speichern erhalten, Datum wird editierbar

Aktuell wirken die Haken nach „Einheit speichern" zurückgesetzt, weil der Draft beim
Speichern verworfen und beim nächsten Rendern immer mit `done: false` neu aufgebaut wird
(genaue Zeilen in HANDOVER Abschnitt 9, Punkt B). Gewünschtes Verhalten: Haken bleiben
nach dem Speichern angehakt, ein Reset passiert erst, wenn eine neue Einheit an einem
**anderen Datum** begonnen wird — nicht bei jedem erneuten Speichern desselben Tages.

Zusätzlich, im selben Themenblock:
- Das Datum der Einheit soll **editierbar** sein (heute vorausgewählt, aber änderbar) —
  aktuell ist es hart auf `todayISO()` verdrahtet, keine Auswahl im UI.
- Ein **Dropdown, um vergangene Trainings zu öffnen** und dort rückwirkend Werte zu
  ändern (aktuell ist die Verlauf-Detailansicht rein lesend, nur „ganze Einheit
  löschen" ist möglich).

Das berührt den Kern-Datenfluss (`ensureDraft`/`lastLog`/`saveWorkout` gehen aktuell
implizit von „heute" aus) — vor dem Coden kurz mit dem Nutzer klären, wie Datumsauswahl
und rückwirkendes Bearbeiten zusammenhängen sollen (z.B.: wechselt man beim Datum
ändern in einen „Bearbeitungsmodus" derselben Hauptseite, oder ist das eine eigene
Ansicht?). Das ist eine Datenfluss-Frage, keine reine Geschmacksfrage — lohnt sich, mit
`AskUserQuestion` zu klären statt zu raten.

### C) Verlauf-Seite neu: Pläne oben, Charts + Filter darunter

Der Nutzer stellt sich die Verlauf-Ansicht anders vor als die aktuelle (flache, nach
Monat gruppierte Liste gespeicherter Einheiten). Gewünscht: Plan-/Gewichtsübersicht
bleibt oben, **darunter** ein Verlaufs-Bereich, der direkt die **Fortschritts-Charts pro
Übung** zeigt (dieselbe Chart-Komponente, die aktuell nur beim Aufklappen einer
einzelnen Übungszeile erscheint) — nicht mehr nur eine Liste vergangener Sitzungen zum
Reintippen. Dazu Filter: „letzte 10 Trainingseinheiten" sowie Zeitraum gesamt / 12 / 6 /
2 / 1 Monate, um den aktuellen Fortschritt einzugrenzen.

Größte strukturelle Änderung der drei. Vor dem Umsetzen mit dem Nutzer klären (auch
hier eher `AskUserQuestion` als raten):
- Wird das eine neue Sektion auf der Hauptseite (durchgehend scrollbar) oder ersetzt es
  die bisherige „Verlauf"-Ansicht im Menü?
- Zeigt es alle Übungen gleichzeitig als Kartenraster, oder gibt es eine
  Übungs-Auswahl/-Suche?
- Gilt der Filter „letzte 10 Trainingseinheiten" pro Übung oder global über alle?

## Rahmen

- Keine neuen Abhängigkeiten, kein Build-Schritt, weiterhin offlinefähig und installierbar.
- Datenmodell darf sich ändern, wo nötig (z.B. für editierbares Datum/rückwirkendes
  Bearbeiten) — anders als in der letzten Session ist das hier kein Design-only-Auftrag.
  Migrationsbedarf für bestehende Nutzerdaten mitdenken (siehe `ensureMigration()` in
  `js/app.js` als Vorbild aus der letzten Runde, falls z.B. `workouts`-Einträge ein neues
  Feld brauchen).
- Für A) und ggf. C) (Chart-Darstellung) lohnt sich ein kurzes Mockup/Artifact vor dem
  Code, wie in der letzten Session — für B) und C) eher `AskUserQuestion` zu offenen
  Datenfluss-/Struktur-Fragen als stillschweigend zu entscheiden.
- Vor Abschluss im Browser-Pane bei **412 × 915** (nicht 375 × 812 — das ist iPhone-Maß,
  siehe HANDOVER Abschnitt 6) durchspielen: beide Trainingseinheiten, Historie aufklappen,
  Speichern (auch zweimal am selben Tag testen), Datum ändern, rückwirkend bearbeiten,
  neue Verlauf-Seite mit allen Filtern. Service-Worker-Cache vorher löschen (Code in
  HANDOVER Abschnitt 6), sonst testest du die alte Version. `sw.js`-`CACHE`-Version bei
  jeder Auslieferung hochzählen. Beim Testen mit `javascript_tool`/`fetch` unbedingt
  HANDOVER Abschnitt 6 zu Cache-Tücken im Browser-Pane beachten (Cache-Buster auf die
  HTML-Dokument-URL selbst, nicht nur auf `<script>`-Pfade; `indexedDB.deleteDatabase()`
  promise-wrappen und vorher auf eine Seite ohne offene DB-Verbindung navigieren).
- `README.md` und `HANDOVER.md` am Ende an den neuen Stand anpassen.
- Commits gehen auf den Branch `block-cards-and-stopwatch` (PR #1), nicht auf `master`.
  Den PR nicht selbst mergen, außer der Nutzer bittet ausdrücklich darum.
