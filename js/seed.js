/* Startdaten: Übungskatalog + deine Trainingspläne.
   Einheiten: kg = Gewicht, s = Sekunden, x = ohne Gewicht (nur abhaken). */

const SEED_EXERCISES = [
  // --- Übungen aus Tag A / Tag B ---
  ['Beinpresse einbeinig', 'Beine', 'kg'],
  ['Brustpresse', 'Brust', 'kg'],
  ['Band Pull-Aparts', 'Schultern', 'x'],
  ['Hip Thrust Maschine', 'Beine', 'kg'],
  ['Latzug', 'Rücken', 'kg'],
  ['Dead Bugs', 'Rumpf', 'x'],
  ['Seated Leg Curl', 'Beine', 'kg'],
  ['Wadenheben (Maschine)', 'Beine', 'kg'],
  ['Woodchopper', 'Rumpf', 'kg'],
  ['Schulterpresse', 'Schultern', 'kg'],
  ['Kabel-Außenrotation', 'Schultern', 'kg'],
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

  // --- Übungen aus Alex' Plan ("Kraft und Sehne" / "Power") ---
  ['Bankdrücken flach', 'Brust', 'kg'], ['Big 3 im Wechsel', 'Rumpf', 's'],
  ['Bulgarian Split Squat mit Kurzhanteln', 'Beine', 'kg'],
  ['Latzug am Kabel', 'Rücken', 'kg'], ['Beinbeuger sitzend', 'Beine', 'kg'],
  ['Hip Thrust', 'Beine', 'kg'], ['Einbeiniges Wadenheben', 'Beine', 'kg'],
  ['Sprung mit Kurzhanteln oder Trap Bar', 'Beine', 'kg'],
  ['Schrägbank 15–30°', 'Brust', 'kg'], ['Pallof Press', 'Rumpf', 'kg'],
  ['Box Jump / Jump & Reach', 'Beine', 'x'], ['Y-Raises', 'Schultern', 'kg'],
];

/* Profile gruppieren Trainingspläne (z.B. verschiedene Personen). Der Nutzer wechselt
   über ein Icon im Topbar zwischen ihnen; jedes Profil hat seine eigenen Pläne/Tabs.
   "Alex" ist aktuell ein leerer Platzhalter, bis der zugehörige Plan feststeht (analog
   zu Sarahs Plan -- siehe HANDOVER.md Abschnitt 9). */
const SEED_PROFILES = ['Sarah', 'Alex'];

/* [Profil, Plan, [Block, Übung, Sätze, Wiederholungen, Hinweis]]
   Sätze sind je Block einheitlich 3 (steht in der Block-Überschrift) -- ehemalige Ausreißer
   (Beinpresse 4, Hip Thrust 4, Seated Leg Curl 2–3, Hyperextensions 2–3) auf 3 vereinheitlicht. */
const SEED_PLANS = [
  ['Sarah', 'Trainingseinheit 1', [
    ['A1', 'Beinpresse einbeinig', '3', '5–8', '≤90°, explosiv hoch, RIR 2–3'],
    ['A2', 'Brustpresse', '3', '8–12', ''],
    ['A3', 'Band Pull-Aparts', '3', '15–20', 'aktive Pause'],
    ['B1', 'Hip Thrust Maschine', '3', '8–12', ''],
    ['B2', 'Latzug', '3', '8–12', ''],
    ['B3', 'Dead Bugs', '3', '10', 'aktive Pause'],
    ['C1', 'Seated Leg Curl', '3', '10–15', '3 s exzentrisch'],
    ['C2', 'Wadenheben (Maschine)', '3', '10–15', ''],
    ['C3', 'Woodchopper', '3', '6–8/S.', 'explosiv'],
  ]],
  ['Sarah', 'Trainingseinheit 2', [
    ['A1', 'Hip Thrust Maschine', '3', '5–8', 'explosiv hoch'],
    ['A2', 'Schulterpresse', '3', '8–12', 'schmerzfrei'],
    ['A3', 'Kabel-Außenrotation', '3', '12–15', '90/90, ersetzt Bird-Dog'],
    ['B1', 'Seated Leg Curl', '3', '10–15', '3 s exzentrisch'],
    ['B2', 'Ruderzug', '3', '8–12', ''],
    ['B3', 'Side Plank', '3', '30–45 s', 'aktive Pause'],
    ['C1', 'Beinpresse einbeinig', '3', '10–15', '≤90°, Hypertrophie'],
    ['C2', 'Abduktoren-Maschine', '3', '15–20', ''],
    ['C3', 'Hyperextensions', '3', '10–12', 'gluteusbetont'],
  ]],
  ['Alex', 'Kraft und Sehne', [
    ['A1', 'Beinpresse', '3', '15', '3 s runter, 3 s hoch; Becken darf sich nicht einrollen'],
    ['A2', 'Bankdrücken flach', '3', '6–8', '2 Wdh. vor dem Versagen aufhören, Griff etwas enger'],
    ['A3', 'Big 3 im Wechsel', '3', '10 s', 'Wechsel aus drei Übungen, 1 Übung pro Satz'],
    ['B1', 'Bulgarian Split Squat mit Kurzhanteln', '3', '15', '3 s runter, 3 s hoch'],
    ['B2', 'Latzug am Kabel', '3', '8–10', ''],
    ['B3', 'Beinbeuger sitzend', '3', '10–12', ''],
    ['C1', 'Hip Thrust', '3', '8–10', 'Langhantel oder Maschine'],
    ['C2', 'Kabel-Außenrotation', '3', '12–15', 'Oberarm am Körper, Handtuch unter dem Ellbogen'],
    ['C3', 'Einbeiniges Wadenheben', '3', '10–15', 'abwechselnd mit gestrecktem und gebeugtem Knie'],
  ]],
  ['Alex', 'Power', [
    ['A1', 'Beinpresse', '3', '6–8', 'Kontrastpaar mit Box Jump (danach 60–90 s Pause)'],
    ['A2', 'Box Jump / Jump & Reach', '3', '3', 'Kontrastpaar nach Beinpresse; Sprung maximal hoch'],
    ['A3', 'Kabelrudern', '3', '8–10', 'neu in Block 1'],
    ['B1', 'Sprung mit Kurzhanteln oder Trap Bar', '3', '3', 'leichtes Gewicht, maximale Höhe, vor jeder Wdh. neu ansetzen'],
    ['B2', 'Schrägbank 15–30°', '3', '8–10', 'beim ersten Mal auf Schulterschmerz testen'],
    ['B3', 'Pallof Press', '3', '10', 'neu in Block 2'],
    ['C1', 'Hyperextensions', '3', '10–12', 'Rücken neutral, Bewegung nur aus der Hüfte'],
    ['C2', 'Bizepscurls (KH)', '3', '10–12', ''],
    ['C3', 'Y-Raises', '3', '12', '1–3 kg, mit der Brust auf der Schrägbank'],
  ]],
];

/* Wird hochgezählt, wenn neue Startdaten nachgeliefert werden sollen. */
const SEED_VERSION = 5;
