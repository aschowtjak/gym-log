/* Startdaten: Übungskatalog + deine Trainingspläne.
   Einheiten: kg = Gewicht, s = Sekunden, x = ohne Gewicht (nur abhaken). */

const SEED_EXERCISES = [
  // --- Übungen aus Tag A / Tag B ---
  ['Beinpresse einbeinig (≤90°)', 'Beine', 'kg'],
  ['Brustpresse', 'Brust', 'kg'],
  ['Band Pull-Aparts', 'Schultern', 'x'],
  ['Hip Thrust Maschine', 'Beine', 'kg'],
  ['Latzug', 'Rücken', 'kg'],
  ['Dead Bugs', 'Rumpf', 'x'],
  ['Seated Leg Curl', 'Beine', 'kg'],
  ['Wadenheben (Maschine)', 'Beine', 'kg'],
  ['Woodchopper', 'Rumpf', 'kg'],
  ['Schulterpresse', 'Schultern', 'kg'],
  ['Kabel-Außenrotation (90/90)', 'Schultern', 'kg'],
  ['Ruderzug', 'Rücken', 'kg'],
  ['Side Plank', 'Rumpf', 's'],
  ['Abduktoren-Maschine', 'Beine', 'kg'],
  ['Hyperextensions', 'Rücken', 'x'],

  // --- weiterer Katalog, falls du Übungen austauschst ---
  ['Bankdrücken (LH)', 'Brust', 'kg'], ['Schrägbankdrücken (KH)', 'Brust', 'kg'],
  ['Bankdrücken (KH)', 'Brust', 'kg'], ['Butterfly', 'Brust', 'kg'],
  ['Dips', 'Brust', 'x'], ['Liegestütze', 'Brust', 'x'],
  ['Klimmzüge', 'Rücken', 'x'], ['Langhantelrudern', 'Rücken', 'kg'],
  ['Kurzhantelrudern', 'Rücken', 'kg'], ['Kabelrudern', 'Rücken', 'kg'],
  ['Kreuzheben', 'Rücken', 'kg'], ['Rückenstrecker', 'Rücken', 'x'],
  ['Kniebeugen', 'Beine', 'kg'], ['Beinpresse', 'Beine', 'kg'],
  ['Beinstrecker', 'Beine', 'kg'], ['Beinbeuger', 'Beine', 'kg'],
  ['Rumänisches Kreuzheben', 'Beine', 'kg'], ['Ausfallschritte', 'Beine', 'kg'],
  ['Wadenheben', 'Beine', 'kg'], ['Adduktoren-Maschine', 'Beine', 'kg'],
  ['Schulterdrücken (KH)', 'Schultern', 'kg'], ['Seitheben', 'Schultern', 'kg'],
  ['Frontheben', 'Schultern', 'kg'], ['Reverse Butterfly', 'Schultern', 'kg'],
  ['Face Pulls', 'Schultern', 'kg'],
  ['Bizepscurls (KH)', 'Arme', 'kg'], ['Bizepscurls (LH)', 'Arme', 'kg'],
  ['Hammercurls', 'Arme', 'kg'], ['Trizepsdrücken (Kabel)', 'Arme', 'kg'],
  ['Stirndrücken', 'Arme', 'kg'],
  ['Plank', 'Rumpf', 's'], ['Crunches', 'Rumpf', 'x'],
  ['Beinheben', 'Rumpf', 'x'], ['Bauchpresse (Maschine)', 'Rumpf', 'kg'],
];

/* [Block, Übung, Sätze, Wiederholungen, Hinweis] */
const SEED_PLANS = [
  ['Tag A', [
    ['A1', 'Beinpresse einbeinig (≤90°)', '4', '5–8', 'explosiv hoch, RIR 2–3'],
    ['A2', 'Brustpresse', '3', '8–12', ''],
    ['A3', 'Band Pull-Aparts', '3', '15–20', 'aktive Pause'],
    ['B1', 'Hip Thrust Maschine', '3', '8–12', ''],
    ['B2', 'Latzug', '3', '8–12', ''],
    ['B3', 'Dead Bugs', '3', '10/S.', 'aktive Pause'],
    ['C1', 'Seated Leg Curl', '2–3', '10–15', '3 s exzentrisch'],
    ['C2', 'Wadenheben (Maschine)', '3', '10–15', ''],
    ['C3', 'Woodchopper', '3', '6–8/S.', 'explosiv'],
  ]],
  ['Tag B', [
    ['A1', 'Hip Thrust Maschine', '4', '5–8', 'explosiv hoch'],
    ['A2', 'Schulterpresse', '3', '8–12', 'schmerzfrei'],
    ['A3', 'Kabel-Außenrotation (90/90)', '3', '12–15', 'ersetzt Bird-Dog'],
    ['B1', 'Seated Leg Curl', '3', '10–15', '3 s exzentrisch'],
    ['B2', 'Ruderzug', '3', '8–12', ''],
    ['B3', 'Side Plank', '3', '30–45 s', 'aktive Pause'],
    ['C1', 'Beinpresse einbeinig (≤90°)', '3', '10–15', 'Hypertrophie'],
    ['C2', 'Abduktoren-Maschine', '3', '15–20', ''],
    ['C3', 'Hyperextensions', '2–3', '10–12', 'gluteusbetont'],
  ]],
];

/* Wird hochgezählt, wenn neue Startdaten nachgeliefert werden sollen. */
const SEED_VERSION = 2;

/* ---------------- Demodaten ----------------
   Fiktive Trainingshistorie, damit sich die App beim ersten Öffnen wie an einem
   normalen Trainingstag anschauen lässt. Pro Übung: Startgewicht, Schrittweite und
   ob die jeweilige Einheit als "alles geschafft" gilt (steuert die Progression:
   nur nach einer geschafften Einheit steigt das Gewicht beim nächsten Mal).
   Wird einmalig erzeugt (siehe ensureDemo in app.js) und ist über einen Knopf im
   Menü rückstandsfrei löschbar (Feld `demo: true` an den Workouts). */
const DEMO_PROGRESSIONS = {
  'Tag A': {
    'Beinpresse einbeinig (≤90°)': { start: 50, inc: 2.5, done: [true, true, true, true] },
    'Brustpresse': { start: 40, inc: 2.5, done: [true, true, true, true] },
    'Hip Thrust Maschine': { start: 70, inc: 5, done: [true, true, true, true] },
    'Latzug': { start: 45, inc: 2.5, done: [true, false, true, true] },
    'Seated Leg Curl': { start: 28, inc: 2, done: [true, true, false, true] },
    'Wadenheben (Maschine)': { start: 60, inc: 5, done: [true, true, true, true] },
    'Woodchopper': { start: 20, inc: 2.5, done: [true, true, true, true] },
  },
  'Tag B': {
    'Hip Thrust Maschine': { start: 55, inc: 2.5, done: [true, true, true, true] },
    'Schulterpresse': { start: 25, inc: 2.5, done: [true, true, true, true] },
    'Kabel-Außenrotation (90/90)': { start: 8, inc: 1, done: [true, true, true, true] },
    'Seated Leg Curl': { start: 24, inc: 2, done: [true, true, true, true] },
    'Ruderzug': { start: 40, inc: 2.5, done: [true, false, true, true] },
    'Beinpresse einbeinig (≤90°)': { start: 45, inc: 2.5, done: [true, true, true, true] },
    'Abduktoren-Maschine': { start: 35, inc: 2.5, done: [true, true, true, true] },
  },
};

/* Tag A und Tag B im Wechsel, insgesamt 8 Einheiten über die letzten ~6 Wochen. */
const DEMO_DAYS_AGO = { 'Tag A': [42, 31, 20, 9], 'Tag B': [37, 26, 15, 3] };
