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
  workouts: [],             // neueste zuerst
  day: null,                 // aktuell gewählte planId
  draft: {},                 // { [planId]: { [exerciseId]: {weight, done, suggested} } }
  openKey: null,             // "planId|exerciseId" der aufgeklappten Historie
  editPlan: null,
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
const fmtKg = (v) => (Math.round(v * 100) / 100).toLocaleString('de-DE');

const UNITS = { kg: 'kg', s: 'Sek.', x: '' };
const unitOf = (id) => { const e = S.exercises.find((x) => x.id === id); return (e && e.unit) || 'kg'; };
const exName = (id) => { const e = S.exercises.find((x) => x.id === id); return e ? e.name : 'Übung'; };
const exByName = (n) => S.exercises.find((e) => e.name === n);

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
  S.workouts = (await DB.all('workouts')).sort(byDateDesc);

  await ensureSeed();
  await ensureDemo();

  const draftRec = await DB.get('meta', 'draft');
  if (draftRec && draftRec.value) S.draft = draftRec.value;

  sortExercises(); sortPlans();
  if (S.plans.length) S.day = S.plans[0].id;

  bindEvents();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.startedAt || 0) - (a.startedAt || 0));
function sortExercises() { S.exercises.sort((a, b) => a.name.localeCompare(b.name, 'de')); }
function sortPlans() { S.plans.sort((a, b) => (a.order || 0) - (b.order || 0)); }

/* Übungskatalog + Pläne Tag A / Tag B anlegen (einmalig, versioniert). */
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

  for (const [name, rows] of SEED_PLANS) {
    if (S.plans.some((p) => p.name === name)) continue;
    const plan = {
      id: uid(), name, order: S.plans.length,
      items: rows.map(([block, ex, sets, reps, hint]) => ({
        exerciseId: (exByName(ex) || {}).id, block, targetSets: sets, targetReps: reps, hint,
      })).filter((it) => it.exerciseId),
    };
    S.plans.push(plan);
    await DB.put('plans', plan);
  }

  await DB.put('meta', { key: 'seed', value: SEED_VERSION });
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
/* Wurde diese Übung heute bewusst bewertet (nicht nur die Vorgabe stehen gelassen)? */
function touched(e) {
  if (e.done) return true;
  const w = String(e.weight == null ? '' : e.weight).trim();
  const sug = String(e.suggested == null ? '' : e.suggested).trim();
  return w !== '' && w !== sug;
}

function entryIn(w, exId) { return (w.entries || []).find((e) => e.exerciseId === exId) || null; }

/* Letztes Protokoll dieser Übung in diesem Plan (planId + exerciseId, nie nur die Übung). */
function lastLog(exId, planId) {
  for (const w of S.workouts) {
    if (w.planId !== planId) continue;
    const e = entryIn(w, exId);
    if (e) return { weight: num(e.weight), done: !!e.done, date: w.date };
  }
  return null;
}

/* Datenreihe für die Kurve, chronologisch. */
function seriesFor(exId, planId) {
  const out = [];
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const w = S.workouts[i];
    if (w.planId !== planId) continue;
    const e = entryIn(w, exId);
    if (!e || !(num(e.weight) > 0)) continue;
    out.push({
      t: tsOf(w.date), y: num(e.weight), date: w.date,
      label: e.done ? 'geschafft' : 'nicht geschafft',
      c: e.done ? undefined : '#f87171',
    });
  }
  return out;
}

/* ---------------- Router ---------------- */
const TITLES = { main: 'Training', planEdit: 'Plan bearbeiten' };
const BACKABLE = { planEdit: 'main' };

function nav(view) { S.view = view; window.scrollTo(0, 0); render(); }

function render() {
  const v = S.view;
  $('#title').textContent = TITLES[v] || 'Training';
  $('#backBtn').classList.toggle('hidden', !BACKABLE[v]);
  $('#savebar').classList.toggle('hidden', v !== 'main' || !S.plans.length);
  $('#app').innerHTML = v === 'planEdit' ? viewPlanEdit() : viewMain();
}

/* ---------------- Hauptseite ---------------- */
function viewMain() {
  if (!S.plans.length) return '<div class="empty">Noch kein Plan angelegt.</div>';
  if (!S.day || !S.plans.some((p) => p.id === S.day)) S.day = S.plans[0].id;
  const plan = S.plans.find((p) => p.id === S.day);
  ensureDraft(plan.id);

  let h = '<div class="daybar">' + S.plans.map((p) =>
    '<button class="dayseg' + (p.id === S.day ? ' on' : '') + '" data-action="day" data-id="' + p.id + '">' +
    esc(p.name) + '</button>').join('') + '</div>';

  h += '<div class="card" style="padding:6px 10px 10px"><table class="ptab">' +
    '<tr><th>Block</th><th>Übung</th><th class="num">Sätze × Wdh.</th></tr>';
  plan.items.forEach((it) => { h += planRow(plan, it); });
  h += '</table></div>';

  return h;
}

function ensureDraft(planId) {
  if (S.draft[planId]) return;
  const plan = S.plans.find((p) => p.id === planId);
  const d = {};
  plan.items.forEach((it) => {
    if (unitOf(it.exerciseId) === 'x') return;
    const prev = lastLog(it.exerciseId, planId);
    const w = prev && prev.weight > 0 ? fmtKg(prev.weight) : '';
    d[it.exerciseId] = { weight: w, done: false, suggested: w };
  });
  S.draft[planId] = d;
}

function planRow(plan, it) {
  const exId = it.exerciseId;
  const unit = unitOf(exId);
  const tracked = unit !== 'x';

  let h = '<tr class="ex-row"' + (tracked ? ' data-action="toggle-hist" data-id="' + exId + '"' : '') + '>' +
    '<td class="blk-c">' + esc(it.block || '') + '</td>' +
    '<td><div>' + esc(exName(exId)) + '</div>' +
    (it.hint ? '<div class="hint">' + esc(it.hint) + '</div>' : '') + '</td>' +
    '<td class="num nowrap">' + esc((it.targetSets || '?') + ' × ' + (it.targetReps || '?')) + '</td></tr>';

  if (!tracked) return h;

  const d = S.draft[plan.id][exId];
  const prev = lastLog(exId, plan.id);
  const up = prev && prev.done && prev.weight > 0;

  h += '<tr class="w-row"><td colspan="3"><div class="wctrl">' +
    '<div class="winp"><input type="text" inputmode="decimal" data-in="weight" data-plan="' + plan.id + '" data-id="' + exId + '" ' +
    'value="' + esc(d.weight) + '" placeholder="–"><span class="unit">' + UNITS[unit] + '</span></div>' +
    (up ? '<span class="up-badge">↑</span>' : '') +
    '<label class="chk"><input type="checkbox" data-in="done" data-plan="' + plan.id + '" data-id="' + exId + '"' +
    (d.done ? ' checked' : '') + '><span>alles geschafft</span></label></div></td></tr>';

  if (S.openKey === plan.id + '|' + exId) {
    h += '<tr class="hist-row"><td colspan="3">' + historyBox(exId, plan.id, unit) + '</td></tr>';
  }
  return h;
}

function historyBox(exId, planId, unit) {
  const pts = seriesFor(exId, planId);
  let h = '<div class="histbox"><div class="chartbox">' + Chart.line(pts, { unit: UNITS[unit] }) + '</div>';
  if (pts.length) {
    h += '<table class="histtab"><tr><th>Datum</th><th class="num">Gewicht</th><th class="num">Status</th></tr>';
    pts.slice(-10).reverse().forEach((p) => {
      h += '<tr><td>' + fmtShort(p.date) + '</td><td class="num">' + fmtKg(p.y) + ' ' + UNITS[unit] + '</td>' +
        '<td class="num ' + (p.c ? 'no' : 'ok') + '">' + (p.c ? '✗' : '✓') + '</td></tr>';
    });
    h += '</table>';
  }
  return h + '</div>';
}

/* ---------------- Einheit speichern ---------------- */
async function saveWorkout() {
  const plan = S.plans.find((p) => p.id === S.day);
  if (!plan) return;
  const draft = S.draft[plan.id] || {};
  const entries = [];
  let trackedCount = 0;
  plan.items.forEach((it) => {
    const d = draft[it.exerciseId];
    if (!d) return;
    trackedCount++;
    if (!touched(d)) return;
    entries.push({ exerciseId: it.exerciseId, block: it.block || '', weight: num(d.weight), done: !!d.done });
  });
  if (!entries.length) { toast('Nichts protokolliert – erst Gewicht eintragen oder abhaken'); return; }
  const skipped = trackedCount - entries.length;

  const w = {
    id: uid(), date: todayISO(), startedAt: Date.now(), finishedAt: Date.now(),
    planId: plan.id, planName: plan.name, entries,
  };
  await DB.put('workouts', w);
  S.workouts.unshift(w);
  S.workouts.sort(byDateDesc);
  delete S.draft[plan.id];
  saveDraft();
  S.openKey = null;
  render();
  toast('Einheit gespeichert' + (skipped ? ' · ' + skipped + ' Übung' + (skipped > 1 ? 'en' : '') + ' ohne Bewertung übersprungen' : ''), 3200);
}

/* ---------------- Menü ---------------- */
function openMenu() {
  const hasDemo = S.workouts.some((w) => w.demo);
  let h = '<div class="modal-h"><h2>Menü</h2><button class="icon-btn" data-action="modal-close">✕</button></div>';
  h += '<div class="sec-title">Pläne</div>';
  S.plans.forEach((p) => {
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
  await DB.put('meta', { key: 'draft', value: S.draft });
  closeModal(); render();
  toast('Demodaten gelöscht');
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
function nextBlock(items) {
  const last = items.length ? items[items.length - 1].block || '' : '';
  const m = /^([A-Za-z])(\d+)$/.exec(last);
  return m ? m[1] + (parseInt(m[2], 10) + 1) : 'A1';
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

/* ---------------- Modals ---------------- */
function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }

/* ---------------- Export / Import ---------------- */
async function exportData() {
  const data = {
    app: 'gymlog', version: 3, exportedAt: new Date().toISOString(),
    exercises: S.exercises, plans: S.plans, workouts: S.workouts,
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

    case 'day': S.day = id; S.openKey = null; render(); break;
    case 'toggle-hist': { const key = S.day + '|' + id; S.openKey = S.openKey === key ? null : key; render(); break; }
    case 'save-workout': saveWorkout(); break;

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
  }
}

init();
