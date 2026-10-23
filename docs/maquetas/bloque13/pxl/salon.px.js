// El salón del trono de Aldricia (bloque 13): fondo de noche y de día (160x176),
// la mesa del banquete, el trono, el cojín, la llave, las botas del rey y la
// rata. Parte de los fondos de la maqueta (../engine.js: roomLay, tableLay,
// throneLay…); los degradados van en pocas bandas para que quepan en una paleta.
// Los escudos de los estandartes los pone el juego (salen de shield.ts).
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/salon.px.js --out <carpeta>
pal({ k: "#1a1410", y: "#fbe39a", Y: "#e8b83a", o: "#a97e14" })

const PW = 160, PH = 176
const GOLD = ["y", "Y", "o"]
// El mismo azar fijo que la maqueta.
function h3(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
/** Mezcla en `bands` pasos: un degradado de pocos colores. */
function mix(a, b, t, bands = 0) { if (bands) t = Math.round(Math.max(0, Math.min(1, t)) * bands) / bands; const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }
const lit = (c, f) => (f > 0 ? mix(c, "#ffffff", f) : mix(c, "#000000", -f))

function brush(c, w, h) {
  const B = {
    set(x, y, k) { x = Math.round(x); y = Math.round(y); if (k && x >= 0 && y >= 0 && x < w && y < h) c.px(x, y, k) },
    rect(x0, y0, rw, rh, k) { for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) B.set(x, y, typeof k === "function" ? k(x, y) : k) },
    ell(cx, cy, rx, ry, k) {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) B.set(x, y, typeof k === "function" ? k(x, y, dx, dy) : k)
      }
    },
  }
  return B
}
const sh3 = (cols) => (x, y, dx, dy) => { const l = dx + dy; return l < -0.75 ? cols[0] : l > 0.6 ? cols[2] : cols[1] }

// ------------------------------------------------------------- el salón
function salon(c, day) {
  const B = brush(c, PW, PH)
  const wallC = day ? ["#7a6a58", "#6e604f", "#837260", "#6a5b4b"] : ["#4d4239", "#463c34", "#52463c", "#433a32"]
  for (let y = 0; y < 132; y++) for (let x = 0; x < PW; x++) {
    const row = Math.floor(y / 7), off = (row % 2) * 6, bx = Math.floor((x + off) / 12)
    const mortar = y % 7 === 6 || (x + off) % 12 === 11
    let col = mortar ? (day ? "#4a3e33" : "#2e2722") : wallC[Math.floor(h3(bx, row) * 4)]
    if (!mortar && y % 7 === 0) col = lit(col, 0.08)
    if (!mortar && h3(x, y, 3) > 0.93) col = lit(col, -0.08)
    B.set(x, y, col)
  }
  // zócalo y suelo de losas
  B.rect(0, 126, PW, 6, (x, y) => (y === 126 ? (day ? "#a08c74" : "#6a5d50") : (day ? "#5a4a3a" : "#3a312a")))
  for (let y = 132; y < PH; y++) for (let x = 0; x < PW; x++) {
    const row = Math.floor((y - 132) / 8), off = (row % 2) * 8, m = (y - 132) % 8 === 7 || (x + off) % 16 === 15
    B.set(x, y, m ? (day ? "#3a2c20" : "#1e1611") : h3(Math.floor((x + off) / 16), row, 5) > 0.5 ? (day ? "#6a5240" : "#3a2e26") : (day ? "#5e4836" : "#332820"))
  }
  // ventanas en arco con cielo (estrellas de noche)
  for (const wx of [6, 134]) {
    B.rect(wx - 2, 24, 24, 54, (x, y) => (x === wx - 2 || y === 77 ? (day ? "#b0a088" : "#7a6c5e") : (day ? "#968670" : "#5e5246")))
    for (let y = 26; y < 76; y++) for (let x = wx; x < wx + 20; x++) {
      const ay = 26 + 10 - Math.sqrt(Math.max(0, 100 - (x - wx - 9.5) ** 2))
      if (y < ay) continue
      let col = day ? mix("#7ec0f0", "#d8eefa", (y - 26) / 50, 4) : mix("#0b1430", "#1f3264", (y - 26) / 50, 4)
      if (!day && h3(x, y, 9) > 0.975) col = "#f2ecd0"
      B.set(x, y, col)
    }
    B.rect(wx + 9, 26, 2, 50, day ? "#5a4a3a" : "#2a2420"); B.rect(wx, 50, 20, 2, day ? "#5a4a3a" : "#2a2420")
  }
  if (!day) { B.ell(147, 38, 4.5, 4.5, sh3(["#fffbe8", "#f2ecd0", "#c8c0a0"])); B.set(146, 37, "#d8d0b0"); B.set(148, 40, "#d8d0b0") }
  else { B.ell(18, 36, 4, 2, "#ffffff"); B.ell(15, 37, 3, 1.5, "#ffffff") }
  // estandartes morados del rey (el escudo lo pone el juego en x+2, 34)
  for (const bx of [32, 108]) {
    B.rect(bx - 2, 12, 24, 2, (x) => (x % 4 ? GOLD[1] : GOLD[2])); B.ell(bx - 2, 13, 1.6, 1.6, GOLD[0]); B.ell(bx + 21, 13, 1.6, 1.6, GOLD[0])
    for (let y = 14; y < 84; y++) for (let x = bx; x < bx + 20; x++) {
      if (y > 72 && Math.abs(x - bx - 9.5) < (y - 72) * 0.9) continue
      const f = (x - bx) % 5; B.set(x, y, f === 0 ? "#3e1a5c" : f === 1 ? "#6a36a0" : "#5b2a86")
    }
    B.rect(bx, 71, 20, 2, (x) => (x % 2 ? GOLD[1] : GOLD[0]))
  }
  // soportes de las antorchas (la llama la pinta el juego)
  for (const tx of [27, 132]) { B.rect(tx, 62, 3, 6, "#3a3a40"); B.rect(tx - 1, 60, 5, 2, "#55555e"); B.rect(tx, 56, 3, 4, "#6b4220") }
  // alfombra roja
  for (let y = 128; y < PH; y++) { const hw = 16 + (y - 128) * 0.35; for (let x = Math.round(80 - hw); x < Math.round(80 + hw); x++) B.set(x, y, Math.abs(x - 80) > hw - 2 ? GOLD[1] : ((x + y) % 9 === 0 ? "#6e1d12" : "#8a1f16")) }
}
sprite("salon_noche", { w: PW, h: PH }, (c) => salon(c, false))
sprite("salon_dia", { w: PW, h: PH }, (c) => salon(c, true))

// ------------------------------------------------------------- la mesa
// 160x52, con su contorno; el juego la pone en y = 126 (el mantel empieza 8 px más abajo).
function pan(B, ox, oy, w, h) { B.ell(ox + w / 2 + 1, oy + h / 2 + 1, w / 2, h / 2, sh3(["#e8b468", "#c88a3a", "#8a5a20"])); for (let x = 3; x < w; x += 3) B.set(ox + x, oy + Math.round(h / 2), "#f2d090") }
sprite("mesa", { w: PW, h: 52, outline: "k" }, (c) => {
  const B0 = brush(c, PW, 52), B = { ...B0, set: (x, y, k) => B0.set(x, y + 8, k), rect: (x0, y0, w, h, k) => B0.rect(x0, y0 + 8, w, h, typeof k === "function" ? (x, y) => k(x, y - 8) : k), ell: (cx, cy, rx, ry, k) => B0.ell(cx, cy + 8, rx, ry, typeof k === "function" ? (x, y, dx, dy) => k(x, y - 8, dx, dy) : k) }
  for (let y = 6; y < 40; y++) for (let x = 0; x < PW; x++) {
    const hem = 34 + Math.round(Math.sin(x * 0.4) * 1.5); if (y > hem) continue
    const fold = x % 14; let col = y < 9 ? "#fbf6ea" : fold < 2 ? "#cfc6b0" : fold > 11 ? "#ddd4bf" : "#ece4d0"
    if (y === hem) col = "#b8a888"; if (y === 9) col = "#d8cfba"; B.set(x, y, col)
  }
  B.rect(0, 30, PW, 2, (x) => (x % 6 < 3 ? "#a8321f" : "#e8b83a"))
  // la fuente con el pollo, al que le falta un muslo
  B.ell(50, 5, 11, 3.2, sh3(["#f0f0f4", "#c8c8d0", "#8a8a96"]))
  B.ell(50, 1.5, 7, 4.8, sh3(["#f0b060", "#c9772e", "#8a4a1a"]))
  B.ell(56.5, 3, 2.4, 2.8, sh3(["#f0b060", "#c9772e", "#8a4a1a"])); B.rect(58, 0, 1, 2, "#f2e6cc")
  B.set(46, 0, "#ffd08a"); B.set(47, 0, "#ffd08a")
  // pan, uvas, manzanas, copas y candelabros
  pan(B, 72, -1, 11, 6); pan(B, 84, 1, 8, 5)
  for (const [gx, gy] of [[104, 0], [106, 0], [105, 2], [107, 2], [103, 2], [106, 4], [104, 4]]) B.ell(gx, gy, 1.4, 1.4, sh3(["#9a5ac0", "#6a2a8a", "#3e1a5c"]))
  B.ell(96, 3, 2.2, 2.2, sh3(["#f07a6a", "#c0392b", "#7a1c13"])); B.ell(116, 3, 2.2, 2.2, sh3(["#a8d070", "#6a9a3a", "#3e6a1a"]))
  for (const cx of [30, 126]) { B.rect(cx - 2, 0, 5, 4, (x) => (x === cx - 2 ? GOLD[0] : GOLD[1])); B.rect(cx, 4, 1, 2, GOLD[2]); B.rect(cx - 1, 5, 3, 1, GOLD[1]) }
  for (const cx of [16, 142]) { B.rect(cx, -5, 2, 10, (x) => (x === cx ? "#ffffff" : "#ddd6c6")); B.rect(cx - 2, 5, 6, 2, GOLD[1]) }
})

// ------------------------------------------------------------- el trono y lo pequeño
sprite("trono", { w: 66, h: 85, outline: "k" }, (c) => {
  const B0 = brush(c, 66, 85), B = { ...B0, set: (x, y, k) => B0.set(x, y + 1, k), rect: (x0, y0, w, h, k) => B0.rect(x0, y0 + 1, w, h, typeof k === "function" ? (x, y) => k(x, y - 1) : k), ell: (cx, cy, rx, ry, k) => B0.ell(cx, cy + 1, rx, ry, typeof k === "function" ? (x, y, dx, dy) => k(x, y - 1, dx, dy) : k) }
  B.rect(8, 58, 6, 26, (x) => (x === 8 ? GOLD[0] : x > 11 ? GOLD[2] : GOLD[1])); B.rect(52, 58, 6, 26, (x) => (x === 52 ? GOLD[0] : x > 55 ? GOLD[2] : GOLD[1]))
  B.rect(4, 52, 58, 8, (x, y) => (y === 52 ? GOLD[0] : y > 57 ? GOLD[2] : (x % 9 === 0 ? GOLD[2] : GOLD[1])))
  B.rect(10, 6, 46, 48, (x, y) => ((x < 15 || x > 50 || y < 11) ? ((x + y) % 7 === 0 ? GOLD[2] : (x < 12 ? GOLD[0] : GOLD[1])) : null))
  B.rect(15, 11, 36, 41, (x, y) => { const u = (x - 15 + (y - 11)) % 8, v = (x - 15 - (y - 11) + 80) % 8; if (u === 0 || v === 0) return "#7a1c13"; if (u === 4 && v === 4) return GOLD[1]; return x < 22 ? "#c23a2a" : "#a8321f" })
  B.ell(12, 5, 3.4, 3.4, sh3(GOLD)); B.ell(53, 5, 3.4, 3.4, sh3(GOLD))
  B.rect(25, 0, 16, 8, (x, y) => (y === 0 ? GOLD[0] : GOLD[1])); B.rect(29, -1, 8, 2, GOLD[0]); B.ell(33, 3, 2, 2, "#a8321f")
  B.rect(0, 40, 12, 6, (x, y) => (y === 40 ? GOLD[0] : GOLD[1])); B.rect(54, 40, 12, 6, (x, y) => (y === 40 ? GOLD[0] : GOLD[1]))
  B.ell(3, 42, 3.4, 3.4, sh3(GOLD)); B.ell(62, 42, 3.4, 3.4, sh3(GOLD)); B.set(2, 42, "k"); B.set(63, 42, "k")
  B.rect(1, 46, 4, 8, GOLD[2]); B.rect(61, 46, 4, 8, GOLD[2])
})
sprite("cojin", { w: 28, h: 8, outline: "k" }, (c) => {
  const B = brush(c, 28, 8)
  B.ell(14, 4.5, 13, 3.6, sh3(["#d04a3a", "#a8321f", "#6e1d12"])); B.set(1, 6, "Y"); B.set(26, 6, "Y"); B.set(0, 7, "Y"); B.set(27, 7, "Y")
})
sprite("llave", { w: 14, h: 7, outline: "k" }, (c) => {
  const B = brush(c, 14, 7)
  B.ell(3, 3.5, 3, 3, (x, y) => (x === 3 && (y === 3 || y === 4) ? null : "Y"))
  B.rect(5, 3, 8, 2, (x) => (x % 3 ? "Y" : "o")); B.rect(10, 5, 1, 2, "Y"); B.rect(12, 5, 1, 2, "Y")
})
sprite("botas", { w: 24, h: 12, outline: "k" }, (c) => {
  const B = brush(c, 24, 12)
  for (const bx of [3, 15]) { B.rect(bx, 0, 6, 8, (x) => (x === bx ? "#8a5a30" : "#6b4220")); B.rect(bx, 7, 6, 3, "#4a2c14"); B.rect(bx - 1, 0, 8, 2, "#a8321f") }
})
function rata(c, f) {
  const B = brush(c, 18, 9), fur = sh3(["#9a8c80", "#76695e", "#51473f"])
  B.ell(8, 5, 5.5, 3, fur); B.ell(13.5, 4.5, 3, 2.2, fur); B.set(16, 4, "#e8a0a8"); B.set(14, 3, "k"); B.ell(12, 2, 1.2, 1.2, "#d89098")
  for (let i = 0; i < 6; i++) B.set(2 - i * 0.3, 5 + Math.sin(i + f * 2) * 1.2, "#d89098")
  if (f) { B.set(5, 8, "#51473f"); B.set(11, 8, "#51473f") } else { B.set(7, 8, "#51473f"); B.set(9, 8, "#51473f") }
}
anim("rata", { w: 18, h: 9, fps: 10, outline: "k" }, frame((c) => rata(c, 0)), frame((c) => rata(c, 1)))
