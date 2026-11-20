// Leonida Legend — GTA VI trophy guide and tracker.
// Loads app/data/trophies.json, renders the checklist, roadmap and missables,
// and keeps earned progress in localStorage with export / import.
const STORE_KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-hide-spoilers-v1';
const DATA_URL = 'data/trophies.json';

const STAGES = [
  { n: 1, title: 'Stage 1 — Play the story', text: 'Chapters 1 to 4, every named story mission, and the final mission. These trophies come free as you play; just keep moving through the story.' },
  { n: 2, title: 'Stage 2 — Strangers and partners', text: 'The five named stranger strands (Andy, Kenton, Billy, Randy, Tyrone), the 8 strands for Strangers & Freaks, Bret\u2019s hunt, and the partner trophies that need your partner beside you.' },
  { n: 3, title: 'Stage 3 — Collectibles and exploration', text: 'Cards, WAiNK It spots, vehicles, all 52 areas of Leonida, meditation spots, and the small flavour moments. Best done region by region.' },
  { n: 4, title: 'Stage 4 — Activities and combat', text: 'Stunts, the shooting range, races, fishing, the arcade, challenges, robberies, Combat Focus and the one-off set pieces. The long grinds live here.' },
  { n: 5, title: 'Stage 5 — Money and the platinum', text: 'Launder $250,000, spend $100,000, buy all 8 garages, register 10 vehicles, hit 100% completion — then the platinum pops.' },
];

const KIND_LABELS = { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detail');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoilers');
const hideEarnedEl = document.getElementById('hideEarned');
const resultLine = document.getElementById('resultLine');
const onlineNote = document.getElementById('onlineNote');

let trophies = [];
let earned = new Set(loadProgress());
let kindFilter = 'all';
let selectedId = null;

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isSpoilerHidden(t) {
  return spoilerEl.checked && t.kind === 'story' && t.grade !== 'platinum' && !earned.has(t.id);
}

function displayName(t) {
  return isSpoilerHidden(t) ? 'Hidden story trophy' : t.name;
}

function displayDesc(t) {
  return isSpoilerHidden(t) ? 'Hidden until earned — turn off “Hide story spoilers” to reveal it.' : t.description;
}

function gradeBadge(t) {
  const span = document.createElement('span');
  span.className = 'grade-badge grade-' + t.grade;
  span.textContent = t.grade;
  return span;
}

function trophyMetaText(t) {
  const bits = [];
  bits.push(KIND_LABELS[t.kind] || t.kind);
  if (t.count) bits.push('Count: ' + t.count.toLocaleString('en-US'));
  bits.push('Roadmap stage ' + t.stage);
  return bits.join(' · ');
}

function renderCounts() {
  const counts = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const t of trophies) {
    counts[t.kind] = (counts[t.kind] || 0) + 1;
    if (t.missable) counts.missable += 1;
  }
  for (const el of document.querySelectorAll('[data-count]')) {
    el.textContent = '(' + (counts[el.dataset.count] || 0) + ')';
  }
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  const others = total - 1; // everything except the platinum itself
  const othersDone = trophies.filter((t) => t.grade !== 'platinum' && earned.has(t.id)).length;
  document.getElementById('earnedCount').textContent = done;
  document.getElementById('barFill').style.width = total ? Math.round((done / total) * 100) + '%' : '0%';
  document.getElementById('progressSub').textContent =
    'Platinum: Vice Got a Price! — ' + othersDone + ' of ' + others + ' others earned';
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] || { got: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.id)) byGrade[t.grade].got += 1;
  }
  document.getElementById('gradeLine').textContent =
    ['platinum', 'gold', 'silver', 'bronze'].map((g) => g + ' ' + byGrade[g].got + '/' + byGrade[g].total).join('  ·  ');
}

function matchesFilter(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter === 'online') return false; // this list has no online trophies
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (hideEarnedEl.checked && earned.has(t.id)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
  return true;
}

function renderList() {
  listEl.replaceChildren();
  const shown = trophies.filter(matchesFilter);
  for (const t of shown) {
    const li = document.createElement('li');
    if (earned.has(t.id)) li.classList.add('earned');
    if (selectedId === t.id) li.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Earned: ' + displayName(t));
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveProgress();
      renderAll();
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = displayName(t);
    if (isSpoilerHidden(t)) name.classList.add('spoiler');
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = displayDesc(t);
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const metaText = document.createElement('span');
    metaText.textContent = trophyMetaText(t);
    meta.append(metaText);
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = 'MISSABLE';
      meta.append(flag);
    }
    body.append(name, desc, meta);
    li.append(box, body, gradeBadge(t));
    li.addEventListener('click', (event) => {
      if (event.target === box) return;
      selectedId = t.id;
      renderDetail();
      renderList();
      syncHash();
    });
    listEl.append(li);
  }
  if (kindFilter === 'online') {
    onlineNote.hidden = false;
    resultLine.textContent = '0 trophies — this list has no online trophies.';
  } else {
    onlineNote.hidden = true;
    resultLine.textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
      (earned.size ? ' · ' + earned.size + ' earned' : '');
  }
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId);
  detailEl.replaceChildren();
  if (!t) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  const h2 = document.createElement('h2');
  h2.textContent = displayName(t);
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = '“' + displayDesc(t) + '”';
  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.textContent = t.grade.charAt(0).toUpperCase() + t.grade.slice(1) + ' · ' + trophyMetaText(t) +
    (t.missable ? ' · MISSABLE — do this one on time' : '');
  const guideH = document.createElement('h3');
  guideH.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'guide-text';
  guide.textContent = t.guide;
  const srcH = document.createElement('h3');
  srcH.textContent = 'Sources';
  const srcList = document.createElement('ul');
  srcList.className = 'sources';
  for (const s of t.sources || []) {
    const li = document.createElement('li');
    li.textContent = s;
    srcList.append(li);
  }
  const earnedBtn = document.createElement('button');
  earnedBtn.type = 'button';
  earnedBtn.className = 'filter-btn';
  earnedBtn.style.marginTop = '14px';
  earnedBtn.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  earnedBtn.addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id);
    else earned.add(t.id);
    saveProgress();
    renderAll();
  });
  detailEl.append(h2, official, meta, guideH, guide, srcH, srcList, earnedBtn);
}

function renderRoadmap() {
  const stagesEl = document.getElementById('stages');
  stagesEl.replaceChildren();
  for (const stage of STAGES) {
    const li = document.createElement('li');
    const h3 = document.createElement('h3');
    h3.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const names = document.createElement('div');
    names.className = 'stage-trophies';
    const inStage = trophies.filter((t) => t.stage === stage.n);
    const got = inStage.filter((t) => earned.has(t.id)).length;
    names.textContent = got + '/' + inStage.length + ' earned: ' +
      inStage.map((t) => (earned.has(t.id) ? '✓ ' : '') + (t.missable ? '⚠ ' : '') + displayName(t)).join(' · ');
    li.append(h3, p, names);
    stagesEl.append(li);
  }
}

function renderMissables() {
  const ul = document.getElementById('missList');
  ul.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = t.name + ' (' + t.grade + ')';
    const why = document.createElement('span');
    why.className = 'why';
    why.textContent = 'Stage ' + t.stage + ' — ' + t.guide.split('.')[0] + '.';
    li.append(strong, why);
    ul.append(li);
  }
}

function renderAll() {
  renderProgress();
  renderCounts();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function syncHash() {
  const params = new URLSearchParams();
  if (selectedId) params.set('trophy', String(selectedId));
  history.replaceState(null, '', params.toString() ? '#' + params.toString() : location.pathname);
}

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const id = Number(params.get('trophy'));
  if (id && trophies.some((t) => t.id === id)) selectedId = id;
  const view = params.get('view');
  if (view) setView(view);
}

function setView(view) {
  const known = ['checklist', 'roadmap', 'missables'];
  if (!known.includes(view)) view = 'checklist';
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('checklistPanel').hidden = view !== 'checklist';
  document.getElementById('roadmapPanel').hidden = view !== 'roadmap';
  document.getElementById('missablesPanel').hidden = view !== 'missables';
}

document.querySelectorAll('.view-btn').forEach((b) => {
  b.addEventListener('click', () => setView(b.dataset.view));
});
document.querySelectorAll('.filter-btn[data-kind]').forEach((b) => {
  b.addEventListener('click', () => {
    kindFilter = b.dataset.kind;
    document.querySelectorAll('.filter-btn[data-kind]').forEach((x) => x.classList.toggle('active', x === b));
    renderList();
  });
});
searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);
hideEarnedEl.addEventListener('change', renderList);
spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
  renderAll();
});

document.getElementById('export').addEventListener('click', () => {
  const data = { game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    earned = new Set(ids.filter((x) => typeof x === 'number' && trophies.some((t) => t.id === x)));
    saveProgress();
    renderAll();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
  event.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earned = new Set();
    saveProgress();
    renderAll();
  }
});

spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';
const doc = await (await fetch(DATA_URL)).json();
trophies = doc.trophies || doc;
readHash();
if (!selectedId && trophies.length) selectedId = trophies[0].id;
renderAll();
