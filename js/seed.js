/* Startdaten: Übungskatalog + deine Trainingspläne.
   Einheiten: kg = Gewicht, s = Sekunden, x = ohne Gewicht (nur abhaken). */

const SEED_EXERCISES = [
  // --- Übungen aus Sarahs Tag A / Tag B ---
  ['Beinpresse beidbeinig', 'Beine', 'kg'],
  ['Beinpresse einbeinig', 'Beine', 'kg'],
  ['Brustpresse', 'Brust', 'kg'],
  ['Face Pull (Kabel)', 'Schultern', 'kg'],
  ['Band Pull-Aparts', 'Schultern', 'x'],
  ['Hip Thrust Maschine', 'Beine', 'kg'],
  ['Latzug', 'Rücken', 'kg'],
  ['Einbeinstand auf Balance-Pad', 'Beine', 'x'],
  ['Dead Bugs', 'Rumpf', 'x'],
  ['Seated Leg Curl', 'Beine', 'kg'],
  ['Seated Leg Curl „2 hoch, 1 runter“', 'Beine', 'kg'],
  ['Wadenheben (Maschine)', 'Beine', 'kg'],
  ['Wadenheben (Beinpresse)', 'Beine', 'kg'],
  ['Woodchopper (Kabel)', 'Rumpf', 'kg'],
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
   über ein Icon im Topbar zwischen ihnen; jedes Profil hat seine eigenen Pläne/Tabs. */
const SEED_PROFILES = ['Sarah', 'Alex'];

/* [Profil, Plan, Untertitel, [Block, Übung, Sätze, Wdh., Hinweis, (Phase 2:) Sätze, Wdh., Hinweis]]
   Die Phase-2-Spalten sind optional: fehlen sie, gilt die Zeile in jeder Phase gleich. Ein
   Profil mit mindestens einer Phase-2-Zeile bekommt auf der Hauptseite den Phasen-Chip.
   Der Untertitel steht klein unter dem Plannamen im Tagesumschalter. */
const SEED_PLANS = [
  ['Sarah', 'Tag A', 'Kraft/Power', [
    ['A1', 'Beinpresse beidbeinig', '2–3', '10–12', '≤90°', '3', '5–8', '≤90°, explosiv'],
    ['A2', 'Brustpresse', '2–3', '10–12', '', '3', '8–12', ''],
    ['A3', 'Face Pull (Kabel)', '2', '15', '', '3', '15', ''],
    ['B1', 'Hip Thrust Maschine', '2–3', '12–15', '', '3', '5–8', 'explosiv'],
    ['B2', 'Latzug', '2–3', '10–12', '', '3', '8–12', ''],
    ['B3', 'Einbeinstand auf Balance-Pad', '3', '30 s', '', '3', '30 s', 'erschwert'],
    ['C1', 'Seated Leg Curl', '2', '10–12', 'beidbeinig', '3', '8–12', 'beidbeinig'],
    ['C2', 'Dead Bugs', '2', '10', '', '3', '10', ''],
    ['C3', 'Woodchopper (Kabel)', '2', '12', '', '3', '6–8', 'explosiv'],
  ]],
  ['Sarah', 'Tag B', 'Hypertrophie/Prävention', [
    ['A1', 'Seated Leg Curl „2 hoch, 1 runter“', '2–3', '8', '', '3', '8–10', ''],
    ['A2', 'Schulterpresse', '2–3', '10–12', '', '3', '8–12', ''],
    ['A3', 'Kabel-Außenrotation', '2', '12–15', 'Ellbogen am Körper', '3', '12–15', '90/90'],
    ['B1', 'Hyperextensions', '2–3', '12–15', '', '3', '10–12', ''],
    ['B2', 'Ruderzug', '2–3', '10–12', '', '3', '8–12', ''],
    ['B3', 'Side Plank', '2', '30 s', '', '3', '30–45 s', ''],
    ['C1', 'Beinpresse einbeinig', '2', '12–15', '≤90°', '3', '10–15', '≤90°'],
    ['C2', 'Abduktoren-Maschine', '2–3', '15–20', '', '3', '15–20', ''],
    ['C3', 'Wadenheben (Beinpresse)', '2', '12–15', '', '3', '10–15', ''],
  ]],
  ['Alex', 'Tag A', 'Kraft und Sehne', [
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
  ['Alex', 'Tag B', 'Power', [
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

/* Ausführungs-Tipps je Profil und Übungsname (Info-Knopf neben der Übung). `ph` = gilt nur
   in dieser Phase (in der anderen Phase blass angezeigt). Statischer Inhalt, liegt nicht in
   IndexedDB -- Änderungen hier kommen mit dem nächsten Update auf allen Geräten an. */
const BP_TIPS = [
  { t: 'Den 90°-Punkt einmal ermitteln und merken (Sitzposition, Anschlag). Als Faustregel gilt: Das Gesäß hebt nie vom Polster ab.' },
  { t: 'Das Knie zeigt über den 2. bis 3. Zeh und kippt nicht nach innen.' },
  { t: 'Oben die Knie nicht durchstrecken bzw. verriegeln. Bei einem instabilen Knie ist das besonders wichtig.' },
];
const LEG_CURL_TIPS = [
  { t: 'Die Kniegelenksachse auf die Drehachse der Maschine ausrichten, das Oberschenkelpolster fest einstellen.' },
  { t: 'Das Unterschenkelpolster liegt knapp über der Ferse.' },
  { t: 'Oberkörper leicht nach vorne neigen: mehr Hüftbeugung bedeutet mehr Dehnung der Hamstrings.' },
  { t: 'Falls die Endposition (maximale Beugung) Druck im Knie auslöst, den Bewegungsradius dort begrenzen.' },
  { t: 'Das Beugen des Knies gegen Widerstand zieht den Unterschenkel nach hinten und belastet das fehlende Kreuzband nicht.' },
];
const TIPS = {
  Sarah: {
    'Beinpresse beidbeinig': [...BP_TIPS,
      { t: 'Explosiv: 2 s kontrolliert absenken, dann so schnell wie möglich drücken. Auch wenn sich die Last langsam bewegt, zählt die Absicht zur Beschleunigung.', ph: 2 }],
    'Beinpresse einbeinig': [...BP_TIPS,
      { t: 'Mit dem schwächeren Bein beginnen, das stärkere macht dieselbe Wiederholungszahl.' }],
    'Brustpresse': [
      { t: 'Griffe auf Höhe der mittleren Brust.' },
      { t: 'Schulterblätter nach hinten und unten ziehen und dort halten.' },
      { t: 'Ellbogen etwa 45–60° vom Körper abgespreizt, nicht auf 90° seitlich.' }],
    'Face Pull (Kabel)': [
      { t: 'Seilgriff auf Augenhöhe, zur Stirn ziehen und dabei die Hände auseinanderziehen.' },
      { t: 'Am Ende zeigen die Daumen nach hinten, die Unterarme stehen senkrecht. Diese Endposition ist die Außenrotation.' },
      { t: 'Leichtes Gewicht wählen. Wenn der Oberkörper nach hinten ausweicht, ist es zu schwer.' }],
    'Hip Thrust Maschine': [
      { t: 'Am oberen Punkt stehen die Schienbeine senkrecht. Der Kniewinkel liegt dort bei etwa 90°, das ist unkritisch.' },
      { t: 'Kinn leicht zur Brust, Rippen unten lassen: Die Hüfte streckt sich, der untere Rücken geht nicht ins Hohlkreuz.' },
      { t: 'Durch die Fersen drücken.' },
      { t: 'Oben 1 s halten.', ph: 1 }],
    'Latzug': [
      { t: 'Griff schulterbreit bis leicht breiter. Sehr breit bringt wahrscheinlich keinen Vorteil.' },
      { t: 'Leichte Rücklage, die Stange zur oberen Brust ziehen, nie in den Nacken.' },
      { t: 'Mit dem Gedanken ziehen, die Ellbogen zur Hüfte zu führen, nicht mit den Händen.' }],
    'Einbeinstand auf Balance-Pad': [
      { t: 'Knie leicht gebeugt (ca. 20°), Knie über dem Fuß, Becken waagerecht.' },
      { t: 'Steigerung in dieser Reihenfolge: Augen zu, Kopf drehen, Ball fangen (falls ein Partner da ist).' },
      { t: 'Für das instabile Knie ist diese Übung wichtiger, als sie aussieht.' }],
    'Seated Leg Curl': LEG_CURL_TIPS,
    'Seated Leg Curl „2 hoch, 1 runter“': [...LEG_CURL_TIPS,
      { t: '„2 hoch, 1 runter“: das Gewicht so wählen, dass das einbeinige Nachgeben kontrolliert 3–4 s dauert.' }],
    'Dead Bugs': [
      { t: 'Die Lendenwirbelsäule bleibt die ganze Zeit am Boden. Wenn sie abhebt, den Bewegungsradius verkürzen.' },
      { t: 'Beim Strecken von Arm und Bein ausatmen und langsam arbeiten.' }],
    'Woodchopper (Kabel)': [
      { t: 'Richtung von hoch nach tief, also entsprechend der Schlagbewegung.' },
      { t: 'Die Rotation kommt aus Hüfte und Brustwirbelsäule. Die Arme bleiben relativ gestreckt, der Lendenbereich dreht nicht aktiv.' },
      { t: 'Explosiv: schnell in die Zugphase, kontrolliert zurück.', ph: 2 }],
    'Schulterpresse': [
      { t: 'Nur im schmerzfreien Bereich arbeiten. Wenn vorhanden, einen neutralen Griff nutzen (Handflächen zueinander).' },
      { t: 'Ellbogen leicht vor dem Körper, nicht direkt seitlich.' }],
    'Kabel-Außenrotation': [
      { t: 'Ellbogen seitlich am Körper, ein gerolltes Handtuch zwischen Ellbogen und Rumpf, Unterarm dreht nach außen.', ph: 1 },
      { t: '90/90: Oberarm auf Schulterhöhe seitlich, Ellbogen 90° gebeugt, der Unterarm rotiert nach oben. Das ist näher an der Schlagposition.', ph: 2 },
      { t: 'Das Gewicht bewusst leicht halten, 2–3 s zurück. Der Ellbogen bleibt fixiert.' }],
    'Hyperextensions': [
      { t: 'Das Polster knapp unter den Hüftknochen legen, damit die Hüfte frei beugen kann.' },
      { t: 'Für Gesäßbetonung: Füße leicht nach außen, oberen Rücken leicht rund, Gesäß aktiv anspannen.' },
      { t: 'Oben nur bis zur geraden Linie gehen, nicht darüber ins Hohlkreuz.' }],
    'Ruderzug': [
      { t: 'Brust am Polster.' },
      { t: 'Die Bewegung mit dem Zurückziehen der Schulterblätter beginnen, erst dann die Arme beugen. Ellbogen Richtung Hüfte.' }],
    'Side Plank': [
      { t: 'Ellbogen unter der Schulter, Körper in einer Linie, Hüfte nicht absacken lassen.' },
      { t: 'Einfachere Variante: auf den Knien statt auf den Füßen.' }],
    'Abduktoren-Maschine': [
      { t: 'Mit leicht nach vorne geneigtem Oberkörper wird der Gesäßmuskel stärker einbezogen.' },
      { t: 'Kontrolliert zurückführen und die Gewichte nicht zusammenschlagen lassen.' }],
    'Wadenheben (Beinpresse)': [
      { t: 'Die Sicherung muss eingerastet sein. Beim Abrutschen des Fußes schlägt die Plattform sonst zurück.' },
      { t: 'Fußballen am unteren Plattenrand, Knie gestreckt, aber nicht verriegelt.' },
      { t: 'Unten voll dehnen und 1 s halten, oben kurz halten.' }],
  },
};

/* Wird hochgezählt, wenn neue Startdaten nachgeliefert werden sollen. */
const SEED_VERSION = 6;
