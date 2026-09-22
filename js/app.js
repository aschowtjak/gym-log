/* ============================================================
   Gym Log - eine Seite: Tag A / Tag B, Gewicht pro Übung, fertig.
   Das Arbeitsgewicht ergibt sich aus der letzten Einheit (Gewicht +
   "alles geschafft?"). Erhöht wird nichts automatisch - nur markiert.
   Alle Daten lokal in IndexedDB.
   ============================================================ */

const S = {
  view: 'main',            // 'main' | 'planEdit'
  exercises: [],
  plans: [],
  profiles: [],              // gruppieren Pläne, z.B. verschiedene Trainingsprogramme
  profile: null,              // aktuell gewähltes Profil, persistiert in meta.profile
  workouts: [],             // neueste zuerst
  day: null,                 // aktuell gewählte planId
  draft: {},                 // { [planId]: { _date, [exerciseId]: {weight, done} } }
  dates: {},                 // { [planId]: 'YYYY-MM-DD' } aktuell bearbeitetes Datum, Default = heute (nicht persistiert)
  openKey: null,             // "planId|exerciseId" der aufgeklappten Historie
  editPlan: null,
  stopwatch: { startedAt: null, elapsed: 0, running: false },
  histPlan: null,             // gewählter Plan auf der Verlauf-Seite
  histFilter: '10',           // '10' | 'all' | '12' | '6' | '2' | '1' (Monate)
};

/* ---------------- Helfer ---------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const tsOf = (iso) => new Date(iso + 'T12:00:00').getTime();
const fmtShort = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const fmtFullDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const fmtKg = (v) => (Math.round(v * 100) / 100).toLocaleString('de-DE');

const UNITS = { kg: 'kg', s: '', x: '' };
const unitOf = (id) => { const e = S.exercises.find((x) => x.id === id); return (e && e.unit) || 'kg'; };
const exName = (id) => { const e = S.exercises.find((x) => x.id === id); return e ? e.name : 'Übung'; };
const exByName = (n) => S.exercises.find((e) => e.name === n);
const plansOfProfile = (profileId) => S.plans.filter((p) => p.profileId === profileId);
/* Blockgruppierung für die Übersicht: "A1"/"A2"/"A3" -> Gruppe "A" ("Block A"),
   "Finisher" bleibt eine eigene Gruppe mit ihrem Namen als Überschrift. */
const grpKey = (block) => (/^[A-Za-z]\d+$/.test(block || '') ? block[0].toUpperCase() : (block || '–'));
const grpLabel = (k) => (k.length === 1 ? 'Block ' + k : k);

function toast(msg, ms) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms || 2400);
}

/* ---------------- Start ---------------- */
async function init() {
  await DB.open();
  S.exercises = await DB.all('exercises');
  S.plans = await DB.all('plans');
  S.profiles = await DB.all('profiles');
  S.workouts = (await DB.all('workouts')).sort(byDateDesc);

  await ensureMigration();
  await ensureSeed();
  await ensureDemo();

  const draftRec = await DB.get('meta', 'draft');
  if (draftRec && draftRec.value) S.draft = draftRec.value;

  sortExercises(); sortPlans(); sortProfiles();
  if (S.profiles.length) {
    const profileRec = await DB.get('meta', 'profile');
    const wanted = profileRec && profileRec.value;
    S.profile = (wanted && S.profiles.some((p) => p.id === wanted)) ? wanted : S.profiles[0].id;
  }
  const myPlans = plansOfProfile(S.profile);
  if (myPlans.length) S.day = myPlans[0].id;

  bindEvents();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.startedAt || 0) - (a.startedAt || 0));
function sortExercises() { S.exercises.sort((a, b) => a.name.localeCompare(b.name, 'de')); }
function sortPlans() { S.plans.sort((a, b) => (a.order || 0) - (b.order || 0)); }
function sortProfiles() { S.profiles.sort((a, b) => (a.order || 0) - (b.order || 0)); }

/* Icon im Topbar: springt zum nächsten Profil (aktuell genau zwei, daher praktisch ein
   Umschalter). S.day/S.histPlan werden auf den ersten Plan des neuen Profils zurückgesetzt,
   da sie zum vorherigen Profil gehörten. Die Wahl wird persistiert (`meta.profile`),
   damit die App beim nächsten Start wieder im zuletzt gewählten Profil öffnet. */
async function switchProfile() {
  if (S.profiles.length < 2) return;
  const i = S.profiles.findIndex((p) => p.id === S.profile);
  const next = S.profiles[(i + 1) % S.profiles.length];
  S.profile = next.id;
  await DB.put('meta', { key: 'profile', value: next.id });
  const myPlans = plansOfProfile(S.profile);
  S.day = myPlans.length ? myPlans[0].id : null;
  S.histPlan = null;
  S.openKey = null;
  render();
  toast('Profil: ' + next.name, 1800);
}

/* Übungskatalog + Profile + Pläne anlegen (einmalig, versioniert). */
async function ensureSeed() {
  const rec = await DB.get('meta', 'seed');
  const have = rec ? rec.value : 0;
  if (have >= SEED_VERSION) return;

  for (const [name, muscle, unit] of SEED_EXERCISES) {
    if (!exByName(name)) {
      const e = { id: uid(), name, muscle, unit };
      S.exercises.push(e);
      await DB.put('exercises', e);
    }
  }

  for (const pname of SEED_PROFILES) {
    if (!S.profiles.some((p) => p.name === pname)) {
      const prof = { id: uid(), name: pname, order: S.profiles.length };
      S.profiles.push(prof);
      await DB.put('profiles', prof);
    }
  }

  for (const [profileName, name, rows] of SEED_PLANS) {
    if (S.plans.some((p) => p.name === name)) continue;
    const profile = S.profiles.find((p) => p.name === profileName);
    const plan = {
      id: uid(), name, profileId: (profile || {}).id,
      order: plansOfProfile((profile || {}).id).length,
      items: rows.map(([block, ex, sets, reps, hint]) => ({
        exerciseId: (exByName(ex) || {}).id, block, targetSets: sets, targetReps: reps, hint,
      })).filter((it) => it.exerciseId),
    };
    S.plans.push(plan);
    await DB.put('plans', plan);
  }

  await DB.put('meta', { key: 'seed', value: SEED_VERSION });
}

/* Einmaliger Nachzieh-Schritt für Bestandsinstallationen: ensureSeed() legt Übungen/Pläne nur
   an, rührt aber nie an bereits vorhandenen (sonst würden eigene Planänderungen überschrieben).
   Versioniert (`meta.migration`), damit spätere Runden weitere Schritte nachliefern können,
   ohne bereits erledigte erneut auszuführen. */
async function ensureMigration() {
  const rec = await DB.get('meta', 'migration');
  const have = rec ? rec.value : 0;
  if (have >= 3) return;

  if (have < 1) {
    /* 22.09. (dritte Runde): Namen/Block-Codes/Sätze auf den damaligen Stand bringen, OHNE
       eigene Ergänzungen des Nutzers (z.B. selbst hinzugefügte Übungen) anzutasten -- nur
       Positionen, die exakt einer Zeile aus SEED_PLANS entsprechen (per Übungsname im
       selben Plan), werden aktualisiert. */
    const renameEx = { 'Beinpresse einbeinig (≤90°)': 'Beinpresse einbeinig', 'Kabel-Außenrotation (90/90)': 'Kabel-Außenrotation' };
    for (const e of S.exercises) {
      if (renameEx[e.name]) { e.name = renameEx[e.name]; await DB.put('exercises', e); }
    }

    const renamePlan = { 'Tag A': 'Trainingseinheit 1', 'Tag B': 'Trainingseinheit 2' };
    for (const p of S.plans) {
      if (renamePlan[p.name]) p.name = renamePlan[p.name];
      const seedPlan = SEED_PLANS.find((sp) => sp[1] === p.name);
      const seedRows = seedPlan ? seedPlan[2] : [];
      p.items.forEach((it) => {
        const row = seedRows.find((r) => r[1] === exName(it.exerciseId));
        if (!row) return;
        it.block = row[0]; it.targetSets = row[2]; it.targetReps = row[3]; it.hint = row[4];
      });
      await DB.put('plans', p);
    }
  }

  if (have < 2) {
    /* 22.09. (vierte Runde): Profile eingeführt. Bestandsinstallationen kannten noch keine --
       alle vorhandenen Pläne gehören ins "Standard"-Profil, das dafür ggf. neu angelegt wird. */
    let std = S.profiles.find((p) => p.name === 'Standard');
    if (!std) {
      std = { id: uid(), name: 'Standard', order: 0 };
      S.profiles.push(std);
      await DB.put('profiles', std);
    }
    for (const p of S.plans) {
      if (!p.profileId) { p.profileId = std.id; await DB.put('plans', p); }
    }
  }

  if (have < 3) {
    /* 22.09. (vierte Runde, Teil 2): Profile umbenannt ("Standard" -> "Sarah",
       "Neues Profil" -> "Alex"). Gleiche IDs bleiben erhalten, nur der Name ändert
       sich -- Pläne/Zuordnung (profileId) sind davon unberührt. */
    const renameProfile = { 'Standard': 'Sarah', 'Neues Profil': 'Alex' };
    for (const p of S.profiles) {
      if (renameProfile[p.name]) { p.name = renameProfile[p.name]; await DB.put('profiles', p); }
    }
  }

  await DB.put('meta', { key: 'migration', value: 3 });
}

/* Fiktive Trainingshistorie anlegen - nur beim allerersten Start, nie erneut
   (auch nicht nach dem Löschen über das Menü). */
async function ensureDemo() {
  const rec = await DB.get('meta', 'demoSeeded');
  if (rec && rec.value) return;
  if (!S.workouts.length) {
    for (const w of buildDemoWorkouts()) {
      await DB.put('workouts', w);
      S.workouts.push(w);
    }
    S.workouts.sort(byDateDesc);
  }
  await DB.put('meta', { key: 'demoSeeded', value: true });
}

function buildDemoWorkouts() {
  const out = [];
  for (const planName of Object.keys(DEMO_PROGRESSIONS)) {
    const plan = S.plans.find((p) => p.name === planName);
    if (!plan) continue;
    const prog = DEMO_PROGRESSIONS[planName];
    const daysAgo = DEMO_DAYS_AGO[planName];

    const seqs = {};
    for (const [exN, cfg] of Object.entries(prog)) {
      const w = [cfg.start];
      for (let i = 1; i < 4; i++) w.push(w[i - 1] + (cfg.done[i - 1] ? cfg.inc : 0));
      seqs[exN] = w;
    }

    for (let i = 0; i < 4; i++) {
      const d = new Date(); d.setDate(d.getDate() - daysAgo[i]);
      const date = todayFromDate(d);
      const entries = [];
      plan.items.forEach((it) => {
        const exN = exName(it.exerciseId);
        const cfg = prog[exN];
        if (!cfg) return;
        entries.push({ exerciseId: it.exerciseId, block: it.block || '', weight: seqs[exN][i], done: cfg.done[i] });
      });
      out.push({
        id: uid(), date, startedAt: tsOf(date), finishedAt: tsOf(date) + 40 * 60000,
        planId: plan.id, planName: plan.name, entries, demo: true,
      });
    }
  }
  return out;
}
const todayFromDate = (d) => { const c = new Date(d); c.setMinutes(c.getMinutes() - c.getTimezoneOffset()); return c.toISOString().slice(0, 10); };

let _draftT;
function saveDraft() {
  clearTimeout(_draftT);
  _draftT = setTimeout(() => DB.put('meta', { key: 'draft', value: S.draft }), 300);
}

/* ---------------- Auswertung ---------------- */
function entryIn(w, exId) { return (w.entries || []).find((e) => e.exerciseId === exId) || null; }

/* Letztes Protokoll dieser Übung in diesem Plan (planId + exerciseId, nie nur die Übung),
   optional strikt vor einem gegebenen Datum (für rückwirkendes Bearbeiten: die Einheit an
   diesem Datum selbst soll dabei nicht als "vorheriges Mal" zählen). */
function lastLog(exId, planId, beforeDate) {
  for (const w of S.workouts) {
    if (w.planId !== planId) continue;
    if (beforeDate && !(w.date < beforeDate)) continue;
    const e = entryIn(w, exId);
    if (e) return { weight: num(e.weight), done: !!e.done, date: w.date };
  }
  return null;
}

/* Aktuell bearbeitetes Datum für einen Plan – Default heute, ephemer (nicht in IndexedDB). */
function curDateFor(planId) { return S.dates[planId] || todayISO(); }

/* Datenreihe für die Kurve, chronologisch. */
function seriesFor(exId, planId) {
  const out = [];
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const w = S.workouts[i];
    if (w.planId !== planId) continue;
    const e = entryIn(w, exId);
    if (!e || !(num(e.weight) > 0)) continue;
    out.push({ t: tsOf(w.date), y: num(e.weight), date: w.date, id: w.id });
  }
  return out;
}

/* ---------------- Router ---------------- */
const TITLES = { main: 'Training', planEdit: 'Plan bearbeiten', history: 'Verlauf' };
const BACKABLE = { planEdit: 'main', history: 'main' };

/* Beim Wechsel auf die Hauptseite von einer anderen Ansicht springt das Datum immer auf
   heute zurück -- rückwirkendes Bearbeiten ist als kurzer Ausflug gedacht, kein Modus,
   der über Navigation hinweg hängen bleibt. */
function nav(view) {
  if (view === 'main' && S.view !== 'main') S.dates = {};
  S.view = view; window.scrollTo(0, 0); render();
}

function render() {
  const v = S.view;
  $('#title').textContent = TITLES[v] || 'Training';
  $('#backBtn').classList.toggle('hidden', !BACKABLE[v]);
  $('#savebar').classList.toggle('hidden', v !== 'main' || !plansOfProfile(S.profile).length);

  $('.prof-btn').classList.toggle('hidden', S.profiles.length < 2);
  const prof = S.profiles.find((p) => p.id === S.profile);
  const profBadge = $('#profBadge');
  if (prof) { profBadge.textContent = prof.name.slice(0, 2).toUpperCase(); profBadge.classList.remove('hidden'); }
  else profBadge.classList.add('hidden');

  $('#app').innerHTML = v === 'planEdit' ? viewPlanEdit() : v === 'history' ? viewHistory() : viewMain();
}

/* ---------------- Hauptseite ---------------- */
function viewMain() {
  const myPlans = plansOfProfile(S.profile);
  if (!myPlans.length) return '<div class="empty">Noch kein Plan in diesem Profil angelegt.</div>';
  if (!S.day || !myPlans.some((p) => p.id === S.day)) S.day = myPlans[0].id;
  const plan = myPlans.find((p) => p.id === S.day);
  ensureDraft(plan.id);

  let h = '<div class="daybar">' + myPlans.map((p) =>
    '<button class="dayseg' + (p.id === S.day ? ' on' : '') + '" data-action="day" data-id="' + p.id + '">' +
    esc(p.name) + '</button>').join('') + '</div>';

  const today = todayISO();
  const curDate = curDateFor(plan.id);
  const planWorkouts = S.workouts.filter((w) => w.planId === plan.id); // schon neueste zuerst
  const existingW = planWorkouts.find((w) => w.date === curDate);

  let meta = fmtFullDate(curDate);
  if (curDate === today) {
    const prevW = planWorkouts.find((w) => w.date < curDate);
    meta += existingW ? ' · heute bereits gespeichert (erneutes Speichern überschreibt)'
      : prevW ? ' · zuletzt ' + fmtShort(prevW.date) : ' · noch nie trainiert';
  } else {
    meta += existingW ? ' · wird bearbeitet (Speichern überschreibt)' : ' · neue Einheit, noch nicht gespeichert';
  }

  h += '<div class="daymeta"><div class="daymeta-row">' +
    '<input type="date" class="date-in" data-in="cur-date" data-plan="' + plan.id + '" value="' + curDate + '" max="' + today + '">' +
    '<select class="hist-pick" data-in="hist-pick" data-plan="' + plan.id + '">' +
    '<option value="">Vergangene Einheit…</option>' +
    planWorkouts.map((w) => '<option value="' + w.date + '"' + (w.date === curDate ? ' selected' : '') + '>' +
      esc(fmtShort(w.date) + (w.demo ? ' · Demo' : '')) + '</option>').join('') +
    '</select></div><div class="daymeta-txt">' + esc(meta) +
    (curDate !== today ? '<button type="button" class="lnk" data-action="today" data-id="' + plan.id + '">heute</button>' : '') +
    '</div></div>';

  /* Aufeinanderfolgende Positionen mit gleichem Blockbuchstaben zu einer Gruppe
     zusammenfassen, jede Gruppe bekommt eine eigene umrandete Sektion. */
  const groups = [];
  plan.items.forEach((it) => {
    const g = grpKey(it.block);
    const last = groups[groups.length - 1];
    if (!last || last.key !== g) groups.push({ key: g, items: [it] });
    else last.items.push(it);
  });
  groups.forEach((grp) => {
    const sets = grp.items[0] && grp.items[0].targetSets;
    h += '<div class="blk-card"><div class="blk-h"><span class="t">' + esc(grpLabel(grp.key)) + '</span>' +
      (sets ? '<span class="n">· ' + esc(sets) + ' Sätze</span>' : '') + '</div>';
    grp.items.forEach((it, i) => { if (i) h += '<div class="ex-div"></div>'; h += planRow(plan, it); });
    h += '</div>';
  });

  return h;
}

function ensureDraft(planId) {
  const date = curDateFor(planId);
  const cur = S.draft[planId];
  if (cur && cur._date === date) return;

  const plan = S.plans.find((p) => p.id === planId);
  const existingW = S.workouts.find((w) => w.planId === planId && w.date === date);
  const d = { _date: date };
  plan.items.forEach((it) => {
    if (unitOf(it.exerciseId) === 'x') return;
    const e = existingW && entryIn(existingW, it.exerciseId);
    if (e) {
      d[it.exerciseId] = { weight: e.weight > 0 ? fmtKg(e.weight) : '', done: !!e.done };
    } else {
      const prev = lastLog(it.exerciseId, planId, date);
      d[it.exerciseId] = { weight: prev && prev.weight > 0 ? fmtKg(prev.weight) : '', done: false };
    }
  });
  S.draft[planId] = d;
  saveDraft();
}

function planRow(plan, it) {
  const exId = it.exerciseId;
  const unit = unitOf(exId);
  const tracked = unit !== 'x';
  const isOpen = tracked && S.openKey === plan.id + '|' + exId;
  const d = tracked ? S.draft[plan.id][exId] : null;
  const prev = tracked ? lastLog(exId, plan.id, curDateFor(plan.id)) : null;
  const up = tracked && prev && prev.done && prev.weight > 0;

  let h = '<div class="nm"' + (tracked ? ' data-action="toggle-hist" data-id="' + exId + '"' : '') + '>' +
    '<b>' + esc(exName(exId)) +
    (tracked ? '<span class="chev-ico' + (isOpen ? ' on' : '') + '">›</span>' : '') + '</b>' +
    (it.hint ? '<span>' + esc(it.hint) + '</span>' : '') +
    '</div>';

  if (!tracked) {
    h += '<div class="bc"></div><div class="reps-plain">' + esc(it.targetReps || '') + '</div>';
  } else {
    const cid = 'chk-' + plan.id + '-' + exId;
    const prefix = unit === 'kg' && it.targetReps ? esc(it.targetReps) + ' ×' : '';
    h += '<div class="bc">' + (up ? '<span class="up-badge">↑</span>' : '') + '</div>' +
      '<div class="fp">' +
      '<input type="checkbox" class="vh" id="' + cid + '" data-in="done" data-plan="' + plan.id + '" data-id="' + exId + '"' +
      (d.done ? ' checked' : '') + '>' +
      '<div class="fp-main"><span class="x">' + prefix + '</span>' +
      '<span class="fp-valwrap"><input type="text" inputmode="decimal" data-in="weight" data-plan="' + plan.id + '" data-id="' + exId + '" ' +
      'value="' + esc(d.weight) + '" placeholder="–"><span class="unit">' + UNITS[unit] + '</span></span></div>' +
      '<label for="' + cid + '" class="fp-tgl"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></label>' +
      '</div>';
  }

  if (isOpen) h += historyBox(exId, plan.id, unit);

  return h;
}

/* Chart + Tabelle für eine Übungsreihe – geteilt zwischen der aufklappbaren Historie
   auf der Hauptseite (historyBox(), Chart unbegrenzt/Tabelle letzte 10) und den
   Chartkarten der Verlauf-Seite (viewHistory(), beides gleich gefiltert). Mit
   opts.clickable öffnet ein Tippen auf eine Tabellenzeile die ganze Einheit dieses
   Tages (openWorkoutDetail) – einziger verbliebener Weg, eine ganze Einheit zu
   löschen, seit die Verlauf-Seite keine flache Sitzungsliste mehr ist. */
function chartCard(chartPts, tablePts, unit, opts) {
  opts = opts || {};
  let h = '<div class="chartbox">' + Chart.line(chartPts, { unit }) + '</div>';
  if (tablePts.length) {
    h += '<div class="histtab-wrap"><table class="histtab"><tr><th>Datum</th><th class="num">Gewicht</th></tr>';
    tablePts.slice().reverse().forEach((p) => {
      const attrs = opts.clickable ? ' class="clickable" data-action="hist-open" data-id="' + p.id + '"' : '';
      h += '<tr' + attrs + '><td>' + fmtShort(p.date) + '</td><td class="num">' + fmtKg(p.y) + ' ' + unit + '</td></tr>';
    });
    h += '</table></div>';
  }
  return h;
}

function historyBox(exId, planId, unit) {
  const pts = seriesFor(exId, planId);
  return '<div class="histbox">' + chartCard(pts, pts.slice(-10), UNITS[unit], {}) + '</div>';
}

/* ---------------- Einheit speichern ---------------- */
/* Speichert alle Übungen mit einem Gewicht (auch unverändert übernommene) oder
   abgehaktem "geschafft", für das aktuell gewählte Datum (Default heute, editierbar
   für rückwirkendes Bearbeiten, siehe curDateFor()). Ein zweites Speichern desselben
   Datums überschreibt den vorhandenen Eintrag, statt einen zweiten anzulegen. Der
   Draft bleibt danach erhalten (Haken bleiben angehakt) – ein Reset passiert erst,
   wenn ein anderes Datum gewählt wird (siehe ensureDraft()). */
async function saveWorkout() {
  const plan = S.plans.find((p) => p.id === S.day);
  if (!plan) return;
  const date = curDateFor(plan.id);
  const draft = S.draft[plan.id] || {};
  const entries = [];
  let trackedCount = 0;
  plan.items.forEach((it) => {
    const d = draft[it.exerciseId];
    if (!d) return;
    trackedCount++;
    const weight = num(d.weight);
    if (!(weight > 0) && !d.done) return;
    entries.push({ exerciseId: it.exerciseId, block: it.block || '', weight, done: !!d.done });
  });
  if (!entries.length) { toast('Nichts einzutragen – erst ein Gewicht eintragen'); return; }
  const missing = trackedCount - entries.length;

  const existing = S.workouts.find((w) => w.planId === plan.id && w.date === date);
  const w = {
    id: existing ? existing.id : uid(),
    date, startedAt: existing ? existing.startedAt : Date.now(), finishedAt: Date.now(),
    planId: plan.id, planName: plan.name, entries,
  };
  await DB.put('workouts', w);
  S.workouts = existing ? S.workouts.map((x) => (x.id === w.id ? w : x)) : [w, ...S.workouts];
  S.workouts.sort(byDateDesc);
  saveDraft();
  S.openKey = null;
  render();
  const today = todayISO();
  const label = date === today
    ? (existing ? 'Heutige Einheit aktualisiert' : 'Einheit gespeichert')
    : (existing ? 'Einheit vom ' + fmtShort(date) + ' aktualisiert' : 'Einheit für ' + fmtShort(date) + ' gespeichert');
  toast(label + (missing ? ' · ' + missing + ' Übung' + (missing > 1 ? 'en' : '') + ' ohne Gewicht nicht gespeichert' : ''), 3200);
}

/* ---------------- Menü ---------------- */
function openMenu() {
  const hasDemo = S.workouts.some((w) => w.demo);
  let h = '<div class="modal-h"><h2>Menü</h2><button class="icon-btn" data-action="modal-close">✕</button></div>';
  h += '<div class="sec-title">Verlauf</div>' +
    '<div class="item" data-action="history"><div class="grow"><strong>Fortschritt &amp; Verlauf</strong>' +
    '<span class="mut sm">' + S.workouts.length + (S.workouts.length === 1 ? ' Einheit gespeichert' : ' Einheiten gespeichert') +
    '</span></div><span class="chev">›</span></div>';
  h += '<div class="sec-title">Pläne</div>';
  plansOfProfile(S.profile).forEach((p) => {
    h += '<div class="item" data-action="plan-edit" data-id="' + p.id + '">' +
      '<div class="grow"><strong class="ellip">' + esc(p.name) + '</strong>' +
      '<span class="mut sm">' + p.items.length + ' Übungen</span></div><span class="chev">›</span></div>';
  });
  h += '<div class="sec-title">Daten</div>' +
    '<div class="btn-row"><button class="btn primary" data-action="export">Backup exportieren</button>' +
    '<button class="btn" data-action="import">Import</button></div>';
  if (hasDemo) h += '<button class="btn full ghost" style="margin-top:8px" data-action="demo-del">Demodaten löschen</button>';
  h += '<button class="btn full ghost danger" style="margin-top:8px" data-action="wipe">Alle Daten löschen</button>';
  openModal(h);
}

async function demoDel() {
  if (!confirm('Alle Demo-Einheiten löschen? Deine eigenen Einheiten bleiben erhalten.')) return;
  const toDel = S.workouts.filter((w) => w.demo);
  for (const w of toDel) await DB.del('workouts', w.id);
  S.workouts = S.workouts.filter((w) => !w.demo);
  S.draft = {};
  S.dates = {};
  await DB.put('meta', { key: 'draft', value: S.draft });
  closeModal(); render();
  toast('Demodaten gelöscht');
}

/* ---------------- Verlauf ---------------- */
const HIST_FILTERS = [['10', 'Letzte 10'], ['all', 'Gesamt'], ['12', '12 Mon.'], ['6', '6 Mon.'], ['2', '2 Mon.'], ['1', '1 Mon.']];

/* Filtert eine chronologische Punktreihe (seriesFor()) nach der Verlauf-Seiten-Auswahl. */
function filterSeries(pts, filter) {
  if (filter === '10') return pts.slice(-10);
  if (filter === 'all') return pts;
  const months = parseInt(filter, 10);
  const cutoff = Date.now() - months * 30 * 24 * 3600 * 1000;
  return pts.filter((p) => p.t >= cutoff);
}

/* Pläne oben (Umschalter wie auf der Hauptseite), darunter je Übung eine Chartkarte
   mit Kurve + Tabelle für den gewählten Zeitraum/Umfang (statt der früheren flachen,
   nach Monat gruppierten Sitzungsliste). */
function viewHistory() {
  const myPlans = plansOfProfile(S.profile);
  if (!myPlans.length) return '<div class="empty">Noch kein Plan in diesem Profil angelegt.</div>';
  if (!S.histPlan || !myPlans.some((p) => p.id === S.histPlan)) S.histPlan = S.day || myPlans[0].id;
  const plan = myPlans.find((p) => p.id === S.histPlan);

  let h = '<div class="daybar">' + myPlans.map((p) =>
    '<button class="dayseg' + (p.id === S.histPlan ? ' on' : '') + '" data-action="hist-plan" data-id="' + p.id + '">' +
    esc(p.name) + '</button>').join('') + '</div>';

  h += '<div class="filter-row">' + HIST_FILTERS.map(([v, label]) =>
    '<button class="fchip' + (S.histFilter === v ? ' on' : '') + '" data-action="hist-filter" data-id="' + v + '">' +
    esc(label) + '</button>').join('') + '</div>';

  const tracked = plan.items.filter((it) => unitOf(it.exerciseId) !== 'x');
  let any = false;
  tracked.forEach((it) => {
    const exId = it.exerciseId, unit = unitOf(exId);
    const full = seriesFor(exId, plan.id);
    if (!full.length) return;
    any = true;
    const pts = filterSeries(full, S.histFilter);
    h += '<div class="hist-card"><div class="hist-card-h">' + esc(exName(exId)) +
      '<span class="mut sm">' + esc(grpLabel(grpKey(it.block))) + '</span></div>';
    h += pts.length ? chartCard(pts, pts, UNITS[unit], { clickable: true })
      : '<div class="empty" style="padding:22px 4px">Keine Einträge im gewählten Zeitraum.</div>';
    h += '</div>';
  });
  if (!any) h += '<div class="empty">Noch keine Trainingsdaten für „' + esc(plan.name) + '".</div>';

  return h;
}

function openWorkoutDetail(id) {
  const w = S.workouts.find((x) => x.id === id);
  if (!w) return;
  const done = (w.entries || []).filter((e) => e.done).length;
  let h = '<div class="modal-h"><h2 class="ellip">' + esc(w.planName || 'Training') + '</h2>' +
    '<button class="icon-btn" data-action="modal-close">✕</button></div>' +
    '<div class="mut" style="margin-bottom:12px">' + fmtDate(w.date) + ' · ' + done + ' von ' + (w.entries || []).length + ' geschafft' +
    (w.demo ? ' · Demo' : '') + '</div>' +
    '<table class="ptab"><tr><th>Block</th><th>Übung</th><th class="num">Gewicht</th><th class="num"></th></tr>';
  (w.entries || []).forEach((e) => {
    const unit = unitOf(e.exerciseId);
    h += '<tr><td class="blk-c">' + esc(e.block || '') + '</td><td>' + esc(exName(e.exerciseId)) + '</td>' +
      '<td class="num nowrap">' + (e.weight > 0 ? fmtKg(e.weight) + ' ' + UNITS[unit] : '–') + '</td>' +
      '<td class="num ' + (e.done ? 'ok' : 'no') + '">' + (e.done ? '✓' : '✗') + '</td></tr>';
  });
  h += '</table><div class="btn-row" style="margin-top:14px">' +
    '<button class="btn ghost danger" data-action="hist-del" data-id="' + w.id + '">Löschen</button>' +
    '<button class="btn primary" data-action="modal-close">Schließen</button></div>';
  openModal(h);
}

async function deleteWorkout(id) {
  if (!confirm('Diese Einheit endgültig löschen?')) return;
  await DB.del('workouts', id);
  S.workouts = S.workouts.filter((w) => w.id !== id);
  closeModal(); render();
}

/* ---------------- Plan bearbeiten ---------------- */
function viewPlanEdit() {
  const p = S.editPlan;
  if (!p) return '<div class="empty">Plan nicht gefunden.</div>';
  let h = '<label class="fld"><span>Name des Plans</span>' +
    '<input type="text" data-in="p-name" value="' + esc(p.name) + '"></label>' +
    '<div class="sec-title">Übungen</div>';
  if (!p.items.length) h += '<div class="empty">Noch keine Übung im Plan.</div>';

  p.items.forEach((it, i) => {
    h += '<div class="card tight" style="margin-bottom:8px">' +
      '<div class="row" style="margin-bottom:8px"><strong class="grow ellip">' + esc(exName(it.exerciseId)) + '</strong>' +
      '<button class="xbtn" data-action="pi-up" data-i="' + i + '">▲</button>' +
      '<button class="xbtn" data-action="pi-down" data-i="' + i + '">▼</button>' +
      '<button class="xbtn" data-action="pi-del" data-i="' + i + '">✕</button></div>' +
      '<div class="g3">' +
      '<label class="fld" style="margin:0"><span>Block</span><input type="text" data-in="pi-block" data-i="' + i + '" value="' + esc(it.block || '') + '" placeholder="A1"></label>' +
      '<label class="fld" style="margin:0"><span>Sätze</span><input type="text" data-in="pi-sets" data-i="' + i + '" value="' + esc(it.targetSets || '') + '" placeholder="3"></label>' +
      '<label class="fld" style="margin:0"><span>Wdh.</span><input type="text" data-in="pi-reps" data-i="' + i + '" value="' + esc(it.targetReps || '') + '" placeholder="8–12"></label>' +
      '</div><label class="fld" style="margin:8px 0 0"><span>Hinweis</span>' +
      '<input type="text" data-in="pi-hint" data-i="' + i + '" value="' + esc(it.hint || '') + '" placeholder="z.B. 3 s exzentrisch"></label></div>';
  });

  h += '<button class="btn full blue" data-action="pi-add" style="margin-top:6px">+ Übung hinzufügen</button>' +
    '<button class="btn full primary" style="margin-top:14px" data-action="plan-save">Speichern</button>';
  return h;
}

async function savePlan() {
  const p = S.editPlan;
  p.name = (p.name || '').trim() || p.name;
  p.items = p.items.map((it) => ({
    exerciseId: it.exerciseId, block: (it.block || '').trim(),
    targetSets: String(it.targetSets || '').trim(), targetReps: String(it.targetReps || '').trim(),
    hint: (it.hint || '').trim(),
  }));
  await DB.put('plans', p);
  S.plans = S.plans.map((x) => (x.id === p.id ? p : x));
  sortPlans();
  delete S.draft[p.id];
  delete S.dates[p.id];
  saveDraft();
  S.editPlan = null;
  S.day = p.id;
  toast('Plan gespeichert');
  nav('main');
}

/* ---------------- Übung wählen / anlegen (aus dem Plan-Editor) ---------------- */
function openPicker() {
  openModal('<div class="modal-h"><h2>Übung wählen</h2><button class="icon-btn" data-action="modal-close">✕</button></div>' +
    '<input type="text" id="pickSearch" placeholder="Suchen…" autocomplete="off">' +
    '<div id="pickList" style="margin-top:12px"></div>' +
    '<button class="btn full ghost" style="margin-top:10px" data-action="ex-new">+ Neue Übung anlegen</button>');
  renderPicker('');
  $('#pickSearch').addEventListener('input', (e) => renderPicker(e.target.value));
}

function renderPicker(q) {
  q = q.trim().toLowerCase();
  const list = S.exercises.filter((e) => !q || e.name.toLowerCase().includes(q) || (e.muscle || '').toLowerCase().includes(q));
  const byM = {};
  list.forEach((e) => { (byM[e.muscle || 'Sonstige'] = byM[e.muscle || 'Sonstige'] || []).push(e); });
  let h = '';
  Object.keys(byM).sort((a, b) => a.localeCompare(b, 'de')).forEach((m) => {
    h += '<div class="sec-title">' + esc(m) + '</div>';
    byM[m].forEach((e) => { h += '<div class="item" data-action="pick" data-id="' + e.id + '"><div class="grow ellip">' + esc(e.name) + '</div></div>'; });
  });
  $('#pickList').innerHTML = h || '<div class="empty">Nichts gefunden.</div>';
}

function pickExercise(id) {
  if (S.editPlan) {
    S.editPlan.items.push({ exerciseId: id, block: nextBlock(S.editPlan.items), targetSets: '3', targetReps: '8–12', hint: '' });
  }
  closeModal(); render();
}
/* schlägt A1, A2, A3 … fort - sucht rückwärts den letzten auswertbaren Blockcode,
   damit ein Eintrag ohne Nummer (z.B. früher "Finisher") die Zählung nicht auf
   A1 zurückwirft. */
function nextBlock(items) {
  for (let i = items.length - 1; i >= 0; i--) {
    const m = /^([A-Za-z])(\d+)$/.exec(items[i].block || '');
    if (m) return m[1] + (parseInt(m[2], 10) + 1);
  }
  return 'A1';
}

function openExerciseForm() {
  const muscles = ['Brust', 'Rücken', 'Beine', 'Schultern', 'Arme', 'Rumpf', 'Cardio', 'Sonstige'];
  const units = [['kg', 'Gewicht in kg'], ['s', 'Zeit in Sekunden'], ['x', 'ohne Gewicht (nur abhaken)']];
  openModal('<div class="modal-h"><h2>Neue Übung</h2><button class="icon-btn" data-action="modal-close">✕</button></div>' +
    '<label class="fld"><span>Name</span><input type="text" id="exName" placeholder="z.B. Beinpresse einbeinig"></label>' +
    '<label class="fld"><span>Muskelgruppe</span><select id="exMuscle">' +
    muscles.map((m) => '<option>' + m + '</option>').join('') + '</select></label>' +
    '<label class="fld"><span>Protokolliert wird</span><select id="exUnit">' +
    units.map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select></label>' +
    '<button class="btn full primary" data-action="ex-save">Speichern</button>');
  setTimeout(() => $('#exName') && $('#exName').focus(), 60);
}

async function saveExercise() {
  const name = ($('#exName').value || '').trim();
  if (!name) { toast('Bitte einen Namen eingeben'); return; }
  const ex = { id: uid(), name, muscle: $('#exMuscle').value, unit: $('#exUnit').value };
  S.exercises.push(ex);
  await DB.put('exercises', ex);
  sortExercises();
  closeModal();
  pickExercise(ex.id);
}

/* ---------------- Stoppuhr ---------------- */
/* Frei zugänglich über das Topbar-Icon, unabhängig von Übung/Tag - für Planks,
   Side Plank & Co., deren Sekunden man danach von Hand ins Gewichtsfeld einträgt.
   Läuft weiter, auch wenn das Modal geschlossen wird (nur die Zeitbasis zählt). */
let _swTimer = null;
const swElapsedMs = () => S.stopwatch.elapsed + (S.stopwatch.running ? Date.now() - S.stopwatch.startedAt : 0);
const swFmt = (ms) => {
  const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
};
const swFmtShort = (ms) => {
  const s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

function swTick() {
  const disp = $('#swDisplay'); if (disp) disp.textContent = swFmt(swElapsedMs());
  const badge = $('#swBadge');
  if (badge) {
    if (S.stopwatch.running) { badge.textContent = swFmtShort(swElapsedMs()); badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
}

function stopwatchHTML() {
  return '<div class="modal-h"><h2>Stoppuhr</h2><button class="icon-btn" data-action="modal-close">✕</button></div>' +
    '<div class="sw-display" id="swDisplay">' + swFmt(swElapsedMs()) + '</div>' +
    '<div class="btn-row" style="margin-top:18px">' +
    (S.stopwatch.running
      ? '<button class="btn full blue" data-action="sw-pause">Pause</button>'
      : '<button class="btn full primary" data-action="sw-start">' + (S.stopwatch.elapsed ? 'Weiter' : 'Start') + '</button>') +
    '<button class="btn full ghost" data-action="sw-reset">Zurücksetzen</button></div>';
}

function openStopwatch() { openModal(stopwatchHTML()); swTick(); }

function swStart() {
  S.stopwatch.running = true; S.stopwatch.startedAt = Date.now();
  clearInterval(_swTimer); _swTimer = setInterval(swTick, 200);
  openModal(stopwatchHTML()); swTick();
}
function swPause() {
  S.stopwatch.elapsed = swElapsedMs(); S.stopwatch.running = false;
  clearInterval(_swTimer);
  openModal(stopwatchHTML()); swTick();
}
function swReset() {
  clearInterval(_swTimer);
  S.stopwatch = { startedAt: null, elapsed: 0, running: false };
  openModal(stopwatchHTML()); swTick();
}

/* ---------------- Modals ---------------- */
function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }

/* ---------------- Export / Import ---------------- */
async function exportData() {
  const data = {
    app: 'gymlog', version: 4, exportedAt: new Date().toISOString(),
    exercises: S.exercises, profiles: S.profiles, plans: S.plans, workouts: S.workouts,
  };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gymlog-backup-' + todayISO() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup erstellt');
}

function importData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || d.app !== 'gymlog') throw new Error('Kein Gym-Log-Backup');
      if (!confirm('Backup vom ' + (d.exportedAt || '').slice(0, 10) + ' einspielen?\nAlle aktuellen Daten werden ersetzt.')) return;
      for (const s of DB.stores) await DB.clear(s);
      await DB.putAll('exercises', d.exercises || []);
      await DB.putAll('profiles', d.profiles || []);
      await DB.putAll('plans', d.plans || []);
      await DB.putAll('workouts', d.workouts || []);
      await DB.put('meta', { key: 'seed', value: SEED_VERSION });
      await DB.put('meta', { key: 'demoSeeded', value: true });
      location.reload();
    } catch (e) { alert('Import fehlgeschlagen: ' + e.message); }
  };
  inp.click();
}

async function wipe() {
  if (!confirm('Wirklich ALLE Daten löschen (Trainings, Pläne, Übungen)?')) return;
  if (!confirm('Letzte Warnung – nicht rückgängig machbar. Hast du ein Backup exportiert?')) return;
  for (const s of DB.stores) await DB.clear(s);
  location.reload();
}

/* ---------------- Events ---------------- */
function bindEvents() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
}

function onClick(ev) {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action, id = el.dataset.id, i = +el.dataset.i;

  switch (a) {
    case 'menu': openMenu(); break;
    case 'back': nav(BACKABLE[S.view] || 'main'); break;
    case 'modal-close': closeModal(); break;

    case 'profile-switch': switchProfile(); break;
    case 'stopwatch': openStopwatch(); break;
    case 'sw-start': swStart(); break;
    case 'sw-pause': swPause(); break;
    case 'sw-reset': swReset(); break;

    case 'day': S.day = id; S.openKey = null; render(); break;
    case 'toggle-hist': { const key = S.day + '|' + id; S.openKey = S.openKey === key ? null : key; render(); break; }
    case 'save-workout': saveWorkout(); break;
    case 'today': delete S.dates[id]; S.openKey = null; render(); break;

    case 'history': closeModal(); nav('history'); break;
    case 'hist-plan': S.histPlan = id; render(); break;
    case 'hist-filter': S.histFilter = id; render(); break;
    case 'hist-open': openWorkoutDetail(id); break;
    case 'hist-del': deleteWorkout(id); break;

    case 'plan-edit': closeModal(); S.editPlan = JSON.parse(JSON.stringify(S.plans.find((p) => p.id === id))); nav('planEdit'); break;
    case 'plan-save': savePlan(); break;
    case 'pi-add': openPicker(); break;
    case 'pi-del': S.editPlan.items.splice(i, 1); render(); break;
    case 'pi-up': if (i > 0) { const it = S.editPlan.items.splice(i, 1)[0]; S.editPlan.items.splice(i - 1, 0, it); render(); } break;
    case 'pi-down': if (i < S.editPlan.items.length - 1) { const it = S.editPlan.items.splice(i, 1)[0]; S.editPlan.items.splice(i + 1, 0, it); render(); } break;

    case 'pick': pickExercise(id); break;
    case 'ex-new': openExerciseForm(); break;
    case 'ex-save': saveExercise(); break;

    case 'export': exportData(); break;
    case 'import': importData(); break;
    case 'demo-del': demoDel(); break;
    case 'wipe': wipe(); break;
  }
}

function onInput(ev) {
  const el = ev.target, k = el.dataset.in;
  if (k === 'weight') {
    const pid = el.dataset.plan, id = el.dataset.id;
    if (S.draft[pid] && S.draft[pid][id]) { S.draft[pid][id].weight = el.value; saveDraft(); }
    return;
  }
  if (!S.editPlan) return;
  const i = +el.dataset.i;
  if (k === 'p-name') S.editPlan.name = el.value;
  else if (k === 'pi-block') S.editPlan.items[i].block = el.value;
  else if (k === 'pi-sets') S.editPlan.items[i].targetSets = el.value;
  else if (k === 'pi-reps') S.editPlan.items[i].targetReps = el.value;
  else if (k === 'pi-hint') S.editPlan.items[i].hint = el.value;
}

function onChange(ev) {
  const el = ev.target;
  if (el.dataset.in === 'done') {
    const pid = el.dataset.plan, id = el.dataset.id;
    if (S.draft[pid] && S.draft[pid][id]) { S.draft[pid][id].done = el.checked; saveDraft(); }
  } else if (el.dataset.in === 'cur-date' || el.dataset.in === 'hist-pick') {
    const pid = el.dataset.plan;
    if (!el.value) return;
    S.dates[pid] = el.value;
    S.openKey = null;
    render();
  }
}

init();
