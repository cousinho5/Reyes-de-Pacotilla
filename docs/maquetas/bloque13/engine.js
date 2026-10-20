// Motor de pixel art de la maqueta: capas de píxeles con contorno y sombreado.
const PW = 160, PH = 176;
const K = "#1a1410";
function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; }
const _rgb = {};
function rgba(v) {
  if (_rgb[v]) return _rgb[v];
  const h = v.slice(1);
  const r = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length > 6 ? parseInt(h.slice(6, 8), 16) : 255];
  return (_rgb[v] = r);
}
function hex(r, g, b) { return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
function mix(a, b, t) { const A = rgba(a), B = rgba(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function lit(c, f) { return f > 0 ? mix(c, "#ffffff", f) : mix(c, "#000000", -f); }
function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

class Lay {
  constructor(w, h) { this.w = w; this.h = h; this.a = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (c == null || x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.a[y * this.w + x] = c; }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.a[y * this.w + x]; }
  clear(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = null; }
  rect(x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, typeof c === "function" ? c(x, y) : c); }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === "function" ? c(x, y, dx, dy) : c);
    }
  }
  line(x0, y0, x1, y1, c, r = 0) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (r) this.ell(x, y, r, r, c); else this.set(x, y, typeof c === "function" ? c(x, y) : c); }
  }
  stamp(o, ox, oy) { for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const v = o.a[y * o.w + x]; if (v) this.set(ox + x, oy + y, v); } return this; }
  outline(c = K) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
  map(f) { const o = new Lay(this.w, this.h); for (let i = 0; i < this.a.length; i++) if (this.a[i]) o.a[i] = f(this.a[i], i % this.w, (i / this.w) | 0); return o; }
  rot90() { const o = new Lay(this.h, this.w); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.set(this.h - 1 - y, x, this.get(x, y)); return o; }
  flip() { const o = new Lay(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.set(this.w - 1 - x, y, this.get(x, y)); return o; }
  canvas() {
    const [c, x] = mk(this.w, this.h); const d = x.createImageData(this.w, this.h);
    for (let i = 0; i < this.a.length; i++) { const v = this.a[i]; if (!v) continue; d.data.set(rgba(v), i * 4); }
    x.putImageData(d, 0, 0); return c;
  }
}
function fromGrid(grid, pal) { const w = Math.max(...grid.map((r) => r.length)); const L = new Lay(w, grid.length); grid.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) L.set(x, y, pal[ch]); })); return L; }
function scaleLay(L, s) { const o = new Lay(L.w * s, L.h * s); for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const v = L.get(x, y); if (v) o.rect(x * s, y * s, s, s, v); } return o; }
// Sombreado esférico: luz arriba a la izquierda.
function sh3(cols) { return (x, y, dx, dy) => { const l = dx + dy; return l < -0.75 ? cols[0] : l > 0.6 ? cols[2] : cols[1]; }; }

// ---------------------------------------------------------------- Personajes
const SKIN = ["#f8d4b0", "#ebb48a", "#c4855a"], SKIN_CHOKE = ["#d2e6a8", "#adc888", "#7f9a64"];
const ROBE = ["#d84a3a", "#b3291d", "#7a1c13"];
const GOLD = ["#fbe39a", "#e8b83a", "#a97e14"];
const BEARD = ["#ffffff", "#ece6da", "#bfb6a4"];

function crownLay() {
  const L = new Lay(24, 13);
  L.rect(2, 7, 20, 5, (x, y) => (y === 7 ? GOLD[0] : x > 17 ? GOLD[2] : y === 11 ? GOLD[2] : GOLD[1]));
  const pts = [[2, 3], [7, 4], [12, 0], [17, 4], [21, 3]];
  for (const [px, top] of pts) { for (let y = top + 1; y < 7; y++) { const hw = Math.floor((y - top) / 2.2); for (let x = px - hw; x <= px + hw; x++) L.set(x, y, x < px ? GOLD[0] : GOLD[1]); } L.ell(px + 0.5, top + 0.5, 1.2, 1.2, GOLD[0]); }
  L.set(6, 9, "#2e5aa8"); L.set(7, 9, "#5b84d0"); L.set(11, 9, "#c0392b"); L.set(12, 9, "#e8604c"); L.set(12, 10, "#a8321f"); L.set(16, 9, "#2f8a3e"); L.set(17, 9, "#55b964");
  L.set(4, 8, "#fff7d0"); L.set(9, 8, "#fff7d0");
  return L.outline();
}
const CROWN = crownLay();

function drumLay() {
  const L = new Lay(11, 15);
  L.ell(5, 9.5, 4, 5, sh3(["#e0974f", "#b0642c", "#7a4219"]));
  L.set(3, 7, "#f2b56e"); L.set(4, 7, "#f2b56e");
  L.clear(8, 8); L.clear(8, 9); L.clear(7, 8); // mordisco
  L.rect(5, 1, 2, 4, "#f2e6cc"); L.set(4, 0, "#f2e6cc"); L.set(7, 0, "#f2e6cc"); L.set(4, 1, "#f2e6cc"); L.set(7, 1, "#f2e6cc");
  return L.outline();
}
const DRUM = drumLay();

/** El rey Aldric de cintura para arriba (52x60). */
function kingLay(o = {}) {
  const O = 6, L = new Lay(52, 60), sk = o.choke ? SKIN_CHOKE : SKIN;
  // túnica
  for (let y = 33 + O; y < 60; y++) { const hw = 12 + (y - 33 - O) * 0.45; for (let x = Math.round(26 - hw); x < Math.round(26 + hw); x++) { const t = (x - (26 - hw)) / (2 * hw); L.set(x, y, t < 0.16 ? ROBE[0] : t > 0.8 ? ROBE[2] : (x % 6 === 0 && y > 42 + O) ? "#9a2418" : ROBE[1]); } }
  L.rect(13, 46 + O, 26, 3, (x, y) => (y === 46 + O ? GOLD[0] : x % 5 === 0 ? GOLD[2] : GOLD[1]));
  L.rect(23, 45 + O, 6, 5, (x, y) => (x === 23 || y === 45 + O ? GOLD[0] : GOLD[1])); L.rect(25, 47 + O, 2, 1, "#a8321f");
  L.rect(23, 34 + O, 6, 11, (x, y) => (((x * 3 + y * 5) % 11 === 0) ? K : x === 23 ? "#ffffff" : "#efe9dc"));
  L.rect(23, 49 + O, 6, 11, (x, y) => (((x * 3 + y * 5) % 11 === 0) ? K : x === 23 ? "#ffffff" : "#efe9dc"));
  for (let y = 30 + O; y < 36 + O; y++) { const hw = 16 - (y - 30 - O) * 0.4; for (let x = Math.round(26 - hw); x < Math.round(26 + hw); x++) L.set(x, y, (((x * 7 + y * 3) % 9 === 0) && y > 30 + O) ? K : y === 30 + O ? "#ffffff" : (x > 34 ? "#d8d2c4" : "#f4f0e6")); }
  // brazo izquierdo
  if (o.arm === "throat") { L.line(12, 40 + O, 19, 31 + O, ROBE[1], 2.6); L.line(40, 40 + O, 33, 31 + O, ROBE[2], 2.6); }
  else if (o.arm === "hold") { L.line(12, 38 + O, 8, 14 + O, ROBE[1], 2.6); L.line(40, 38 + O, 44, 14 + O, ROBE[2], 2.6); L.rect(5, 18 + O, 7, 2, "#f4f0e6"); L.rect(41, 18 + O, 7, 2, "#f4f0e6"); }
  else L.line(12, 38 + O, 11, 52 + O, ROBE[1], 2.8);
  // pelo de los lados
  L.ell(16, 15 + O, 3.4, 5, sh3(BEARD)); L.ell(36, 15 + O, 3.4, 5, sh3(BEARD));
  // orejas y cabeza
  L.ell(16.5, 19 + O, 2, 2.8, sh3(sk)); L.ell(35.5, 19 + O, 2, 2.8, sh3(sk));
  L.ell(26, 18 + O, 9.5, 10, sh3(sk));
  // barba
  L.ell(26, 29 + O, 12, 10, (x, y, dx, dy) => (y < 22 + O ? L.get(x, y) : ((x + y) % 4 === 0 && y > 27 + O) ? "#d0c8b6" : sh3(BEARD)(x, y, dx, dy)));
  L.ell(26, 37 + O, 6, 3.5, (x, y, dx, dy) => sh3(BEARD)(x, y, dx, dy));
  // bigote
  for (let x = 17; x <= 35; x++) { const yy = 21 + O + (Math.abs(x - 26) > 6 ? -1 : 0) + (Math.abs(x - 26) > 8 ? -1 : 0); L.set(x, yy, x < 26 ? "#ffffff" : "#e2dccd"); L.set(x, yy + 1, x < 26 ? "#ece6da" : "#cfc7b6"); }
  // boca
  if (o.mouth === "chew") { L.rect(23, 24 + O, 6, 3, "#5a1610"); L.rect(24, 26 + O, 4, 1, "#c0505a"); L.rect(24, 24 + O, 4, 1, "#fff"); }
  else if (o.mouth === "o") { L.ell(26, 26 + O, 3.2, 3.4, "#3a0d08"); L.rect(25, 27 + O, 3, 2, "#c0505a"); }
  else L.rect(23, 24 + O, 6, 1, "#7a2a20");
  // nariz y mejillas
  L.ell(20, 21 + O, 1.8, 1.1, o.choke ? "#9fb880" : "#ea9a80"); L.ell(32, 21 + O, 1.8, 1.1, o.choke ? "#9fb880" : "#ea9a80");
  L.ell(26.5, 19.5 + O, 2.7, 2.4, sh3(o.choke ? ["#c9dca8", "#9cb47e", "#748c58"] : ["#f6b496", "#e0866a", "#b45c44"]));
  // ojos y cejas
  if (o.choke) {
    L.ell(21, 15.5 + O, 2.6, 2.6, "#ffffff"); L.ell(31, 15.5 + O, 2.6, 2.6, "#ffffff"); L.set(21, 15 + O, K); L.set(31, 15 + O, K);
    L.rect(18, 11 + O, 5, 1, "#e8e2d6"); L.rect(29, 11 + O, 5, 1, "#e8e2d6");
  } else {
    L.rect(19, 15 + O, 4, 2, "#ffffff"); L.rect(29, 15 + O, 4, 2, "#ffffff");
    const lx = o.look === "left" ? 0 : 2; L.rect(19 + lx, 15 + O, 2, 2, K); L.rect(29 + lx, 15 + O, 2, 2, K);
    L.rect(18, 13 + O, 6, 1, "#ffffff"); L.rect(28, 13 + O, 6, 1, "#ffffff"); L.set(18, 12 + O, "#ece6da"); L.set(33, 12 + O, "#ece6da");
    if (o.happy) { L.rect(19, 16 + O, 4, 1, sk[1]); L.rect(29, 16 + O, 4, 1, sk[1]); }
  }
  // brazo derecho
  if (o.arm === "up") { L.line(38, 39 + O, 43, 27 + O, ROBE[2], 2.6); L.rect(40, 29 + O, 7, 2, "#f4f0e6"); L.ell(44, 24 + O, 2.6, 2.6, sh3(sk)); L.stamp(DRUM, 39, 7 + O); }
  else if (o.arm === "bite") { L.line(38, 39 + O, 37, 29 + O, ROBE[2], 2.6); L.ell(36, 26 + O, 2.6, 2.6, sh3(sk)); L.stamp(DRUM, 28, 14 + O); }
  else if (o.arm === "throat") { L.ell(20.5, 31 + O, 3, 2.4, sh3(sk)); L.ell(31.5, 31 + O, 3, 2.4, sh3(sk)); }
  else if (o.arm === "hold") { L.ell(8, 12 + O, 2.6, 2.6, sh3(sk)); L.ell(44, 12 + O, 2.6, 2.6, sh3(sk)); }
  else { L.line(40, 38 + O, 42, 52 + O, ROBE[2], 2.8); }
  if (o.crown !== false && o.arm !== "hold") L.stamp(CROWN, 14, 0);
  if (o.choke) { L.set(12, 10 + O, "#a8d8f0"); L.set(12, 11 + O, "#7fc0e8"); L.set(40, 8 + O, "#a8d8f0"); L.set(40, 9 + O, "#7fc0e8"); }
  return L.outline();
}

/** Fantasma: misma figura con colores de niebla y cola ondulada. */
function ghostLay(pose) {
  const base = kingLay({ ...pose, crown: false });
  const G = new Lay(52, 76);
  G.stamp(base, 0, 0);
  for (let y = 56; y < 76; y++) { const hw = 16 - (y - 56) * 0.75 + Math.sin(y * 0.7) * 1.5; for (let x = Math.round(26 - hw); x < Math.round(26 + hw); x++) if (!((y > 66) && ((x + y) % 5 === 0))) G.set(x, y, "#b3291d"); }
  return G.outline().map((c) => {
    if (c === K) return "#3d6e8e";
    const [r, g, b] = rgba(c); const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    return l > 0.82 ? "#f4fcff" : l > 0.62 ? "#d4ecf7" : l > 0.42 ? "#a6cde2" : l > 0.25 ? "#7fb0cc" : "#5e92b2";
  });
}

function bootsLay() {
  const L = new Lay(24, 12);
  for (const bx of [3, 15]) { L.rect(bx, 0, 6, 8, (x, y) => (x === bx ? "#8a5a30" : "#6b4220")); L.rect(bx, 7, 6, 3, "#4a2c14"); L.rect(bx - 1, 0, 8, 2, "#a8321f"); }
  return L.outline();
}

function throneLay() {
  const L = new Lay(66, 84);
  // patas y asiento
  L.rect(8, 58, 6, 26, (x) => (x === 8 ? GOLD[0] : x > 11 ? GOLD[2] : GOLD[1])); L.rect(52, 58, 6, 26, (x) => (x === 52 ? GOLD[0] : x > 55 ? GOLD[2] : GOLD[1]));
  L.rect(4, 52, 58, 8, (x, y) => (y === 52 ? GOLD[0] : y > 57 ? GOLD[2] : (x % 9 === 0 ? GOLD[2] : GOLD[1])));
  // respaldo
  L.rect(10, 6, 46, 48, (x, y) => (x < 15 || x > 50 || y < 11) ? ((x + y) % 7 === 0 ? GOLD[2] : (x < 12 ? GOLD[0] : GOLD[1])) : null);
  L.rect(15, 11, 36, 41, (x, y) => { const u = (x - 15 + (y - 11)) % 8, v = (x - 15 - (y - 11) + 80) % 8; if (u === 0 || v === 0) return "#7a1c13"; if (u === 4 && v === 4) return GOLD[1]; return x < 22 ? "#c23a2a" : "#a8321f"; });
  // remates y cresta
  L.ell(12, 5, 3.4, 3.4, sh3(GOLD)); L.ell(53, 5, 3.4, 3.4, sh3(GOLD));
  L.rect(25, 0, 16, 8, (x, y) => (y === 0 ? GOLD[0] : GOLD[1])); L.rect(29, -1, 8, 2, GOLD[0]); L.ell(33, 3, 2, 2, "#a8321f");
  // brazos con cabezas de león
  L.rect(0, 40, 12, 6, (x, y) => (y === 40 ? GOLD[0] : GOLD[1])); L.rect(54, 40, 12, 6, (x, y) => (y === 40 ? GOLD[0] : GOLD[1]));
  L.ell(3, 42, 3.4, 3.4, sh3(GOLD)); L.ell(62, 42, 3.4, 3.4, sh3(GOLD)); L.set(2, 42, K); L.set(63, 42, K);
  L.rect(1, 46, 4, 8, GOLD[2]); L.rect(61, 46, 4, 8, GOLD[2]);
  return L.outline();
}
const THRONE = throneLay();

function cushionLay() { const L = new Lay(28, 8); L.ell(14, 4.5, 13, 3.6, sh3(["#d04a3a", "#a8321f", "#6e1d12"])); L.set(1, 6, GOLD[1]); L.set(26, 6, GOLD[1]); L.set(0, 7, GOLD[1]); L.set(27, 7, GOLD[1]); return L.outline(); }

function ratLay(f, keyCarry) {
  const L = new Lay(18, 9);
  L.ell(8, 5, 5.5, 3, sh3(["#9a8c80", "#76695e", "#51473f"]));
  L.ell(13.5, 4.5, 3, 2.2, sh3(["#9a8c80", "#76695e", "#51473f"])); L.set(16, 4, "#e8a0a8"); L.set(14, 3, K); L.ell(12, 2, 1.2, 1.2, "#d89098");
  for (let i = 0; i < 6; i++) L.set(2 - i * 0.3, 5 + Math.sin(i + f * 2) * 1.2, "#d89098");
  if (f) { L.set(5, 8, "#51473f"); L.set(11, 8, "#51473f"); } else { L.set(7, 8, "#51473f"); L.set(9, 8, "#51473f"); }
  return L.outline();
}
function keyLay() { const L = new Lay(14, 7); L.ell(3, 3.5, 3, 3, GOLD[1]); L.clear(3, 3); L.clear(3, 4); L.rect(5, 3, 8, 2, (x) => (x % 3 ? GOLD[1] : GOLD[2])); L.rect(10, 5, 1, 2, GOLD[1]); L.rect(12, 5, 1, 2, GOLD[1]); return L.outline(); }
const KEY = keyLay();
function breadLay(w = 10, h = 5) { const L = new Lay(w + 2, h + 2); L.ell(w / 2 + 1, h / 2 + 1, w / 2, h / 2, sh3(["#e8b468", "#c88a3a", "#8a5a20"])); for (let x = 3; x < w; x += 3) L.set(x, Math.round(h / 2), "#f2d090"); return L.outline(); }
function catLay(f) { const L = new Lay(18, 10); L.ell(9, 6, 6, 3, sh3(["#f0a050", "#d07a2a", "#9a5418"])); L.ell(4, 4.5, 3, 2.6, sh3(["#f0a050", "#d07a2a", "#9a5418"])); L.set(2, 1, "#d07a2a"); L.set(5, 1, "#d07a2a"); L.set(3, 4, f ? K : "#d07a2a"); L.line(14, 6, 17, 3, "#d07a2a"); return L.outline(); }
function bellLay() { const L = new Lay(22, 22); for (let y = 3; y < 19; y++) { const hw = 4 + (y - 3) * 0.42 + (y > 15 ? 1.5 : 0); for (let x = Math.round(11 - hw); x < Math.round(11 + hw); x++) L.set(x, y, x < 11 - hw / 2 ? "#e8b860" : x > 11 + hw / 2 ? "#8a5a1a" : "#c8913a"); } L.rect(9, 0, 4, 3, "#6b4a20"); L.ell(11, 19.5, 2, 2, "#4a3010"); L.rect(4, 16, 14, 1, "#f1cf7d"); return L.outline(); }
function hourglassLay(sand) {
  const L = new Lay(40, 62);
  L.rect(2, 0, 36, 5, (x, y) => (y === 0 ? "#a06a38" : "#6b4220")); L.rect(2, 57, 36, 5, (x, y) => (y === 57 ? "#a06a38" : "#6b4220"));
  for (const px of [4, 34]) L.rect(px, 5, 2, 52, (x) => (x === px ? "#8a5a30" : "#5a3a1c"));
  for (let y = 5; y < 57; y++) { const d = Math.abs(y - 31); const hw = Math.max(1.2, 13 * Math.pow(d / 26, 0.9)); for (let x = Math.round(20 - hw); x < Math.round(20 + hw); x++) {
    let c = x < 20 - hw + 2 ? "#cfe4ea" : "#9fbac4";
    if (y > 31 && y > 57 - 2 - sand * 22 + Math.abs(x - 20) * 0.5) c = (x + y) % 3 ? "#e0b860" : "#c89a40";
    if (y < 31 && y > 31 - (1 - sand) * 9 && y > 22) c = (x + y) % 3 ? "#e0b860" : "#c89a40";
    L.set(x, y, c); } }
  return L.outline();
}
function towerBirds() { }

// ---------------------------------------------------------------- Fondos
function roomLay(mode) {
  const day = mode === "day", dark = mode === "night";
  const L = new Lay(PW, PH);
  const wallC = day ? ["#7a6a58", "#6e604f", "#837260", "#6a5b4b"] : ["#4d4239", "#463c34", "#52463c", "#433a32"];
  for (let y = 0; y < 132; y++) for (let x = 0; x < PW; x++) {
    const row = Math.floor(y / 7), off = (row % 2) * 6, bx = Math.floor((x + off) / 12);
    const mortar = y % 7 === 6 || (x + off) % 12 === 11;
    let c = mortar ? (day ? "#4a3e33" : "#2e2722") : wallC[Math.floor(hash(bx, row) * 4)];
    if (!mortar && y % 7 === 0) c = lit(c, 0.08);
    if (!mortar && hash(x, y, 3) > 0.93) c = lit(c, -0.08);
    L.set(x, y, c);
  }
  // zócalo
  L.rect(0, 126, PW, 6, (x, y) => (y === 126 ? (day ? "#a08c74" : "#6a5d50") : (day ? "#5a4a3a" : "#3a312a")));
  // suelo
  for (let y = 132; y < PH; y++) for (let x = 0; x < PW; x++) {
    const row = Math.floor((y - 132) / 8), off = (row % 2) * 8; const m = (y - 132) % 8 === 7 || (x + off) % 16 === 15;
    L.set(x, y, m ? (day ? "#3a2c20" : "#1e1611") : hash(Math.floor((x + off) / 16), row, 5) > 0.5 ? (day ? "#6a5240" : "#3a2e26") : (day ? "#5e4836" : "#332820"));
  }
  // ventanas
  for (const wx of [6, 134]) {
    L.rect(wx - 2, 24, 24, 54, (x, y) => (x === wx - 2 || y === 77 ? (day ? "#b0a088" : "#7a6c5e") : (day ? "#968670" : "#5e5246")));
    for (let y = 26; y < 76; y++) for (let x = wx; x < wx + 20; x++) {
      const ay = 26 + 10 - Math.sqrt(Math.max(0, 100 - (x - wx - 9.5) ** 2));
      if (y < ay) continue;
      let c = day ? mix("#7ec0f0", "#d8eefa", (y - 26) / 50) : mix("#0b1430", "#1f3264", (y - 26) / 50);
      if (!day && hash(x, y, 9) > 0.975) c = "#f2ecd0";
      L.set(x, y, c);
    }
    L.rect(wx + 9, 26, 2, 50, day ? "#5a4a3a" : "#2a2420"); L.rect(wx, 50, 20, 2, day ? "#5a4a3a" : "#2a2420");
  }
  if (!day) { L.ell(147, 38, 4.5, 4.5, sh3(["#fffbe8", "#f2ecd0", "#c8c0a0"])); L.set(146, 37, "#d8d0b0"); L.set(148, 40, "#d8d0b0"); }
  else { L.ell(18, 36, 4, 2, "#ffffff"); L.ell(15, 37, 3, 1.5, "#ffffff"); }
  // estandartes
  const ks = fromGrid(DATA.kingShield.grid, DATA.kingShield.pal);
  for (const bx of [32, 108]) {
    L.rect(bx - 2, 12, 24, 2, (x) => (x % 4 ? GOLD[1] : GOLD[2])); L.ell(bx - 2, 13, 1.6, 1.6, GOLD[0]); L.ell(bx + 21, 13, 1.6, 1.6, GOLD[0]);
    for (let y = 14; y < 84; y++) for (let x = bx; x < bx + 20; x++) {
      const tail = y > 72 && Math.abs(x - bx - 9.5) < (y - 72) * 0.9; if (tail) continue;
      const f = (x - bx) % 5; L.set(x, y, f === 0 ? "#3e1a5c" : f === 1 ? "#6a36a0" : "#5b2a86");
    }
    L.rect(bx, 71, 20, 2, (x) => ((x % 2) ? GOLD[1] : GOLD[0]));
    L.stamp(ks, bx + 2, 34);
  }
  // antorchas (soportes)
  for (const tx of [27, 132]) { L.rect(tx, 62, 3, 6, "#3a3a40"); L.rect(tx - 1, 60, 5, 2, "#55555e"); L.rect(tx, 56, 3, 4, "#6b4220"); }
  // alfombra
  for (let y = 128; y < PH; y++) { const hw = 16 + (y - 128) * 0.35; for (let x = Math.round(80 - hw); x < Math.round(80 + hw); x++) L.set(x, y, Math.abs(x - 80) > hw - 2 ? GOLD[1] : ((x + y) % 9 === 0 ? "#6e1d12" : "#8a1f16")); }
  return L;
}

class ShiftLay extends Lay { set(x, y, c) { super.set(x, y + 8, c); } get(x, y) { return super.get(x, y + 8); } clear(x, y) { super.clear(x, y + 8); } }
function tableLay() {
  const L = new ShiftLay(PW, 52);
  // mantel
  for (let y = 6; y < 40; y++) for (let x = 0; x < PW; x++) {
    const hem = 34 + Math.round(Math.sin(x * 0.4) * 1.5); if (y > hem) continue;
    const fold = (x % 14); let c = y < 9 ? "#fbf6ea" : fold < 2 ? "#cfc6b0" : fold > 11 ? "#ddd4bf" : "#ece4d0";
    if (y === hem) c = "#b8a888"; if (y === 9) c = "#d8cfba"; L.set(x, y, c);
  }
  L.rect(0, 30, PW, 2, (x) => (x % 6 < 3 ? "#a8321f" : "#e8b83a"));
  // fuente con el pollo (le falta un muslo)
  L.ell(50, 5, 11, 3.2, sh3(["#f0f0f4", "#c8c8d0", "#8a8a96"]));
  L.ell(50, 1.5, 7, 4.8, sh3(["#f0b060", "#c9772e", "#8a4a1a"]));
  L.ell(56.5, 3, 2.4, 2.8, sh3(["#f0b060", "#c9772e", "#8a4a1a"])); L.rect(58, 0, 1, 2, "#f2e6cc");
  L.set(46, 0, "#ffd08a"); L.set(47, 0, "#ffd08a");
  // pan, uvas, manzanas, copas
  L.stamp(breadLay(11, 6), 72, -1); L.stamp(breadLay(8, 5), 84, 1);
  for (const [gx, gy] of [[104, 0], [106, 0], [105, 2], [107, 2], [103, 2], [106, 4], [104, 4]]) L.ell(gx, gy, 1.4, 1.4, sh3(["#9a5ac0", "#6a2a8a", "#3e1a5c"]));
  L.ell(96, 3, 2.2, 2.2, sh3(["#f07a6a", "#c0392b", "#7a1c13"])); L.ell(116, 3, 2.2, 2.2, sh3(["#a8d070", "#6a9a3a", "#3e6a1a"]));
  for (const cx of [30, 126]) { L.rect(cx - 2, -2 + 2, 5, 4, (x) => (x === cx - 2 ? GOLD[0] : GOLD[1])); L.rect(cx, 4, 1, 2, GOLD[2]); L.rect(cx - 1, 5, 3, 1, GOLD[1]); }
  for (const cx of [16, 142]) { L.rect(cx, -5, 2, 10, (x) => (x === cx ? '#ffffff' : '#ddd6c6')); L.rect(cx - 2, 5, 6, 2, GOLD[1]); }
  const P = new Lay(PW, 52); P.a = L.a; return P.outline();
}
