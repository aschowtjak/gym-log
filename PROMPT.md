# Prompt für die nächste Session (Alex' Trainingsplan integrieren)

Alles zwischen den Linien in einen neuen Chat kopieren. Arbeitsverzeichnis vorher auf
`D:\Claude Code\Fitness App` setzen.

---

Im Verzeichnis `D:\Claude Code\Fitness App` liegt „Gym Log", eine lauffähige Trainings-PWA
(Plain HTML/CSS/JS, IndexedDB, Service Worker, kein Build, keine Abhängigkeiten,
deutschsprachig, Dark Theme, Mobile-First, Zielgerät Android/Pixel 7a/8). **Lies zuerst
`HANDOVER.md`** — dort stehen Aufbau, Datenmodell, fachliche Festlegungen und
Stolperfallen, insbesondere **Abschnitt 9** (vierte Runde: Verlauf/Charts, Haken-Reset,
Datum, Verlauf-Seite, Profile) für den technischen Hintergrund von Profilen/Plänen.

**Wichtig:** Es gibt bereits einen offenen Pull Request —
[github.com/aschowtjak/gym-log/pull/1](https://github.com/aschowtjak/gym-log/pull/1),
Branch `block-cards-and-stopwatch` → `master`, noch nicht gemerged. Als Erstes auf diesen
Branch wechseln (`git checkout block-cards-and-stopwatch`, ggf. vorher `git fetch`). Die
live auf GitHub Pages laufende Version baut aus `master` und zeigt deshalb noch nicht
diesen Stand. Änderungen als weitere Commits auf **demselben Branch** pushen, damit sie in
PR #1 erscheinen — keinen neuen Branch/PR aufmachen, nicht auf `master` committen. Der PR
bleibt offen, bis der Nutzer freigibt.

## Ausgangslage

Es gibt zwei Profile: **Sarah** (fertig, zwei Pläne „Trainingseinheit 1/2") und **Alex**
(bisher ein leeres Platzhalter-Profil ohne Plan, siehe `SEED_PROFILES`/`SEED_PLANS` in
`js/seed.js`). Der Nutzer hat jetzt Alex' Trainingsplan geliefert (unten, wörtlich
übernommen) — die Aufgabe dieser Session ist, ihn als Seed-Daten einzutragen.

## Aufgabe

### 1. Alex' Plan in `SEED_PLANS` eintragen

Der Nutzer hat zwei Trainingstage genannt (analog zu Sarahs „Trainingseinheit 1/2" —
vermutlich zwei eigene Pläne unter dem Profil `'Alex'`, working-Namen unten aus den
Tag-Überschriften abgeleitet, mit dem Nutzer kurz bestätigen). Rohdaten, so wie geliefert:

**Tag A – Montag (Kraft und Sehne)**

| Block | Übung | Sätze × Wdh. | Hinweis |
|---|---|---|---|
| 1 | Beinpresse | 4 × 15 | 3 s runter, 3 s hoch; Becken darf sich nicht einrollen |
| 1 | Bankdrücken flach | 3 × 6–8 | 2 Wdh. vor dem Versagen aufhören, Griff etwas enger |
| 1 | Big 3 im Wechsel | 1 Übung pro Satz | 6 × 10 s |
| 2 | Bulgarian Split Squat mit Kurzhanteln | 3 × 16 | 3 s runter, 3 s hoch |
| 2 | Latzug am Kabel | 3 × 8–10 | – |
| 2 | Beinbeuger sitzend | 3 × 10–12 | – |
| 3 | Hip Thrust | 3 × 8–10 | Langhantel oder Maschine |
| 3 | Außenrotation am Kabel | 3 × 12–15 | Oberarm am Körper, Handtuch unter dem Ellbogen |
| 3 | Einbeiniges Wadenheben | 3 × 10–15 | abwechselnd mit gestrecktem und gebeugtem Knie |

**Tag B – Mittwoch (Power)**

| Block | Übung | Sätze × Wdh. | Hinweis |
|---|---|---|---|
| 1 | Beinpresse → Box Jump bzw. Jump & Reach | 3 × 6–8 → 60–90 s Pause → 3 × 3 | Kontrastpaar; Sprung maximal hoch |
| 1 | Rudern am Kabel | 3 × 8–10 | neu in Block 1 |
| 2 | Sprung mit Kurzhanteln oder Trap Bar | 3 × 3 | leichtes Gewicht, maximale Höhe, vor jeder Wdh. neu ansetzen |
| 2 | Schrägbank 15–30° | 3 × 8–10 | beim ersten Mal auf Schulterschmerz testen |
| 2 | Pallof Press | 3 × 10 pro Seite | neu in Block 2 |
| 3 | Hyperextension | 3 × 10–12 | Rücken neutral, Bewegung nur aus der Hüfte |
| 3 | Bizeps-Curls mit Kurzhanteln | 3 × 10–12 | – |
| 3 | Y-Raises | 3 × 12 | 1–3 kg, mit der Brust auf der Schrägbank |

**Vor dem Eintragen klären (`AskUserQuestion`, nicht raten — das ist echter
Trainingsplan-Inhalt, ein Fehler hier ist beim nächsten Training spürbar, nicht nur
kosmetisch):**

- **Block-Codes:** Das Datenmodell gruppiert Übungen über `grpKey()` in `js/app.js`
  (Regex `/^[A-Za-z]\d+$/`) zu „Block A/B/C" — ein reiner `1`/`2`/`3`-Code wie in der
  Rohtabelle matcht diese Regex **nicht** und würde als eigener, falsch benannter
  Block landen. Vermutlich `1`→`A1`/`A2`/`A3`, `2`→`B1`/`B2`/`B3`, `3`→`C1`/`C2`/`C3`
  (analog zu Sarahs Plänen) — mit dem Nutzer bestätigen, bevor `SEED_PLANS` geschrieben
  wird.
- **„Big 3 im Wechsel"** (Tag A, Block 1): passt nicht ins Schema „eine Übung = eine
  Zeile mit Sätze×Wdh." — „1 Übung pro Satz" + „6 × 10 s" klingt nach einem Zirkel aus
  mehreren Übungen im Wechsel. Nachfragen, was „Big 3" konkret enthält (die drei
  Einzelübungen? McGill Big 3 — Curl-up, Side Plank, Bird Dog?) und ob das als **drei**
  eigene Plan-Zeilen (mit `unit:'s'` wie Side Plank bei Sarah) oder als **eine**
  Sammel-Zeile mit Hinweistext eingetragen werden soll.
- **Kontrastpaar „Beinpresse → Box Jump bzw. Jump & Reach"** (Tag B, Block 1): kombiniert
  zwei Übungen mit unterschiedlichem Sätze×Wdh.-Schema (3×6–8 Beinpresse, dann Pause,
  dann 3×3 Sprung) in einer Tabellenzeile. Das Datenmodell kennt nur eine
  Sätze/Wdh.-Angabe pro `exerciseId` — vermutlich als **zwei** Plan-Zeilen eintragen
  (Beinpresse 3×6–8, Box Jump/Jump & Reach 3×3), mit dem Kontrastpaar-Zusammenhang nur
  im Hinweistext der zweiten Zeile vermerkt. Mit dem Nutzer bestätigen.
- **„3 × 16" bei Bulgarian Split Squat** (Tag A, Block 2): in der Rohtabelle stand hier
  ein Gedankenstrich vor dem Hinweistext („3 × 16 - 3 s runter, 3 s hoch"), oben schon
  als Sätze×Wdh. `3 × 16` und Hinweis `3 s runter, 3 s hoch` interpretiert (passt zum
  Beinpresse-Eintrag direkt darüber) — beim Nutzer gegenprüfen, dass das stimmt und
  nicht z.B. `3 × 16` pro Seite gemeint war.
- **„3 × 10 pro Seite" bei Pallof Press:** nach der Rückmeldung aus Teil 2/3 dieser Runde
  (Dead Bugs' „/S." wurde entfernt, weil „selbstverständlich") vermutlich auch hier
  `targetReps: '10'` ohne „pro Seite"-Zusatz — aber das ist Interpretation, nicht vom
  Nutzer explizit gesagt für diesen neuen Plan. Kurz gegenprüfen statt automatisch
  gleich zu behandeln.
- **Plan-/Tagesnamen:** Reicht „Kraft und Sehne" / „Power" (aus den Tag-Überschriften),
  oder soll der Wochentag mit rein (wie bislang nirgends im Datenmodell vorkommt — Sarahs
  Pläne haben keinen Wochentag-Bezug)?
- **Neue Übungen im Katalog:** Einige Übungsnamen kommen in `SEED_EXERCISES` noch nicht
  vor (z.B. „Beinpresse" ohne Zusatz — zu unterscheiden von Sarahs „Beinpresse
  einbeinig", „Bulgarian Split Squat mit Kurzhanteln", „Box Jump", „Jump & Reach",
  „Sprung mit Kurzhanteln oder Trap Bar", „Schrägbank 15–30°", „Pallof Press",
  „Y-Raises" …) — als neue Zeilen in `SEED_EXERCISES` ergänzen, `unit` passend wählen
  (`kg` für Gewichtsübungen, `s` nur falls zeitbasiert wie bei „Big 3", `x` falls ohne
  Gewicht/nur Körperspannung, z.B. Pallof Press könnte auch Kabelzug-Gewicht haben —
  klären statt raten).

Nach Klärung: neuen Eintrag `['Alex', '<Planname Tag A>', [...]]` und `['Alex',
'<Planname Tag B>', [...]]` in `SEED_PLANS` (`js/seed.js`) ergänzen (gleiches
`[Block, Übung, Sätze, Wiederholungen, Hinweis]`-Zeilenformat wie bei Sarah), fehlende
Übungen in `SEED_EXERCISES` ergänzen, `SEED_VERSION` (aktuell 4) hochzählen. Keine neue
Migrationsstufe nötig — Alex' Profil existiert schon, `ensureSeed()` legt fehlende Pläne
für ein bestehendes Profil normal an (siehe `ensureSeed()` in `js/app.js`).

### 2. Ohne Demo-Daten testen — mit dem Nutzer klären

Der Nutzer will die App jetzt **wirklich** zum Trainieren benutzen und dabei ohne
Demodaten testen. Aktuell erzeugt `ensureDemo()` (`js/app.js`) bei jeder komplett neuen
Installation automatisch acht fiktive Einheiten (siehe Abschnitt 4 in `HANDOVER.md`) —
das war zum Vorführen/Entwickeln gedacht, ist aber jetzt möglicherweise nicht mehr
gewünscht, wo echte Trainingsdaten entstehen. **Vorher klären, nicht annehmen:**
- Reicht es, für den PC-/Handy-Test die Demodaten einmalig zu löschen (Menü → „Demodaten
  löschen", bereits vorhanden), oder soll `ensureDemo()` grundsätzlich abgeschaltet /
  entfernt werden, weil die App jetzt produktiv genutzt wird?
- Falls nur für den Test: reicht `indexedDB.deleteDatabase('gymlog')` + Neuladen vor dem
  PC-Test (siehe HANDOVER Abschnitt 6), damit unmittelbar mit Sarahs und Alex' echten,
  leeren Plänen gestartet wird?

### 3. Ablauf laut Nutzer

1. Integration am PC im Browser-Pane zeigen und durchspielen (beide Profile, alle
   Pläne, Datum/rückwirkendes Bearbeiten, Verlauf-Seite — siehe Testschritte unten).
2. Erst wenn der Nutzer das am PC bestätigt: Deployment/Test **am Handy** unterstützen
   (Netlify Drop oder PR-Merge nach `master` für GitHub Pages, je nachdem was der Nutzer
   zu diesem Zeitpunkt will — vorher fragen, nicht selbst entscheiden, siehe
   `HANDOVER.md` Abschnitt 8 für die Optionen).
3. Der Nutzer will danach direkt damit trainieren — also wirklich fehlerfrei und mit
   den *richtigen* Zahlen aus der Tabelle oben, keine Platzhalter.

## Rahmen

- Keine neuen Abhängigkeiten, kein Build-Schritt, weiterhin offlinefähig und installierbar.
- Vor Abschluss im Browser-Pane bei **412 × 915** (nicht 375 × 812, siehe HANDOVER
  Abschnitt 6) durchspielen: Profil-Umschalter (beide Profile), alle vier Pläne (Sarah ×2,
  Alex ×2), Block-Gruppierung korrekt (Block A/B/C, nicht „Block 1/2/3" oder
  ungruppiert), Historie/Chart je Übung, Speichern, Verlauf-Seite mit Filtern für Alex'
  Pläne. Service-Worker-Cache vorher löschen (Code in HANDOVER Abschnitt 6), sonst
  testest du die alte Version. `sw.js`-`CACHE`-Version bei jeder Auslieferung hochzählen.
- **Browser-Pane-Cache ist in dieser App-Historie wiederholt hartnäckig gewesen** — lies
  HANDOVER Abschnitt 6 zu den dort dokumentierten Workarounds (Cache-Buster auf die
  HTML-Dokument-URL, im Zweifel zusätzlich kurzzeitig einen Query-String an die
  `<script src>`-Tags in `index.html` hängen und danach wieder entfernen; Vorsicht bei
  `indexedDB.deleteDatabase()` — promise-wrappen und vorher auf eine Seite ohne offene
  DB-Verbindung navigieren, sonst blockiert eine hängengebliebene alte Verbindung jeden
  weiteren Versuch, die DB neu zu öffnen).
- `README.md` und `HANDOVER.md` am Ende an den neuen Stand anpassen (Alex' Plan ist dann
  kein offener Punkt mehr).
- Commits gehen auf den Branch `block-cards-and-stopwatch` (PR #1), nicht auf `master`.
  Den PR nicht selbst mergen, außer der Nutzer bittet ausdrücklich darum.
