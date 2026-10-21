/* Wunderino Christmas Advent Calendar — vanilla JS, no dependencies. */
(function () {
"use strict";


/* ============================================================
   CONFIGURATION
   TEST_MODE = true  → every door opens, whatever today's date.
   TEST_MODE = false → door N opens from N December (viewer's local date).
   ============================================================ */
const TEST_MODE = true;

/* Optional clock override for checking production mode, e.g. '2026-12-12T09:00:00'
   (read as local time). Leave null to use the real date. */
const MOCK_DATE = null;

const PROMO_TEXT = 'Epic Week is on. Every day from 17:00 there are 50,000 free Cash Spins in Big Bass Christmas Bash.';
const CTA_LABEL = 'Spiele jetzt';
const CTA_URL = 'https://www.wunderino.de/';

const DOOR_COUNT = 24;
const OPEN_MS = 780;      /* door swing + fade (matches the CSS transitions) */
const REVEAL_MS = 120;    /* pause on the glowing star before the offer appears */
const STORE_KEY = 'advent-opened-v1'; /* remembers opened doors in production mode */
const TOAST_MS = 2800;
const ELF_DAY = 24;       /* this door's pop-up is held by the elf character */

/* Door geometry, in pixels of the 2688 × 1504 artwork. */
const IMG_W = 2688;
const IMG_H = 1504;
const COLS_X = [652, 890, 1122, 1360, 1596, 1834];
const ROWS_Y = [542, 765, 987, 1206];
const DOOR_W = 205;
const DOOR_H = 195;
/* Mobile (portrait) artwork */
const IMG_M_W = 752;
const IMG_M_H = 1344;
const BULBS_M_PX = [[354,119],[400,118],[427,156],[326,157],[387,156],[370,176],[351,196],[337,226],[415,225],[286,246],[467,246],[536,329],[216,330],[427,428],[324,428],[150,474,52],[598,474,52]];
const BULBS_PX = [[2242,1112],[96,1381],[2678,909],[61,371],[377,769],[2593,921],[2126,1103],[2508,1242],[2626,800],[2379,692],[2512,338],[2542,402],[555,1219],[427,330],[2447,658],[2210,1025],[299,750],[471,784],[2117,993],[516,960],[37,563],[2304,742],[2654,591],[2565,277],[2360,803],[2661,1479],[2322,949],[582,776],[2405,895],[337,901],[486,367],[426,1171],[2683,464],[2218,784],[134,774],[2128,894],[2104,600],[575,1094],[146,1076],[788,1461],[860,253],[1214,256],[1501,257],[1668,262],[1010,364],[1070,390],[1611,392],[786,406],[721,428],[882,462],[1093,482],[1796,458],[1878,492],[1992,420],[2030,444],[533,428],[556,482],[1846,352],[1662,362],[1430,234],[1170,266],[2126,494],[892,188],[1776,186]];

/* ---------- Date logic ---------- */
function getToday() {
  return MOCK_DATE ? new Date(MOCK_DATE) : new Date();
}
function releaseDate(day, now) {
  return new Date(now.getFullYear(), 11, day, 0, 0, 0, 0); /* local midnight, current year */
}
function isDoorAvailable(day, now) {
  if (TEST_MODE) return true;
  return now.getTime() >= releaseDate(day, now).getTime();
}
function headingFor(day) {
  return day + ' December';
}
function loadOpened() {
  if (TEST_MODE) return {};
  try {
    const list = JSON.parse(window.localStorage.getItem(STORE_KEY) || '[]');
    const now = getToday(); const out = {};
    list.forEach((d) => { if (isDoorAvailable(d, now)) out[d] = 'open'; });
    return out;
  } catch (e) { return {}; }
}
function saveOpened(doors) {
  if (TEST_MODE) return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(Object.keys(doors).filter((k) => doors[k] === 'open').map(Number)));
  } catch (e) { /* storage unavailable: doors simply reset on reload */ }
}
function prefersReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch (e) { return false; }
}

/* ---------- Static scene data (built once) ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pct(v, total) { return +(v / total * 100).toFixed(4); }
function desktopRects() {
  const out = {};
  for (let i = 0; i < DOOR_COUNT; i++) {
    out[i + 1] = { x: COLS_X[i % 6], y: ROWS_Y[Math.floor(i / 6)], w: DOOR_W, h: DOOR_H };
  }
  return out;
}
function mobileRects() {
  /* Tall artwork: door 1 alone under the logo, then 5 rows of 4 (2–21),
     then 22 · 24 (large, centre) · 23 along the bottom. [x0, y0, x1, y1] in px. */
  const cols = [[138, 246], [261, 369], [383, 490], [506, 614]];
  const rows = [[561, 656], [668, 764], [776, 871], [883, 977], [989, 1084]];
  const box = { 1: [321, 447, 433, 544], 22: [146, 1096, 270, 1210], 24: [286, 1091, 466, 1226], 23: [483, 1096, 610, 1210] };
  let n = 2;
  rows.forEach((r) => cols.forEach((c) => { box[n] = [c[0], r[0], c[1], r[1]]; n++; }));
  const out = {};
  Object.keys(box).forEach((k) => { const b = box[k]; out[k] = { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] }; });
  return out;
}
function buildGeometry(rects, IMG_W, IMG_H) {
  const out = [];
  for (let i = 0; i < DOOR_COUNT; i++) {
    const day = i + 1;
    const r = rects[day];
    out.push({
      day: day,
      l: pct(r.x, IMG_W), t: pct(r.y, IMG_H), w: pct(r.w, IMG_W), h: pct(r.h, IMG_H),
      bgs: (IMG_W / r.w * 100).toFixed(3) + '% ' + (IMG_H / r.h * 100).toFixed(3) + '%',
      bgp: (r.x / (IMG_W - r.w) * 100).toFixed(4) + '% ' + (r.y / (IMG_H - r.h) * 100).toFixed(4) + '%'
    });
  }
  return out;
}
function buildFlakes(n) {
  const rnd = seeded(2512);
  const out = [];
  for (let i = 0; i < n; i++) {
    const depth = rnd();
    out.push({
      x: +(rnd() * 100).toFixed(2),
      s: +(1.6 + depth * 4.2).toFixed(1),
      o: +(0.35 + depth * 0.55).toFixed(2),
      dur: +(16 - depth * 8 + rnd() * 3).toFixed(1),
      del: +(rnd() * 18).toFixed(1),
      v: 1 + Math.floor(rnd() * 3)
    });
  }
  return out;
}
function buildBulbs(list, IMG_W, IMG_H, seed) {
  const rnd = seeded(seed);
  return list.map(function (p) {
    return {
      x: pct(p[0], IMG_W), y: pct(p[1], IMG_H),
      s: p[2] ? pct(p[2], IMG_W) : +(1.1 + rnd() * 1.3).toFixed(2),
      t: +(1.8 + rnd() * 2.4).toFixed(2),
      d: +(rnd() * 4).toFixed(2)
    };
  });
}
const GEOMETRY = buildGeometry(desktopRects(), IMG_W, IMG_H);
const GEOMETRY_M = buildGeometry(mobileRects(), IMG_M_W, IMG_M_H);
const FLAKES = buildFlakes(70);
const BULBS = buildBulbs(BULBS_PX, IMG_W, IMG_H, 1224);
const BULBS_M = buildBulbs(BULBS_M_PX, IMG_M_W, IMG_M_H, 2412);

/* Portrait screens get the tall artwork */
function detectLayout() {
  try { return window.matchMedia && window.matchMedia('(max-aspect-ratio: 4/5)').matches ? 'm' : 'd'; }
  catch (e) { return 'd'; }
}


/* Chimney smoke (mobile artwork) */
const SMOKE_PUFFS = 16;
const SMOKE_CYCLE = 9; /* seconds — keep in sync with .puff animation-duration in styles.css */

/* Asset paths (relative to index.html) */
const ASSETS = {
  sceneDesktop: 'assets/scene-desktop.avif',
  sceneMobile: 'assets/scene-mobile.avif',
  elfTop: 'assets/elf-top.avif',
  doorSound: 'assets/audio/door-open.mp3'
};

/* ============================================================
   DOM rendering (vanilla JS, no dependencies)
   ============================================================ */
const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR_PATH = 'M12 1.8l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9l7.1-.6z';
const FLAKE_PATH = 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 2l-2 2.5M12 2l2 2.5M12 22l-2-2.5M12 22l2-2.5';

function h(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
  }
  (children || []).forEach((c) => { if (c) node.appendChild(c); });
  return node;
}
function svg(attrs, inner) {
  const node = document.createElementNS(SVG_NS, 'svg');
  Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
  node.innerHTML = inner; /* static, trusted markup only */
  return node;
}
function starSvg(cls) {
  return svg({ class: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    '<path d="' + STAR_PATH + '" fill="#f6c453" stroke="#fff3c4" stroke-width="0.6" stroke-linejoin="round"></path>');
}

const root = document.getElementById('advent');
const state = {
  layout: detectLayout(),
  doors: loadOpened(),
  modalDay: null,
  toastDay: null,
  shakeDay: null
};
let busy = false;
let toastTimer = null;
let els = {};

function doorStatus(day) { return state.doors[day] || null; }

function doorClass(day, available) {
  const st = doorStatus(day);
  let cls = 'slot';
  if (st) cls += ' is-open';
  if (st === 'opening') cls += ' is-opening';
  if (st === 'open') cls += ' is-done';
  if (!available) cls += ' is-locked';
  if (state.shakeDay === day) cls += ' is-shake';
  return cls;
}
function doorLabel(day, available) {
  return available
    ? 'Door ' + day + ', ' + headingFor(day) + (doorStatus(day) === 'open' ? ', opened' : '')
    : 'Door ' + day + ', locked until ' + headingFor(day);
}
function updateDoor(day) {
  const d = els.doors && els.doors[day];
  if (!d) return;
  const available = isDoorAvailable(day, getToday());
  d.slot.className = doorClass(day, available);
  d.btn.setAttribute('aria-label', doorLabel(day, available));
}
function updateAllDoors() { for (let d = 1; d <= DOOR_COUNT; d++) updateDoor(d); }

function render() {
  const mobile = state.layout === 'm';
  const geometry = mobile ? GEOMETRY_M : GEOMETRY;
  const bulbs = mobile ? BULBS_M : BULBS;
  root.className = 'adv-root is-loading ' + (mobile ? 'lay-m' : 'lay-d');
  root.innerHTML = '';
  els = { doors: {} };

  const stage = h('div', { class: 'adv-stage' });
  const scene = h('img', {
    class: 'adv-scene',
    src: mobile ? ASSETS.sceneMobile : ASSETS.sceneDesktop,
    alt: mobile
      ? 'Snow-covered wooden Advent Calendar house in front of snowy mountains at dusk'
      : 'Snow-covered wooden Advent Calendar house in a Christmas market at night',
    draggable: 'false',
    decoding: 'async',
    fetchpriority: 'high'
  });
  stage.appendChild(scene);
  waitForScene(scene);

  /* Mobile artwork: animated chimney smoke. 16 overlapping puffs share one 9 s
     cycle, each offset by 0.56 s, so the plume is continuous with no visible restart. */
  if (mobile) {
    const smoke = h('div', { class: 'smoke', 'aria-hidden': 'true' });
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      smoke.appendChild(h('span', {
        class: 'puff ' + (i % 2 ? 'pb' : 'pa'),
        style: 'animation-delay:-' + (i * SMOKE_CYCLE / SMOKE_PUFFS).toFixed(3) + 's'
      }));
    }
    stage.appendChild(smoke);
  }

  const lights = h('div', { 'aria-hidden': 'true' });
  bulbs.forEach((b) => lights.appendChild(h('span', {
    class: 'bulb',
    style: 'left:' + b.x + '%;top:' + b.y + '%;width:' + b.s + '%;animation-duration:' + b.t + 's;animation-delay:-' + b.d + 's'
  })));
  stage.appendChild(lights);

  const now = getToday();
  geometry.forEach((g) => {
    const available = isDoorAvailable(g.day, now);
    const interior = h('div', { class: 'interior', 'aria-hidden': 'true' }, [
      h('span', { class: 'glow' }),
      starSvg('star'),
      h('span', { class: 'spark s1' }), h('span', { class: 'spark s2' }), h('span', { class: 'spark s3' }),
      h('span', { class: 'spark s4' }), h('span', { class: 'spark s5' }), h('span', { class: 'spark s6' })
    ]);
    const leaf = h('div', { class: 'leaf', 'aria-hidden': 'true' }, [
      h('div', { class: 'face front crop', style: 'background-size:' + g.bgs + ';background-position:' + g.bgp }),
      h('div', { class: 'face back' })
    ]);
    const btn = h('button', {
      type: 'button', class: 'hit', id: 'door-' + g.day,
      'aria-label': doorLabel(g.day, available),
      onClick: () => handleDoor(g.day)
    });
    const slot = h('div', {
      class: doorClass(g.day, available),
      style: 'left:' + g.l + '%;top:' + g.t + '%;width:' + g.w + '%;height:' + g.h + '%'
    }, [interior, leaf, btn]);
    els.doors[g.day] = { slot: slot, btn: btn };
    stage.appendChild(slot);
  });

  const snow = h('div', { class: 'snow', 'aria-hidden': 'true' });
  FLAKES.forEach((f) => {
    const flake = h('span', { class: 'fl', style: 'left:' + f.x + '%;animation-duration:' + f.dur + 's;animation-delay:-' + f.del + 's' }, [
      h('i', { class: 'sw' + f.v, style: 'width:' + f.s + 'px;height:' + f.s + 'px;opacity:' + f.o })
    ]);
    snow.appendChild(flake);
  });
  stage.appendChild(snow);

  const wrap = h('div', { class: 'adv-wrap' }, [h('div', { class: 'adv-backdrop', 'aria-hidden': 'true' }), stage]);

  if (TEST_MODE) {
    wrap.appendChild(h('div', { class: 'test-bar' }, [
      h('div', { class: 'pill', text: 'Test mode · all doors unlocked' }),
      (function () {
        const b = h('button', { type: 'button', class: 'reset', 'aria-label': 'Close all opened doors', onClick: resetDoors });
        b.appendChild(svg({ width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
          '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path>'));
        b.appendChild(document.createTextNode('Reset doors'));
        return b;
      })()
    ]));
  }

  const toastRegion = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
  wrap.appendChild(toastRegion);
  root.appendChild(wrap);
  els.stage = stage;
  els.toastRegion = toastRegion;

  if (state.modalDay) mountModal(state.modalDay, false);
}

/* ---------- Loading ----------
   Keep the scene hidden until the artwork is fully downloaded AND decoded, so
   visitors never see the bare door recesses or a half-drawn picture. */
let sceneToken = 0;
function waitForScene(img) {
  const token = ++sceneToken;
  let done = false;
  const reveal = () => {
    if (done || token !== sceneToken) return;
    done = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token !== sceneToken) return;
      root.classList.remove('is-loading');
      preloadExtras();
    }));
  };
  const decodeThenReveal = () => {
    if (img.decode) img.decode().then(reveal, reveal); else reveal();
  };
  if (img.complete && img.naturalWidth) decodeThenReveal();
  else {
    img.addEventListener('load', decodeThenReveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  }
  setTimeout(reveal, 8000); /* safety net on very slow connections */
}

/* Warm the cache for the elf pop-up and the other artwork once the page is visible */
let extrasLoaded = false;
function preloadExtras() {
  if (extrasLoaded) return;
  extrasLoaded = true;
  [ASSETS.elfTop].forEach((src) => { const i = new Image(); i.src = src; });
  getDoorSound();
}

/* ---------- Sound ----------
   One shared <audio> element, created lazily; played when a door starts to open.
   play() is rejected if the browser blocks it (it never is for a click), so the
   promise is caught and the door simply opens silently. */
let doorSound = null;
function getDoorSound() {
  if (!doorSound) {
    doorSound = new Audio(ASSETS.doorSound);
    doorSound.preload = 'auto';
  }
  return doorSound;
}
function playDoorSound() {
  try {
    const a = getDoorSound();
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* no audio support: ignore */ }
}

/* ---------- Doors ---------- */
function handleDoor(day) {
  if (busy || state.modalDay) return;
  const now = getToday();
  if (!isDoorAvailable(day, now)) { showLocked(day); return; }
  const st = doorStatus(day);
  if (st === 'open') { openModal(day); return; }   /* already opened: show the offer again */
  if (st === 'opening') return;
  busy = true;
  state.doors[day] = 'opening';
  updateDoor(day);
  playDoorSound();
  const wait = prefersReducedMotion() ? 0 : OPEN_MS + REVEAL_MS;
  setTimeout(() => {
    state.doors[day] = 'open';   /* the door is gone: empty recess with a glowing star */
    saveOpened(state.doors);
    updateDoor(day);
    busy = false;
    openModal(day);
  }, wait);
}

function resetDoors() {
  if (busy) return;
  state.doors = {};
  saveOpened(state.doors);
  if (state.modalDay) closeModal(true);
  updateAllDoors();
}

function showLocked(day) {
  state.shakeDay = day;
  updateDoor(day);
  setTimeout(() => { if (state.shakeDay === day) { state.shakeDay = null; updateDoor(day); } }, 460);
  if (toastTimer) clearTimeout(toastTimer);
  els.toastRegion.innerHTML = '';
  els.toastRegion.appendChild(h('div', { class: 'toast', text: 'Door ' + day + ' opens on ' + headingFor(day) + '. See you then!' }));
  toastTimer = setTimeout(() => { els.toastRegion.innerHTML = ''; toastTimer = null; }, TOAST_MS);
}

/* ---------- Modal (one reusable template for every door) ---------- */
function openModal(day) {
  if (state.modalDay) return;
  state.modalDay = day;
  mountModal(day, true);
}

function mountModal(day, moveFocus) {
  const isElf = day === ELF_DAY;
  const closeBtn = h('button', { type: 'button', id: 'advent-close', class: 'close', 'aria-label': 'Close', onClick: () => closeModal() });
  closeBtn.appendChild(svg({ width: '22', height: '22', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'aria-hidden': 'true' }, '<path d="M6 6l12 12M18 6L6 18"></path>'));

  const flakeA = svg({ class: 'flake-deco', style: 'left:16px;top:16px', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'aria-hidden': 'true' }, '<path d="' + FLAKE_PATH + '"></path>');
  const flakeB = svg({ class: 'flake-deco', style: 'right:22px;bottom:18px', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'aria-hidden': 'true' }, '<path d="' + FLAKE_PATH + '"></path>');
  const divider = h('div', { class: 'divider', 'aria-hidden': 'true' }, [h('span'),
    svg({ width: '14', height: '14', viewBox: '0 0 24 24' }, '<path d="' + STAR_PATH + '" fill="currentColor"></path>'), h('span')]);

  const dialog = h('div', {
    class: 'dialog', id: 'advent-dialog', role: 'dialog', 'aria-modal': 'true',
    'aria-labelledby': 'advent-title', 'aria-describedby': 'advent-desc', tabindex: '-1'
  }, [
    flakeA, flakeB, closeBtn,
    h('h2', { class: 'dlg-title', id: 'advent-title', text: headingFor(day) }),
    divider,
    h('p', { class: 'dlg-text', id: 'advent-desc', text: PROMO_TEXT }),
    h('a', { id: 'advent-cta', class: 'cta', href: CTA_URL, target: '_blank', rel: 'noopener noreferrer', text: CTA_LABEL })
  ]);

  const box = h('div', { class: 'dlg-wrap fit-pending' + (isElf ? ' is-elf' : '') }, [
    isElf ? h('img', { class: 'elf-top', src: ASSETS.elfTop, alt: '', 'aria-hidden': 'true', draggable: 'false' }) : null,
    dialog
  ]);
  const overlay = h('div', {
    class: 'overlay',
    onClick: (e) => { if (e.target === e.currentTarget) closeModal(); },
    onKeydown: onDialogKey
  }, [box]);

  root.appendChild(overlay);
  els.overlay = overlay;
  els.box = box;
  els.stage.setAttribute('aria-hidden', 'true');
  fitModal();
  if (moveFocus) requestAnimationFrame(() => requestAnimationFrame(() => { if (state.modalDay === day) closeBtn.focus(); }));
}

/* Shrink the pop-up (never enlarge) so it fits inside the calendar area */
function fitModal() {
  const box = els.box, overlay = els.overlay;
  if (!box || !overlay) return;
  box.style.zoom = '1';
  box.classList.add('fit-pending');
  requestAnimationFrame(() => {
    let z = 1;
    if (box.offsetHeight > 0) {
      z = Math.min(1, (overlay.clientHeight - 16) / box.offsetHeight);
      z = Math.max(0.4, Math.floor(z * 100) / 100);
    }
    box.style.zoom = String(z);
    box.classList.remove('fit-pending');
  });
}

function closeModal(skipFocus) {
  const day = state.modalDay;
  if (!day) return;
  state.modalDay = null;
  if (els.overlay) els.overlay.remove();
  els.overlay = els.box = null;
  els.stage.setAttribute('aria-hidden', 'false');
  if (!skipFocus) {
    const btn = document.getElementById('door-' + day);
    if (btn) btn.focus();
  }
}

function onDialogKey(e) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
    return;
  }
  if (e.key === 'Tab') {
    const first = document.getElementById('advent-close');
    const last = document.getElementById('advent-cta');
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === document.getElementById('advent-dialog'))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault(); first.focus();
    }
  }
}

/* ---------- Resize / rotate ---------- */
let resizeRaf = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    const layout = detectLayout();
    if (layout !== state.layout) { state.layout = layout; render(); return; }
    if (state.modalDay) fitModal();
  });
});

render();

/* Small hook for automated tests */
window.__advent = { state: state, isDoorAvailable: isDoorAvailable, headingFor: headingFor, TEST_MODE: TEST_MODE, getDoorSound: getDoorSound };
})();
