# Gym Log

Beim Training am Handy sofort sehen, mit welchem Gewicht jede Übung heute dran ist —
abgeleitet aus der letzten Einheit. Installierbare Web-App (PWA), läuft offline im
Studio, alle Daten bleiben auf dem Gerät (IndexedDB), kein Account, kein Server.

**Live:** https://aschowtjak.github.io/gym-log/

## Das Prinzip

Das Arbeitsgewicht der nächsten Einheit ergibt sich vollständig aus der letzten:
Gewicht plus die Information, ob alle Sätze mit allen Wiederholungen geschafft wurden.
War alles geschafft, wird beim nächsten Mal erhöht — **um wie viel, entscheidest du
selbst und tippst es manuell ein.** Die App rechnet nichts hoch und schlägt keine
Schrittweite vor.

## Eine Seite

- Im Topbar ein Icon **Profil wechseln** (⇄, neben Stoppuhr und Menü) — Profile
  gruppieren komplett eigene Sätze von Trainingsplänen (z.B. verschiedene
  Trainingsphasen), jedes Profil hat seinen eigenen Tagesumschalter darunter.
- Darunter ein Umschalter **Trainingseinheit 1 / 2** (Pläne des aktuellen Profils).
  Direkt darunter ein **editierbares Datum** (heute vorausgewählt, springt beim
  Verlassen der Hauptseite wieder auf heute) plus ein Dropdown mit vergangenen
  Einheiten dieses Plans — beides setzt dasselbe Datum. Ist ein anderes Datum als heute
  gewählt, zeigt die Seite genau diese Einheit zum **rückwirkenden Bearbeiten**: Felder
  füllen sich mit den damals gespeicherten Werten, „Einheit speichern" überschreibt sie.
  Ein „heute"-Link führt zurück.
- Darunter je Block (A/B/C) eine eigene Karte mit ihren Übungen, Sätze stehen einmal
  in der Block-Überschrift („Block A · 3 Sätze"). Pro Übung: Name (+ Hinweistext),
  daneben eine Pille mit Wiederholungen × Gewicht (nur die Zahl ist editierbar) und
  ein Pfeil-Haken direkt in der Pille — antippen markiert „nächstes Mal steigern",
  füllt sich grün. Der zweite, gedämpfte Pfeil links davon (falls vorhanden) zeigt,
  dass letztes Mal schon alles geschafft war.
- Tippen auf eine Übungszeile (erkennbar am **›**) klappt ihre Historie auf: letzte
  Einheiten als scrollbare Tabelle plus Fortschrittskurve (reine Linie, ohne Punkte).
  Die Kurve ist nach **Trainingsindex** gezeichnet, nicht nach Kalenderdatum — ein
  ausgelassenes oder zusätzliches Training verzerrt den Verlauf dadurch nicht.
- Unten ein Knopf **„Einheit speichern"** — übernimmt alle angezeigten Gewichte für das
  gewählte Datum, auch unveränderte. Ein zweites Speichern desselben Datums überschreibt
  den vorhandenen Eintrag, statt einen zweiten anzulegen; die Haken bleiben dabei
  angehakt (kein Reset). Zurückgesetzt wird ein Haken erst, wenn ein anderes, noch nicht
  gespeichertes Datum gewählt wird.
- Menü oben rechts: **Fortschritt & Verlauf** (Pläne oben, darunter je Übung eine
  Chartkarte mit Kurve + Tabelle, filterbar nach „Letzte 10" oder Zeitraum — Tippen auf
  einen Tabelleneintrag öffnet die ganze Einheit dieses Tages inkl. Löschen), Plan
  bearbeiten, Backup und Demodaten löschen.

**Nur Übungen mit Zusatzgewicht (oder Zeit) werden protokolliert.** Band Pull-Aparts,
Dead Bugs und Hyperextensions haben kein Eingabefeld — nur die Wiederholungszahl als
Text, gleiche Stelle wie die Pille bei den anderen Übungen. Side Plank hat dagegen ein
Eingabefeld wie eine Gewichtsübung, nur ohne Einheitentext daneben (Sekunden statt kg
versteht sich von selbst) — die Zeit wird mit der Stoppuhr gestoppt und von Hand
eingetragen.
**Trainingseinheit 1 und 2 sind strikt getrennt** — dieselbe Übung (z.B. Hip Thrust
Maschine) hat in beiden Einheiten ein eigenes Arbeitsgewicht und eine eigene Historie.
Nur Übungen ganz ohne Gewicht (keine Historie, nichts eingetragen) und ohne Haken
werden nicht gespeichert.

## Demodaten

Die App startet mit acht fiktiven Einheiten der letzten sechs Wochen, damit sich
sofort etwas zum Anschauen ergibt (Gewichte, Verlauf, ↑-Marker). Über
Menü → „Demodaten löschen" verschwinden sie rückstandsfrei, ohne deine eigenen
Einheiten anzutasten.

## Schnell ausprobieren (PC)

```bash
python -m http.server 8099
```

Dann http://localhost:8099 öffnen.

## Aufs Handy bringen

Die App braucht **HTTPS**, damit sie sich installieren lässt und offline funktioniert.

### 1. GitHub Pages (empfohlen, kostenlos, dauerhaft)

1. Repository auf GitHub anlegen und den Inhalt dieses Ordners pushen.
2. Repo → Settings → Pages → Source: `main` / root → Save.
3. Nach ein paar Minuten ist die App unter `https://<name>.github.io/<repo>/` erreichbar.

### 2. Netlify Drop (schnellster Weg, ohne Git)

https://app.netlify.com/drop öffnen und den Projektordner ins Browserfenster ziehen. Fertig, URL kommt sofort.

### 3. Nur im Heim-WLAN

`python -m http.server 8099` auf dem PC starten und am Handy `http://<PC-IP>:8099` öffnen.
Funktioniert zum Testen, aber ohne HTTPS gibt es keine Offline-Installation — fürs Studio also ungeeignet.

## Als App installieren (Android/Chrome)

URL öffnen → Menü ⋮ → **„App installieren"** bzw. „Zum Startbildschirm hinzufügen".
Danach startet sie wie eine normale App im Vollbild und läuft ohne Internet weiter.
Auf dem iPhone: Safari → Teilen → „Zum Home-Bildschirm".

## Daten und Backup

Alles liegt lokal in IndexedDB. Ein Jahr Training entspricht wenigen Kilobyte —
Platz ist also nie das Thema, aber die Daten hängen an genau diesem Browser auf
genau diesem Gerät.

**Deshalb: regelmäßig Menü → „Backup exportieren"** und die JSON-Datei in Cloud/Mail
ablegen. Das ist gleichzeitig der Weg, die Daten auf ein neues Handy zu übernehmen
(dort „Import").

Löschen der Browserdaten bzw. Deinstallieren der App löscht auch die Trainingsdaten.

## Projektstruktur

```
index.html               App-Shell (Topbar, Container, Speichern-Leiste, Modal)
css/style.css             komplettes Design, Dark Theme
js/db.js                  IndexedDB-Wrapper (exercises, profiles, plans, workouts, meta)
js/seed.js                Übungskatalog, Profile + Pläne, Demodaten-Rezept
js/chart.js                abhängigkeitsfreies SVG-Liniendiagramm
js/app.js                  State, Views, Speicherlogik
manifest.webmanifest      PWA-Manifest (Name, Icons, Standalone-Modus)
sw.js                      Service Worker (Offline-Cache)
icons/                     App-Icons 192/512 px
```

Keine Build-Schritte, keine Abhängigkeiten — Dateien ändern, neu laden, fertig.

## Updates ausliefern

Der Service Worker liefert die gecachte Version sofort aus und lädt die neue im
Hintergrund (stale-while-revalidate): Nach einem Deploy ist die Änderung beim
übernächsten Start aktiv. Soll sie sofort greifen, in `sw.js` die Zeile
`const CACHE = 'gymlog-v10'` (aktueller Stand) hochzählen.
