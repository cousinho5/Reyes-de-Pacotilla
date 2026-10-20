// Escenas de la maqueta. Cada escena dibuja en función del tiempo t (segundos),
// así una imagen fija de cualquier instante sale igual que la animación.
const cv = document.getElementById("px"); cv.width = PW; cv.height = PH;
const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
const R = {};
function prep() {
  const C = (L) => L.canvas();
  R.room = C(roomLay()); R.roomDay = C(roomLay("day")); R.table = C(tableLay()); R.throne = C(THRONE); R.cushion = C(cushionLay());
  R.kUp = C(kingLay({ arm: "up" })); R.kBite = C(kingLay({ arm: "bite", mouth: "chew" }));
  R.kChew = C(kingLay({ mouth: "chew", look: "left" })); R.kIdle = C(kingLay({ look: "left", happy: 1 }));
  R.kChoke = C(kingLay({ choke: 1, arm: "throat", mouth: "o" })); R.kChokeNC = C(kingLay({ choke: 1, arm: "throat", mouth: "o", crown: false }));
  R.crown = C(CROWN); R.drum = C(DRUM); R.boots = C(bootsLay()); R.key = C(KEY);
  R.ghostHold = C(ghostLay({ arm: "hold", mouth: "o", happy: 1 })); R.ghostDrum = C(ghostLay({ arm: "up", mouth: "chew" }));
  R.rat = [C(ratLay(0)), C(ratLay(1))]; R.bread = C(breadLay(8, 5)); R.bell = C(bellLay());
  R.portrait = C(portraitLay());
  R.shields = DATA.houses.map((h) => fromGrid(h.grid, h.pal)); R.shieldC = R.shields.map((L) => C(L)); R.shield2 = R.shields.map((L) => C(scaleLay(L, 2)));
  R.dawn = C(dawnLay()); R.granary = C(granaryLay()); R.plaza = C(plazaLay()); R.corridor = C(corridorLay());
  R.crier = [C(crierLay(0)), C(crierLay(1))]; R.villager = [C(villagerLay("#4f7a2e", 0)), C(villagerLay("#2e5aa8", 1))];
  R.hg = C(scaleLay(hourglassLay(0.18), 2));
}
const img = (c, x, y) => g.drawImage(c, Math.round(x), Math.round(y));
function rot(c, x, y, ang, px, py, alpha = 1) { g.save(); g.globalAlpha = alpha; g.translate(Math.round(x + px), Math.round(y + py)); g.rotate(ang); g.drawImage(c, -px, -py); g.restore(); }
function glow(x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace("A", a)); gr.addColorStop(1, col.replace("A", 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
function shade(a) { g.fillStyle = `rgba(8,5,12,${a})`; g.fillRect(0, 0, PW, PH); }
function vignette(a = 0.55) { const gr = g.createRadialGradient(PW / 2, PH / 2, PH * 0.3, PW / 2, PH / 2, PH * 0.75); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, PW, PH); }
function px(x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
function flame(x, y, t, seed, s = 1) {
  const f = Math.floor(t * 9 + seed * 3) % 3; const hgt = [5, 6, 4][f] * s, sway = [0, 1, -1][f];
  glow(x + 0.5, y - 2, 16 * s, "rgba(255,170,60,A)", 0.28 + f * 0.04);
  px(x - 1, y - hgt + 3, "#c0392b", 3, hgt - 2); px(x - 1 + sway * 0.5, y - hgt + 1, "#f08a24", 3, hgt - 2); px(x, y - hgt + sway * 0, "#ffd860", 1, hgt - 1); px(x + sway, y - hgt - 1, "#fff2b0", 1, 1);
}
function torches(t) { flame(28.5, 56, t, 1); flame(133.5, 56, t, 2); }
function candles(t, out) { if (!out) { flame(16.5, 128, t, 3, 0.7); flame(142.5, 128, t, 4, 0.7); } }
function moonbeam(a) { g.fillStyle = `rgba(190,210,255,${a})`; g.beginPath(); g.moveTo(134, 76); g.lineTo(154, 76); g.lineTo(150, 176); g.lineTo(96, 176); g.closePath(); g.fill(); }
function motes(t, a) { for (let i = 0; i < 18; i++) { const ph = (t * 0.08 + hash(i, 1)) % 1; const x = 110 + hash(i, 2) * 40 - ph * 10, y = 80 + ph * 90; px(x, y, `rgba(255,250,220,${a * (0.5 + 0.5 * Math.sin(t * 2 + i))})`); } }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => { v = clamp(v); return v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2; };
const lerp = (a, b, v) => a + (b - a) * v;

// --------------------------------------------------------- Dibujos de fondo extra
function portraitLay() {
  const L = new Lay(34, 40);
  L.rect(0, 0, 34, 40, (x, y) => ((x + y) % 5 === 0 ? GOLD[2] : x < 2 || y < 2 ? GOLD[0] : GOLD[1]));
  L.rect(3, 3, 28, 34, (x, y) => mix("#3a2a50", "#1e1630", y / 34));
  const k = kingLay({ look: "left", happy: 1 }); for (let y = 0; y < 34; y++) for (let x = 0; x < 28; x++) { const v = k.get(Math.round(x * 52 / 28), Math.round(y * 52 / 34) + 2); if (v) L.set(3 + x, 3 + y, v); }
  return L.outline();
}
function dawnLay() {
  const L = new Lay(PW, PH);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const t = y / 120; const band = Math.floor(t * 9) / 9; L.set(x, y, mix(mix("#2b2350", "#c85a3a", clamp(band * 1.3)), "#f6c070", clamp((band - 0.6) * 2.5))); }
  L.ell(124, 122, 16, 16, (x, y) => (y < 122 ? "#ffe9a8" : null)); L.ell(124, 122, 12, 12, (x, y) => (y < 122 ? "#fff6d0" : null));
  for (let i = 0; i < 6; i++) L.ell(20 + i * 28 + hash(i, 4) * 10, 30 + hash(i, 5) * 40, 10 + hash(i, 6) * 8, 2, (x, y) => mix("#e8907a", "#f6c4a0", hash(i, 7)));
  // tejados del pueblo
  for (let i = 0; i < 12; i++) {
    const hx = i * 15 - 6 + hash(i, 1) * 6, hw = 16, top = 118 + hash(i, 2) * 14;
    for (let y = top; y < PH; y++) for (let x = hx; x < hx + hw; x++) { const roof = y < top + 8; if (roof && Math.abs(x - hx - hw / 2) > (y - top) * 1.1) continue; L.set(x, y, roof ? (x < hx + hw / 2 ? "#5a2a2e" : "#3e1c22") : "#2a1c22"); }
    L.rect(Math.round(hx + 4), Math.round(top + 12), 2, 3, "#ffd060"); if (hash(i, 3) > 0.5) L.rect(Math.round(hx + 10), Math.round(top + 16), 2, 3, "#ffd060");
  }
  // campanario
  for (let y = 34; y < PH; y++) for (let x = 54; x < 106; x++) {
    const row = Math.floor(y / 6), off = (row % 2) * 5; const m = y % 6 === 5 || (x + off) % 10 === 9;
    L.set(x, y, m ? "#4a3a3a" : x < 60 ? "#9a8478" : x > 98 ? "#5e4c48" : hash(Math.floor((x + off) / 10), row, 8) > 0.5 ? "#7a6660" : "#6e5a56");
  }
  L.rect(58, 42, 44, 40, (x, y) => { const ay = 42 + 10 - Math.sqrt(Math.max(0, 100 - (x - 80) ** 2)) * (x > 68 && x < 92 ? 1 : 0); return y < ay && Math.abs(x - 80) < 12 ? null : "#1c1216"; });
  L.rect(58, 42, 44, 3, null);
  L.rect(52, 30, 56, 5, (x, y) => (y === 30 ? "#b09a8c" : "#7a6660"));
  for (let y = 4; y < 30; y++) { const hw = (y - 4) * 1.15; for (let x = Math.round(80 - hw); x < Math.round(80 + hw); x++) L.set(x, y, (x + y) % 4 === 0 ? "#6e1d12" : x < 80 ? "#c0392b" : "#8a2418"); }
  L.rect(79, 0, 2, 5, "#3a3a40");
  L.rect(76, 92, 8, 12, "#1c1216"); L.rect(54, 82, 52, 2, "#b09a8c");
  return L;
}
function granaryLay() {
  const L = new Lay(PW, PH);
  for (let y = 0; y < 150; y++) for (let x = 0; x < PW; x++) { const p = Math.floor(x / 10); const e = x % 10 === 0; L.set(x, y, e ? "#2a1a10" : mix(["#6b4a2c", "#5e3f24", "#74522f", "#664628"][Math.floor(hash(p, 1) * 4)], "#2a1a10", hash(x, y, 2) > 0.95 ? 0.4 : 0)); }
  for (let y = 150; y < PH; y++) for (let x = 0; x < PW; x++) L.set(x, y, (x + y * 3) % 11 === 0 ? "#5a4630" : "#4a3824");
  // ventana con luna
  L.rect(68, 14, 24, 18, (x, y) => (x === 68 || x === 91 || y === 14 || y === 31 || x === 79 ? "#3a2414" : mix("#0b1430", "#1f3264", (y - 14) / 18))); L.ell(73, 19, 2.5, 2.5, "#f2ecd0");
  // estantes
  for (const sy of [58, 102]) { L.rect(0, sy, PW, 4, (x, y) => (y === sy ? "#a0703c" : "#5a3a1c")); for (const bx of [10, 70, 130]) L.rect(bx, sy + 4, 3, 6, "#4a2c14"); }
  // sacos
  const sack = (sx, sy) => { L.ell(sx, sy, 7, 9, sh3(["#d8c090", "#b8a070", "#8a7448"])); L.rect(sx - 2, sy - 10, 4, 2, "#6b5030"); L.rect(sx - 1, sy - 12, 2, 2, "#d8c090"); };
  sack(14, 140); sack(28, 142); sack(146, 141); sack(132, 143); sack(20, 128);
  // barriles
  for (const bx of [44, 112]) { L.rect(bx, 124, 16, 26, (x, y) => (y === 128 || y === 145 ? "#3a3a40" : x < bx + 4 ? "#a0703c" : x > bx + 12 ? "#5a3a1c" : "#7a5230")); }
  return L.outline("#1a1008");
}
function plazaLay() {
  const L = new Lay(PW, PH);
  for (let y = 0; y < 40; y++) for (let x = 0; x < PW; x++) L.set(x, y, mix("#8ec8f0", "#d8eefa", y / 40));
  const house = (hx, hw, top, col) => {
    for (let y = top; y < 140; y++) for (let x = hx; x < hx + hw; x++) { const beam = (x - hx) % 12 === 0 || (y - top) % 18 === 0 || x === hx + hw - 1; L.set(x, y, beam ? "#5a3a1c" : col); }
    for (let y = top - 14; y < top; y++) { const hw2 = (y - top + 14) * (hw / 28); for (let x = Math.round(hx + hw / 2 - hw2); x < Math.round(hx + hw / 2 + hw2); x++) L.set(x, y, (x + y) % 3 === 0 ? "#7a2418" : "#a8321f"); }
    for (let wy = top + 4; wy < 120; wy += 18) for (let wx = hx + 3; wx < hx + hw - 6; wx += 12) { L.rect(wx, wy, 6, 8, "#2a3a5a"); L.rect(wx, wy + 3, 6, 1, "#5a3a1c"); L.rect(wx + 2, wy, 1, 8, "#5a3a1c"); L.rect(wx - 1, wy + 8, 8, 1, "#a8321f"); }
  };
  house(-4, 52, 30, "#efe2c4"); house(48, 64, 44, "#e8d4a8"); house(112, 52, 24, "#f2e8d0");
  L.rect(70, 112, 14, 28, (x) => (x < 72 ? "#7a5230" : "#5a3a1c"));
  for (let y = 140; y < PH; y++) for (let x = 0; x < PW; x++) { const r = Math.floor((y - 140) / 5), o = (r % 2) * 4; const m = (y - 140) % 5 === 4 || (x + o) % 8 === 7; L.set(x, y, m ? "#6a6058" : hash(Math.floor((x + o) / 8), r, 3) > 0.5 ? "#a09484" : "#8e8274"); }
  return L;
}
function corridorLay() {
  const L = new Lay(PW, PH);
  for (let y = 0; y < 136; y++) for (let x = 0; x < PW; x++) { const row = Math.floor(y / 7), off = (row % 2) * 6, bx = Math.floor((x + off) / 12); const m = y % 7 === 6 || (x + off) % 12 === 11; L.set(x, y, m ? "#1c1a26" : ["#3a3646", "#34303e", "#403a4c", "#302c38"][Math.floor(hash(bx, row, 2) * 4)]); }
  for (let y = 136; y < PH; y++) for (let x = 0; x < PW; x++) L.set(x, y, (Math.floor(x / 14) + Math.floor((y - 136) / 7)) % 2 ? "#26222e" : "#2e2a38");
  for (const wx of [12, 120]) for (let y = 30; y < 92; y++) for (let x = wx; x < wx + 28; x++) { const ay = 30 + 14 - Math.sqrt(Math.max(0, 196 - (x - wx - 13.5) ** 2)); if (y < ay) continue; const fr = x === wx || x === wx + 27 || y === 91 || x === wx + 13 || y === 60; L.set(x, y, fr ? "#14121a" : hash(x, y, 5) > 0.97 ? "#f2ecd0" : mix("#0b1430", "#253a70", (y - 30) / 62)); }
  L.ell(130, 44, 4, 4, "#f2ecd0");
  L.rect(54, 126, 52, 10, (x, y) => (y === 126 ? "#6a2a2a" : "#4a1a1a"));
  return L;
}
function crierLay(f) {
  const L = new Lay(36, 56);
  L.rect(11, 50, 5, 6, "#3a2414"); L.rect(20, 50, 5, 6, "#3a2414");
  for (let y = 24; y < 51; y++) { const hw = 8 + (y - 24) * 0.25; for (let x = Math.round(18 - hw); x < Math.round(18 + hw); x++) L.set(x, y, x < 18 - hw + 2 ? "#7a46b0" : x > 18 + hw - 3 ? "#3e1a5c" : "#5b2a86"); }
  L.rect(16, 24, 4, 27, GOLD[1]); L.ell(18, 33, 3, 3, GOLD[0]);
  L.ell(18, 15, 6, 6.5, sh3(SKIN)); L.set(16, 14, K); L.set(20, 14, K); L.rect(16, 18, 4, 1, "#7a2a20"); L.ell(18, 16.5, 1.4, 1.2, "#e0866a");
  L.rect(9, 6, 18, 3, "#2a6a3a"); L.rect(12, 1, 12, 6, (x, y) => (y === 1 ? "#3a8a4a" : "#2a6a3a")); L.line(24, 6, 31, -2, "#e8e0d0", 1);
  // brazo con campana
  const by = f ? 4 : 10; L.line(26, 27, 30, by + 8, "#5b2a86", 2.4); L.ell(30, by + 6, 2.2, 2.2, sh3(SKIN));
  for (let y = by - 4; y < by + 4; y++) { const hw = 1.5 + (y - by + 4) * 0.45; for (let x = Math.round(31 - hw); x < Math.round(31 + hw); x++) L.set(x, y, x < 31 ? GOLD[0] : GOLD[1]); }
  L.line(10, 27, 6, 36, "#5b2a86", 2.4); L.ell(6, 38, 2.2, 2.2, sh3(SKIN));
  return L.outline();
}
function villagerLay(col, f) {
  const L = new Lay(18, 34);
  for (let y = 14; y < 32; y++) { const hw = 5 + (y - 14) * 0.2; for (let x = Math.round(9 - hw); x < Math.round(9 + hw); x++) L.set(x, y, x < 9 - hw + 2 ? lit(col, 0.2) : col); }
  L.rect(5, 31, 3, 3, "#3a2414"); L.rect(10, 31, 3, 3, "#3a2414");
  L.ell(9, 8, 4.6, 5, sh3(SKIN)); L.set(8 - f, 8, K); L.set(11 - f, 8, K); L.rect(4, 3, 10, 3, f ? "#6b4220" : "#c8a060");
  return L.outline();
}

// --------------------------------------------------------- Escenas
function drawHall(t, o = {}) {
  img(o.day ? R.roomDay : R.room, 0, 0);
  if (!o.day) moonbeam(0.06);
  img(R.throne, 47, 46);
}
const S = {};
S.titulo = { map: true, dur: 6, text: "Hubo una vez un rey.", fray: "solemne",
  html: `<div class="title"><div class="crownmark"></div><div class="big">Reyes de<br>Pacotilla</div><div class="sub">Aldricia, el Reino Más o Menos Unido</div></div><div class="clouds"><i></i><i></i><i></i><i></i></div>`,
  draw(t) { mapView({ t, mode: "neutral", z0: [0.55, 0.45, 1.25], z1: [0.42, 0.55, 1.4], sepia: 1 }); } };
S.banquete = { dur: 7, text: "El buen rey Aldric gobernó Aldricia cuarenta años, casi siempre desde la mesa.", fray: "solemne",
  draw(t) {
    drawHall(t); torches(t);
    const ph = t % 2.6; let k = R.kIdle, bob = 0;
    if (ph < 0.55) k = R.kUp; else if (ph < 0.95) k = R.kBite; else { k = Math.floor(ph * 5) % 2 ? R.kChew : R.kIdle; bob = Math.floor(ph * 5) % 2; }
    img(k, 54, 76 + bob);
    for (let i = 0; i < 5; i++) { const p = ((t - 1) * 1.3 + i * 0.23) % 1.6; if (t > 1 && p < 1) px(78 + hash(i, 9) * 8 + p * 3, 106 + p * 30, i % 2 ? "#e0a050" : "#f2d090"); }
    img(R.table, 0, 126); candles(t); vignette(0.5);
  } };
S.ave = { dur: 7.5, text: "Hasta que un ave, ya asada, le plantó cara.", foot: "Nota del cronista: fue un combate singular. Quien hable de huesos será desterrado.", fray: "escandalizado",
  html: `<div class="sfx sfx1">¡Ghhk!</div><div class="sfx sfx2">¡PLOF!</div><div class="flash"></div>`,
  draw(t) {
    let sx = 0; if (t > 3.75 && t < 4.3) sx = Math.round(Math.sin(t * 90) * 2);
    g.save(); g.translate(sx, 0);
    drawHall(t); torches(t);
    const out = t > 4.1;
    if (t < 0.6) img(R.kUp, 54, 76);
    else if (t < 1.1) img(R.kBite, 54, 76);
    else if (t < 2.0) img(R.kChoke, 54 + (Math.floor(t * 16) % 2 ? 1 : -1), 76);
    else if (t < 3.0) img(R.kChokeNC, 54 + (Math.floor(t * 16) % 2 ? 1 : -1), 76);
    else if (t < 3.8) { const v = ease((t - 3) / 0.8); rot(R.kChokeNC, 54 - v * 8, 76 + v * 48, -v * 1.2, 26, 56); }
    if (t > 4.0) { const w = Math.floor(t * 4) % 2; img(R.boots, 66 + (w ? 1 : 0), 116 + Math.max(0, (4.4 - t) * 30)); }
    // el muslo sale volando
    if (t >= 1.1) { const v = clamp((t - 1.1) / 1.2); const x = lerp(82, 150, v), y = 94 - Math.sin(v * Math.PI) * 50 + v * 60; rot(R.drum, x, Math.min(y, 164), t * 9, 5, 7); }
    // la corona salta, bota y rueda
    if (t >= 2.0) { let x, y, a; const u = t - 2.0;
      if (u < 0.9) { const v = u / 0.9; x = lerp(68, 120, v); y = 76 - Math.sin(v * Math.PI) * 44 + v * 78; a = v * 7; }
      else if (u < 1.3) { const v = (u - 0.9) / 0.4; x = lerp(120, 130, v); y = 162 - Math.sin(v * Math.PI) * 10; a = 7 + v * 2; }
      else { const v = clamp((u - 1.3) / 1.2); x = lerp(130, 138, ease(v)); y = 162; a = 9 + v * 1.4; }
      rot(R.crown, x, y, a, 12, 6);
      if (u > 0.9 && u < 1.6) for (let i = 0; i < 6; i++) { const r = (u - 0.9) * 22; px(x + 12 + Math.cos(i) * r, y + 6 + Math.sin(i) * r * 0.5, "#fff2b0"); }
    }
    img(R.table, 0, 126);
    candles(t, out);
    if (out) for (let i = 0; i < 8; i++) { const p = ((t - 4.1) * 0.6 + i * 0.13) % 1.2; for (const cx of [16.5, 142.5]) px(cx + Math.sin(p * 8 + i) * 2, 124 - p * 30, `rgba(200,200,210,${0.5 * (1 - p)})`); }
    if (t > 2.2) for (let i = 0; i < 10; i++) { const p = clamp((t - 3.8 - i * 0.02) / 0.8); if (p > 0 && p < 1) px(60 + i * 4, 136 - p * 10 - hash(i, 3) * 6, `rgba(220,200,170,${1 - p})`, 2, 2); }
    shade(out ? 0.3 : 0); vignette(0.55);
    g.restore();
  } };
S.testamento = { dur: 8.5, text: "Su testamento cabía en una línea. Las llaves del tesoro, en ningún sitio.", foot: "El cronista no acusa a nadie. Tampoco a las ratas.", fray: "solemne",
  html: `<div class="scroll"><span class="seal"></span><h3>Testamento de Aldric I</h3><div class="will">«Que gobierne el más capaz.»</div><div class="sig">Aldric, rey (por la gracia de Dios y del pollo)</div><div class="pd">P. D.: ¿Alguien ha visto las llaves del tesoro?</div></div>`,
  draw(t) {
    img(R.room, 0, 0); shade(0.35); moonbeam(0.1); motes(t, 0.9); torches(t);
    img(R.throne, 47, 46); img(R.cushion, 66, 92); img(R.crown, 68, 82 + Math.round(Math.sin(t * 2) * 0)); if (Math.floor(t * 2) % 3 === 0) px(72, 84, "#fff");
    // tablero de llaves, vacío
    g.fillStyle = "#5a3a1c"; g.fillRect(118, 96, 30, 16); g.fillStyle = "#3a2414"; g.fillRect(118, 96, 30, 1); g.fillRect(118, 111, 30, 1);
    for (let i = 0; i < 4; i++) { px(122 + i * 7, 99, "#a0a0a8"); g.globalAlpha = 0.25; g.drawImage(R.key, 0, 0, 14, 7, 120 + i * 7, 101, 7, 4); g.globalAlpha = 1; }
    // una rata cruza con una llave
    if (t > 3.6) { const x = lerp(-30, 190, (t - 3.6) / 3.2); const f = Math.floor(t * 10) % 2; img(R.key, x - 14, 163 + f); img(R.rat[f], x, 158); }
    vignette(0.6);
  } };
S.pretendientes = { dur: 8.5, text: "Siete casas se creyeron las más capaces.", foot: "Las siete se equivocaban, salvo una. El cronista aún no sabe cuál.", fray: "adulador",
  html: () => `<div class="suitors">${DATA.houses.map((h, i) => `<div class="pre" style="--i:${i};--c:${h.color}"><div class="flag"><canvas data-shield="${i}"></canvas></div><b>${h.n}</b><em>«${h.lema}»</em></div>`).join("")}</div>`,
  draw(t) { img(R.room, 0, 0); shade(0.55); img(R.throne, 47, 46); shade(0.3); glow(80, 70, 60, "rgba(255,220,140,A)", 0.25); torches(t); vignette(0.7); } };
S.mapa = { map: true, dur: 9.5, text: "Empieza el interregno. Seis semanas, un trono vacío y ninguna llave.", fray: "monedas",
  html: `<div class="clouds out"><i></i><i></i><i></i><i></i></div><span class="yours">Tu castillo</span><button class="cta" type="button">Entrar en mi castillo</button>`,
  draw(t) { mapView({ t, mode: "reveal", rings: true }); } };

S.campanas = { dur: 6.5, text: "Suenan las campanas de Aldricia: el interregno ha terminado.", fray: "solemne",
  html: `<div class="dong d1">¡DONG!</div><div class="dong d2">¡DING!</div>`,
  draw(t) {
    img(R.dawn, 0, 0);
    const a1 = Math.sin(t * 3.2) * 0.55, a2 = Math.sin(t * 3.2 + 1.4) * 0.5;
    rot(R.bell, 60, 52, a1, 11, 1); rot(R.bell, 78, 52, a2, 11, 1);
    for (let i = 0; i < 14; i++) { const st = 0.6 + hash(i, 1) * 1.6; if (t < st) continue; const u = t - st; const ang = -0.4 - hash(i, 2) * 2.4; const x = 80 + Math.cos(ang) * u * (30 + hash(i, 3) * 20), y = 70 + Math.sin(ang) * u * 26 + Math.sin(u * 6 + i) * 2; const f = Math.floor(t * 8 + i) % 2;
      px(x - 2, y + (f ? 0 : -1), "#1a1418"); px(x - 1, y + (f ? 1 : 0), "#1a1418"); px(x, y + 1, "#1a1418"); px(x + 1, y + (f ? 1 : 0), "#1a1418"); px(x + 2, y + (f ? 0 : -1), "#1a1418"); }
    // bandera
    const f = Math.floor(t * 4) % 2; g.fillStyle = "#5b2a86"; for (let i = 0; i < 12; i++) g.fillRect(81 + i, 0 + Math.round(Math.sin(i * 0.6 + t * 6) * (f + 1) * 0.5), 1, 6);
  } };
S.semanas = { map: true, dur: 10, text: "Seis semanas de tratos, asedios y promesas rotas.", foot: "Ahora el mapa se ve entero: ya no queda nada que esconder.", fray: "solemne",
  html: `<div class="weekbox"><span class="wk">Semana 1</span><div class="wbar"><i></i></div></div>`,
  draw(t) { mapView({ t, mode: "weeks" }); } };
S.objetivos = { dur: 9.5, text: "Las ambiciones ocultas, por fin a la vista.", foot: "Cada objetivo cumplido suma 6 de Prestigio.", fray: "escandalizado",
  html: () => `<div class="sheet"><h4>Objetivos secretos</h4>${OBJ.map((o, i) => `<div class="obj" style="--i:${i}"><canvas data-shield="${i}"></canvas><div><b style="--c:${DATA.houses[i].color}">${DATA.houses[i].n}</b><span>${o[0]}</span></div><i class="stamp ${o[1] ? "ok" : "ko"}">${o[1] ? "Cumplido<br>+6" : o[2]}</i></div>`).join("")}</div>`,
  draw(t) { g.fillStyle = "#1c120b"; g.fillRect(0, 0, PW, PH); } };
S.titulos = { dur: 9.5, text: "Cada casa recibe el título que se ha ganado.", foot: "Con cariño. Casi siempre.", fray: "adulador",
  html: () => `<div class="sheet titles"><h4>Títulos del interregno</h4>${TIT.map((o, i) => `<div class="tit" style="--i:${i}"><canvas data-shield="${i}"></canvas><div><b style="--c:${DATA.houses[i].color}">${DATA.houses[i].n}</b><strong>${o[0]}</strong><small>${o[1]}</small></div></div>`).join("")}</div>`,
  draw(t) { g.fillStyle = "#1c120b"; g.fillRect(0, 0, PW, PH); } };
S.podio = { dur: 7.5, text: "El Prestigio final, contado dos veces por el cronista.", fray: "adulador",
  html: () => `<div class="podnames">${[1, 0, 2].map((h, k) => `<div class="pn p${k}"><b style="--c:${DATA.houses[h].color}">${DATA.houses[h].n}</b><span class="num" data-to="${FINAL[h]}">0</span></div>`).join("")}</div>`,
  draw(t) {
    g.fillStyle = "#140c08"; g.fillRect(0, 0, PW, PH);
    for (const [x, a] of [[40, 0.18], [80, 0.3], [120, 0.18]]) { g.fillStyle = `rgba(255,220,150,${a * clamp(t * 2)})`; g.beginPath(); g.moveTo(x - 6, 0); g.lineTo(x + 6, 0); g.lineTo(x + 22, 150); g.lineTo(x - 22, 150); g.fill(); }
    const blocks = [[12, 116, 1], [56, 98, 0], [100, 126, 2]];
    for (const [bx, by, h] of blocks) { const rise = ease(clamp(t * 1.4 - (h === 0 ? 0.6 : h === 1 ? 0.3 : 0))); const yy = lerp(176, by, rise);
      g.fillStyle = "#5a3d26"; g.fillRect(bx, yy, 48, 176 - yy); g.fillStyle = "#7a5530"; g.fillRect(bx, yy, 48, 3); g.fillStyle = GOLD[1]; g.fillRect(bx, yy + 3, 48, 2); g.fillStyle = "#3e2a18"; g.fillRect(bx + 44, yy + 5, 4, 176 - yy);
      img(R.shield2[h], bx + 8, yy - 40 - (h === 0 ? Math.abs(Math.sin(t * 3)) * 3 : 0)); }
    if (t > 1.6) img(R.crown, 68, 52 - Math.abs(Math.sin(t * 3)) * 3);
    confetti(t - 1.4);
  } };
S.corona = { dur: 9.5, text: "El fantasma de Aldric baja la corona. Nadie se lo ha pedido.", foot: "¡Larga vida a los Duques del Queso! El cronista siempre creyó en ellos.", fray: "adulador",
  html: `<div class="hail">¡Larga vida a los<br>Duques del Queso!</div><div class="endbtns"><button type="button">Leer la Crónica Definitiva</button><button type="button" class="sec">Compartir la coronación</button></div>`,
  draw(t) {
    img(R.roomDay, 0, 0); glow(80, 70, 90, "rgba(255,230,160,A)", 0.35);
    g.save(); g.globalAlpha = 0.18; g.translate(80, 74); g.rotate(t * 0.15); g.fillStyle = "#fff2c0"; for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -120); g.lineTo(6, -120); g.fill(); } g.restore();
    img(R.throne, 47, 46); img(R.shield2[0], 64, 58);
    const gy = t < 3 ? lerp(-80, 0, ease(t / 3)) : t < 5.2 ? 0 : lerp(0, -90, ease((t - 5.2) / 2.5));
    const ga = t < 5.2 ? 0.85 : clamp(0.85 - (t - 5.2) / 2.5);
    const gx = 54 + Math.sin(t * 1.6) * 3, wob = Math.sin(t * 2.4) * 2;
    rot(R.ghostHold, gx, gy + wob, 0, 26, 30, ga);
    let cx, cy; if (t < 3.4) { cx = gx + 14; cy = gy + wob + 2; } else { const v = ease(clamp((t - 3.4) / 1.6)); cx = lerp(gx + 14, 68, v); cy = lerp(gy + wob + 2, 47, v); }
    img(R.crown, cx, cy);
    if (t > 5) for (let i = 0; i < 16; i++) { const u = (t - 5) * 1.2 + hash(i, 1); const p = u % 1; const ang = hash(i, 2) * 6.28; px(80 + Math.cos(ang) * p * 40, 52 + Math.sin(ang) * p * 30, `rgba(255,248,200,${1 - p})`); }
    torches(t);
    if (t > 5.2) confetti(t - 5.2);
    vignette(0.35);
  } };

S.ratas = { dur: 8.5, text: "Las ratas han organizado un banquete en los graneros reales. No invitaron a nadie.", fray: "escandalizado",
  html: `<div class="evcard"><small>Evento de la semana</small><b>La Gran Plaga de Ratas</b><span>−25 % de Pan para todos durante una semana.</span></div>`,
  draw(t) {
    img(R.granary, 0, 0); glow(80, 24, 50, "rgba(150,170,255,A)", 0.12);
    // pan en los estantes: desaparece poco a poco
    for (let i = 0; i < 12; i++) { const x = 6 + i * 13, y = i % 2 ? 51 : 52; if (t < 1.5 + hash(i, 4) * 6) img(R.bread, x, y); }
    for (let i = 0; i < 10; i++) { const x = 8 + i * 15, y = 96; if (t < 1 + hash(i, 5) * 6.5) img(R.bread, x, y); }
    // ratas
    for (let i = 0; i < 16; i++) { const lane = [156, 162, 168, 53, 97][i % 5]; const sp = 26 + hash(i, 6) * 30; const st = hash(i, 7) * 4; if (t < st) continue;
      const x = ((t - st) * sp + hash(i, 8) * 40) % 200 - 30; const f = Math.floor(t * 10 + i) % 2; const flip = i % 3 === 0;
      if (flip) { g.save(); g.translate(PW, 0); g.scale(-1, 1); img(R.rat[f], x, lane - 8 + f); if (i % 2) img(R.bread, x + 12, lane - 13); g.restore(); }
      else { img(R.rat[f], x, lane - 8 + f); if (i % 2) img(R.bread, x + 12, lane - 13); } }
    vignette(0.6);
  } };
S.pregonero = { dur: 7.5, text: "El pregonero lee el bando de la semana.", foot: "Viñeta común para los eventos que no tienen escena propia.", fray: "solemne",
  html: `<div class="bando"><small>Bando del martes</small><b>La Fiesta de San Aldric</b><span>El jueves, toda la producción es doble.</span></div>`,
  draw(t) {
    img(R.plaza, 0, 0);
    const f = Math.floor(t * 3) % 2; img(R.crier[f], 62, 104);
    img(R.villager[0], 16, 124 + (Math.floor(t * 2) % 2)); img(R.villager[1], 126, 126);
    if (f) for (let i = 0; i < 3; i++) { g.strokeStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(93, 106, 5 + i * 4, -1.2, 0.2); g.stroke(); }
  } };
S.ultima = { dur: 7.5, text: "Última semana del interregno. Quien quiera la corona, que se dé prisa.", fray: "solemne",
  html: `<div class="last"><small>Semana 6 de 6</small><b>La última semana</b><span class="nights">Quedan 7 noches</span><ol>${[0, 1, 2].map((h) => `<li><i style="background:${DATA.houses[h].color}"></i>${DATA.houses[h].n}<em>${[142, 131, 118][h]}</em></li>`).join("")}</ol></div>`,
  draw(t) {
    g.fillStyle = "#0e0a12"; g.fillRect(0, 0, PW, PH); g.globalAlpha = 0.25; img(R.throne, 47, 30); g.globalAlpha = 1; glow(80, 120, 60, "rgba(255,200,120,A)", 0.18);
    img(R.hg, 40, 50);
    for (let i = 0; i < 20; i++) { const p = (t * 1.6 + i / 20) % 1; px(79 + (i % 2), 112 + p * 50, i % 3 ? "#e0b860" : "#c89a40"); }
    vignette(0.6);
  } };
S.fantasma = { dur: 8.5, text: "Según el fantasma de Aldric, en sus tiempos las guerras eran más elegantes.", foot: "El cronista estaba allí y no lo recuerda así.", fray: "escandalizado",
  html: `<div class="bubble">En mis tiempos, las guerras eran más elegantes. ¡Y se cenaba mejor!</div>`,
  draw(t) {
    img(R.corridor, 0, 0);
    g.fillStyle = "rgba(190,210,255,.08)"; for (const wx of [12, 120]) { g.beginPath(); g.moveTo(wx, 92); g.lineTo(wx + 28, 92); g.lineTo(wx + 40, 176); g.lineTo(wx + 6, 176); g.fill(); }
    img(R.portrait, 63, 40);
    const x = t < 2.6 ? lerp(-60, 70, ease(t / 2.6)) : 70 + Math.sin((t - 2.6) * 1.3) * 4, y = 74 + Math.sin(t * 2.2) * 3;
    rot(R.ghostDrum, x, y, Math.sin(t * 1.7) * 0.05, 26, 38, 0.82);
    for (let i = 0; i < 10; i++) { const p = (t * 0.7 + hash(i, 1)) % 1; px(x + 10 + hash(i, 2) * 32, y + 70 - p * 30, `rgba(220,240,255,${0.6 * (1 - p)})`); }
    vignette(0.65);
  } };

function confetti(u) { if (u <= 0) return; const cols = ["#e8b83a", "#f2e6cc", "#b3291d", "#2e5aa8", "#246b2a", "#a23c9e"]; for (let i = 0; i < 46; i++) { const st = hash(i, 1) * 2; if (u < st) continue; const p = ((u - st) * (0.35 + hash(i, 2) * 0.3)) % 1.15; const x = hash(i, 3) * PW + Math.sin(u * 3 + i) * 5, y = -6 + p * 190; px(x, y, cols[i % 6], i % 3 ? 2 : 1, i % 2 ? 2 : 1); } }

const OBJ = [["Controlar una fortaleza al final de la partida.", 1], ["Cerrar 10 tratos válidos a lo largo de la partida.", 0, "Fallido<br>7 de 10"], ["Tomar 3 casillas a otras casas a lo largo de la partida.", 1], ["Terminar con 150 de Oro o más en el tesoro.", 0, "Fallido<br>98 de 150"], ["Terminar con 40 tropas o más.", 1], ["Sumar 17 niveles entre tus cinco edificios.", 1], ["Cerrar tratos válidos con 3 casas distintas.", 1]];
const TIT = [["Futuro Rey, según el cronista", "14 casillas al final"], ["Traidor de la Corona", "rompió 2 alianzas"], ["Azote de Fortalezas", "ganó 3 asedios"], ["La Gallina que Cruzó el Vado", "tomó 4 casillas en una sola noche"], ["Mariscal de la Retirada Estratégica", "sufrió 6 rebotes"], ["Guardián del Castillo Propio", "no salió de casa en 6 semanas"], ["Mercader Incansable", "cerró 12 tratos"]];
const FINAL = [148, 131, 124];

const SEQ = {
  prologo: { name: "Prólogo", scenes: ["titulo", "banquete", "ave", "testamento", "pretendientes", "mapa"] },
  coronacion: { name: "Coronación", scenes: ["campanas", "semanas", "objetivos", "titulos", "podio", "corona"] },
  evento: { name: "Evento", scenes: ["ratas", "pregonero"] },
  ultima: { name: "Última semana", scenes: ["ultima"] },
  fantasma: { name: "Fantasma", scenes: ["fantasma"] },
};
