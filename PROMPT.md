# Prompt für die nächste Session (Design)

Alles zwischen den Linien in einen neuen Chat kopieren. Arbeitsverzeichnis vorher auf
`D:\Claude Code\Fitness App` setzen.

---

Im Verzeichnis `D:\Claude Code\Fitness App` liegt „Gym Log", eine lauffähige Trainings-PWA
(Plain HTML/CSS/JS, IndexedDB, Service Worker, kein Build, keine Abhängigkeiten,
deutschsprachig, Dark Theme, Mobile-First, Zielgerät Android/Pixel 7a/8). **Lies zuerst
`HANDOVER.md`** — dort stehen Aufbau, Datenmodell, fachliche Festlegungen und
Stolperfallen, insbesondere Abschnitt 7 („Design-Recherche & drei Richtungsvorschläge").

**Wichtig:** Es gibt bereits einen offenen Pull Request —
[github.com/aschowtjak/gym-log/pull/1](https://github.com/aschowtjak/gym-log/pull/1),
Branch `block-cards-and-stopwatch` → `master`, noch nicht gemerged. Als Erstes auf diesen
Branch wechseln (`git checkout block-cards-and-stopwatch`, ggf. vorher `git fetch`). Die
live auf GitHub Pages laufende Version baut aus `master` und zeigt deshalb noch den
Stand **vor** diesem PR. In dieser Session geht es ausschließlich um **Design**, nicht um
neue Funktionen — Struktur, Datenmodell und Features bleiben wie sie sind. Änderungen als
weitere Commits auf **demselben Branch** (`block-cards-and-stopwatch`) pushen, damit sie
in PR #1 erscheinen — keinen neuen Branch/PR aufmachen, nicht auf `master` committen.
Der PR bleibt offen, bis der Nutzer den fertigen Look freigibt (dann selbst mergen oder
explizit darum bitten).

## Aufgabe

In der letzten Session wurden drei CSS-Richtungen für die Block-Karten der
Plan-/Gewichtsübersicht recherchiert und als Mockup gegenübergestellt:

1. **Bento Minimal** — größerer Radius (20px), je Block A/B/C eine eigene Akzentfarbe
   für die Überschrift statt überall Blau.
2. **High-Contrast Numeric** — die Gewichtszahl wird sehr groß und ist der visuelle
   Fokus, alles drumherum bewusst gedämpft.
3. **Soft Depth** — weicher Schatten statt harter Kante um die Block-Karten, minimal
   hellerer Karten-Verlauf, großer Radius, einfarbig.

Das Vergleichs-Mockup liegt hier: **https://claude.ai/artifact/DEPd9BAV6CWV5CZYDK12Er**
(privat). Zeig es dem Nutzer zu Beginn der Session (oder frag, ob er es schon gesehen hat)
und kläre, welche Richtung er will — auch eine Mischung ist möglich. Setze die gewählte
Richtung dann in `css/style.css` um (betrifft vor allem `.blk-card`, `.blk-h`, `.ex-weight`,
`.wnum`/`.winp input`, ggf. neue CSS-Variablen für Block-Akzentfarben).

Danach den offenen Punkt aus der letzten Runde aufgreifen: der **„alles geschafft"-Haken**
gefällt dem Nutzer optisch nicht. Zur Diskussion standen — jetzt, wo die Block-Karten-Optik
feststeht, lässt sich das konkret entscheiden:

- Haken durch eine antippbare Pill ersetzen, die sich grün färbt.
- Gedrückthalten mit Fortschrittsanimation (kein Bibliotheks-Bedarf, plain
  `touchstart`/`touchmove`/`touchend` + Timer).
- Haken beibehalten, nur visuell abgespeckt (kleiner, dezenter, ohne eigenen Rahmen).

Frag den Nutzer, welche Richtung er will, bevor du das umsetzt — das ist eine
Geschmacksfrage, kein technisches Detail.

## Rahmen

- Keine neuen Abhängigkeiten, kein Build-Schritt, weiterhin offlinefähig und installierbar.
- Nur CSS-/Markup-Änderungen, keine neue Logik nötig (Datenmodell, `js/app.js`-Funktionen
  bleiben wie sie sind, außer die Markup-Erzeugung in `planRow()`/`viewMain()` muss
  angepasst werden, falls die gewählte Richtung neue Klassen braucht).
- Vor Abschluss im Browser-Pane bei **412 × 915** (nicht 375 × 812 — das ist iPhone-Maß,
  siehe HANDOVER Abschnitt 6) durchspielen: beide Tage, Historie aufklappen, Speichern,
  Stoppuhr. Service-Worker-Cache vorher löschen (Code in HANDOVER Abschnitt 6), sonst
  testest du die alte Version. `sw.js`-`CACHE`-Version bei jeder Auslieferung hochzählen.
- `README.md` und `HANDOVER.md` am Ende an den neuen Stand anpassen.
- Commits gehen auf den Branch `block-cards-and-stopwatch` (PR #1), nicht auf `master`.
  Den PR nicht selbst mergen, außer der Nutzer bittet ausdrücklich darum.
