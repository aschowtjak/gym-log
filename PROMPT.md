# Prompt für die nächste Session

Alles zwischen den Linien in einen neuen Chat kopieren. Arbeitsverzeichnis vorher auf
`D:\Claude Code\Fitness App` setzen.

---

Im Verzeichnis `D:\Claude Code\Fitness App` liegt „Gym Log", eine fertige, lauffähige
Trainings-PWA (Plain HTML/CSS/JS, IndexedDB, Service Worker, kein Build, keine
Abhängigkeiten, deutschsprachig, Dark Theme, Mobile-First). **Lies zuerst `HANDOVER.md`** —
dort stehen Aufbau, Datenmodell, fachliche Festlegungen und Stolperfallen.

Die App ist zu umfangreich geraten. Bau sie auf das Wesentliche zurück. Die bestehende
Technik (PWA, IndexedDB, `js/db.js`, `js/chart.js`, Backup-Export/-Import, Plan-Editor)
bleibt, `js/app.js` und die Oberfläche werden neu aufgebaut.

**Zweck der App in einem Satz:** Beim Training am Handy sofort sehen, mit welchem Gewicht
jede Übung heute dran ist — abgeleitet aus der letzten Einheit.

## Das Prinzip

Das Arbeitsgewicht der nächsten Einheit ergibt sich vollständig aus der letzten:
Gewicht plus die Information, ob **alle Sätze mit allen Wiederholungen** geschafft wurden.
War alles geschafft, wird beim nächsten Mal erhöht. **Um wie viel, entscheidet der Nutzer
selbst und tippt es manuell ein** — die App rechnet nichts hoch und schlägt keine
Schrittweite vor. Pro Übung also: ein Textfeld fürs Gewicht und ein Haken
„alles geschafft?". Mehr nicht, insbesondere keine Einzelsätze.

## Alles auf einer Seite

Es gibt genau eine Seite, keine Reiter-Navigation:

1. Oben ein Umschalter **[Tag A] [Tag B]** (mehr Pläne gibt es nicht, kein freies Training).
2. Darunter die Plan-Übersicht in der bestehenden, bewährten Tabellenform, ergänzt um eine
   **Spalte Gewicht**:

   | Block | Übung | Sätze × Wdh. | Gewicht |
   |---|---|---|---|
   | A1 | Beinpresse einbeinig (≤90°)<br><sub>explosiv hoch, RIR 2–3</sub> | 4 × 5–8 | `40` ↑ |

   - Die Vorgabe aus der letzten Einheit steht als Wert **vorbelegt im Eingabefeld**, damit
     man sie nur überschreiben muss.
   - Soll laut letzter Einheit erhöht werden, wird das deutlich markiert — altes Gewicht mit
     einem Pfeil nach oben bzw. einem Plus dahinter (z.B. „40 kg ↑"). Die Markierung ist der
     Hinweis, jetzt manuell zu erhöhen.
   - War die letzte Einheit nicht vollständig geschafft, keine Markierung: Gewicht halten.
   - Ohne Historie bleibt das Feld leer.
   - Daneben der Haken **„alles geschafft"** für die heutige Einheit.
   - Der Hinweis aus dem Plan (z.B. „3 s exzentrisch") bleibt sichtbar, aber dezent.
3. Unten ein Knopf zum Speichern der Einheit.
4. Tippen auf eine Übungszeile klappt deren Historie auf: die letzten Einheiten als Liste
   (Datum, Gewicht, geschafft ja/nein) und die vorhandene Kurve aus `js/chart.js`.
   Kein separater Fortschritts-Reiter.
5. Plan bearbeiten, Backup und Demodaten löschen gehören in ein unaufdringliches Menü
   (Zahnrad in der Kopfzeile).

Die Seite soll ruhig wirken: wenig Farbe, klare Zeilen, große Tippflächen fürs Studio.

## Tracking-Regeln

- **Nur Übungen mit Zusatzgewicht werden protokolliert.** Ohne Eingabefeld und ohne Haken
  bleiben: Band Pull-Aparts und Dead Bugs (Tag A), Side Plank und Hyperextensions (Tag B).
  Sie stehen weiterhin in der Übersicht, damit der Plan vollständig ist.
- **Tag A und Tag B sind strikt getrennt.** Dieselbe Übung hat an beiden Tagen einen anderen
  Fokus (Schnellkraft vs. Hypertrophie) und ein anderes Arbeitsgewicht. Historie und
  Vorbelegung immer über `planId + exerciseId` schlüsseln, nie nur über die Übung.
  Betrifft Hip Thrust Maschine, Seated Leg Curl und Beinpresse einbeinig.
- Übungen ohne Bewertung dürfen **nicht** gespeichert werden, sonst landen vorbelegte
  Gewichte übersprungener Übungen als trainiert im Verlauf (siehe `touched()` im Altcode).

## Demodaten

Lege **fiktive Trainingsdaten** an, damit sich die App direkt wie an einem normalen
Trainingstag anschauen lässt: rund acht Einheiten über die letzten sechs Wochen, abwechselnd
Tag A und Tag B, plausible Gewichte mit erkennbarer Steigerung, dabei zwei oder drei Übungen
„nicht geschafft". Die jüngste Einheit soll bei mehreren Übungen den Steigerungs-Marker
hinterlassen, damit beim Öffnen sowohl vorbelegte Gewichte als auch Pfeile zu sehen sind und
die Historie je Übung eine Kurve zeigt. Die Daten müssen als Demodaten erkennbar und mit
einem Knopf im Menü rückstandsfrei löschbar sein.

## Rahmen

- Keine neuen Abhängigkeiten, kein Build-Schritt, weiterhin offlinefähig und installierbar.
- Oberfläche auf Deutsch, Zielgerät ist ein Android-Handy.
- Vor Abschluss im Browser bei 375 × 812 px durchspielen: Tag A öffnen, Gewichte eintragen,
  Haken setzen, speichern, Tag B prüfen, erneut Tag A öffnen und kontrollieren, dass Vorgabe
  und Marker stimmen. Beachte den Service-Worker-Hinweis in `HANDOVER.md`, sonst testest du
  die alte Version.
- `README.md` und `HANDOVER.md` am Ende an den neuen Stand anpassen.
