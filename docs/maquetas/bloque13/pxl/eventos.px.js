// Las viñetas propias de los eventos de la semana (bloque 13, punto 5): los
// fondos (160x176) y las figuras que el juego mueve encima. El resto de eventos
// usa el pregonero (pregonero.px.js). Lo que se mueve (lluvia, rayos, confeti,
// farolillos, chispas, polvo) lo pinta el juego; la rata, la llave, el cojín, el
// trono y el fantasma vienen de salon.px.js y aldric.px.js.
//   Plaga de Ratas: granero, pan.          Tormenta en la Costa: puerto, barco.
//   Fiesta de San Aldric: estatua.         Bandidos del Camino: camino, carro, rueda, bandido.
//   Torneo Real: liza, caballero.          Paz del Rey: prado, soldado, paloma.
//   Carnaval: cabezudo, careta.            El Rey Ha Perdido las Llaves: el salón de día.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/eventos.px.js --out <carpeta>
pal({ k: "#1a1410", y: "#fbe39a", Y: "#e8b83a", o: "#a97e14" })

const PW = 160, PH = 176
const GOLD = ["y", "Y", "o"]
function h3(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
function mix(a, b, t, bands = 0) { if (bands) t = Math.round(Math.max(0, Math.min(1, t)) * bands) / bands; const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t) }

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
    line(x0, y0, x1, y1, k, w = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; if (w <= 1) B.set(x, y, k); else B.rect(Math.round(x - w / 2), Math.round(y - w / 2), Math.ceil(w), Math.ceil(w), k) }
    },
    /** Triángulo relleno (para tejados, banderines y velas). */
    tri(ax, ay, bx, by, cx, cy, k) {
      const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx)), y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy))
      const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d1 = s(x + 0.5, y + 0.5, ax, ay, bx, by), d2 = s(x + 0.5, y + 0.5, bx, by, cx, cy), d3 = s(x + 0.5, y + 0.5, cx, cy, ax, ay)
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) B.set(x, y, typeof k === "function" ? k(x, y) : k)
      }
    },
  }
  return B
}
const sh3 = (cols) => (x, y, dx, dy) => { const l = dx + dy; return l < -0.75 ? cols[0] : l > 0.6 ? cols[2] : cols[1] }
const SKIN = ["#f8d4b0", "#ebb48a", "#c4855a"]
const WOOD = ["#a06a38", "#7a4c26", "#5a3418"]
const STEEL = ["#e4e8ee", "#a8b0bc", "#6a7280"]

/** Árbol redondo de copa a tres tonos. */
function arbol(B, x, y, r, cols = ["#5a8a3a", "#3e6a2a", "#264a1e"]) {
  B.rect(x - 1, y, 3, r + 4, "#4a2c14")
  B.ell(x, y - r * 0.4, r, r, sh3(cols)); B.ell(x - r * 0.6, y, r * 0.7, r * 0.6, sh3(cols)); B.ell(x + r * 0.6, y + 1, r * 0.7, r * 0.6, sh3(cols))
}
/** Castillito lejano sobre una colina, con su bandera. */
function castillito(B, x, y, flag) {
  const st = (xx, yy) => ((xx + yy) % 5 === 0 ? "#8a8494" : "#a8a2b0")
  B.rect(x, y, 22, 14, st); B.rect(x - 3, y - 6, 7, 20, st); B.rect(x + 18, y - 6, 7, 20, st)
  for (let i = 0; i < 4; i++) B.rect(x + 1 + i * 6, y - 2, 3, 2, st)
  B.rect(x - 3, y - 8, 2, 2, st); B.rect(x + 2, y - 8, 2, 2, st); B.rect(x + 18, y - 8, 2, 2, st); B.rect(x + 23, y - 8, 2, 2, st)
  B.rect(x + 8, y + 6, 6, 8, "#3a2a2e"); B.rect(x, y - 1, 1, 1, "#6a6474")
  B.rect(x + 21, y - 15, 1, 8, "#3a3a40"); B.rect(x + 22, y - 15, 6, 4, flag)
}

// ============================================================= Plaga de Ratas
// El granero real de noche: tablones, dos estantes (el pan lo pone el juego),
// sacos de trigo y paja en el suelo. Las ratas corren por y = 61, 105 y 148-168.
sprite("granero", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  const plank = ["#5a3a22", "#4e321e", "#63402a", "#462c1a"]
  for (let y = 0; y < 140; y++) for (let x = 0; x < PW; x++) {
    const col = Math.floor(x / 10), seam = x % 10 === 9, knot = h3(col, Math.floor(y / 30), 4) > 0.8 && Math.abs((y % 30) - 14) < 2 && Math.abs((x % 10) - 4) < 2
    B.set(x, y, seam ? "#2a1a10" : knot ? "#3a2416" : plank[Math.floor(h3(col, 1) * 4)])
  }
  // vigas del techo y la ventanuca con luna
  B.rect(0, 0, PW, 8, (x, y) => (y === 7 ? "#2a1a10" : y === 0 ? "#7a5232" : "#5e3e24"))
  for (const bx of [0, 74, 148]) B.rect(bx, 0, 12, 140, (x, y) => (x === bx ? "#7a5232" : x === bx + 11 ? "#2a1a10" : "#5e3e24"))
  B.rect(56, 14, 48, 30, "#2a1a10")
  for (let y = 16; y < 42; y++) for (let x = 58; x < 102; x++) B.set(x, y, mix("#0e1834", "#22356a", (y - 16) / 26, 3))
  B.ell(92, 23, 4, 4, sh3(["#fffbe8", "#f2ecd0", "#c8c0a0"])); B.set(64, 20, "#f2ecd0"); B.set(70, 34, "#f2ecd0"); B.set(84, 37, "#f2ecd0")
  B.rect(79, 16, 2, 26, "#2a1a10"); B.rect(58, 28, 44, 2, "#2a1a10")
  // estantes (el pan va encima, en y = 51 y 95)
  for (const sy of [58, 102]) {
    B.rect(0, sy, PW, 4, (x, y) => (y === sy ? "#b07a44" : y === sy + 3 ? "#3a2416" : "#8a5a30"))
    for (const bx of [10, 70, 130]) { B.line(bx, sy + 4, bx + 8, sy + 12, "#5a3a22", 2) }
  }
  // suelo de tierra con paja
  for (let y = 140; y < PH; y++) for (let x = 0; x < PW; x++) {
    let col = h3(x >> 2, y >> 1, 7) > 0.5 ? "#6a5232" : "#5e482a"
    if (h3(x, y, 8) > 0.86) col = "#c8a456"; else if (h3(x, y, 9) > 0.9) col = "#a08040"
    B.set(x, y, col)
  }
  B.rect(0, 140, PW, 1, "#2a1a10")
  // sacos de trigo
  for (const [sx, sy] of [[4, 120], [20, 124], [134, 122], [146, 118]]) {
    B.ell(sx + 6, sy + 12, 8, 10, sh3(["#e8d8b0", "#c8b088", "#8a7454"]))
    B.rect(sx + 3, sy + 1, 7, 2, "#8a7454"); B.ell(sx + 6, sy - 1, 3, 2, "#c8b088")
    B.set(sx + 4, sy + 12, "#8a6a3a"); B.set(sx + 8, sy + 10, "#8a6a3a")
  }
})
sprite("pan", { w: 12, h: 7, outline: "k" }, (c) => {
  const B = brush(c, 12, 7)
  B.ell(6, 3.5, 5, 2.6, sh3(["#e8b468", "#c88a3a", "#8a5a20"])); for (let x = 3; x < 10; x += 3) B.set(x, 3, "#f2d090")
})

// ============================================================= Fiesta de San Aldric
// La estatua dorada del santo patrón (el difunto rey, con su muslo de pollo) en
// su pedestal. Va en la plaza del pregonero, con banderines y confeti del juego.
sprite("estatua", { w: 40, h: 74, outline: "k" }, (c) => {
  const B = brush(c, 40, 74)
  const G3 = ["#fbe39a", "#e8b83a", "#a97e14"]
  // pedestal de piedra con placa
  B.rect(4, 50, 32, 24, (x, y) => (y === 50 ? "#c8c0b4" : x < 8 ? "#b0a89c" : x > 31 ? "#6e6860" : "#8e877c"))
  B.rect(2, 48, 36, 3, (x, y) => (y === 48 ? "#d8d0c4" : "#8e877c")); B.rect(2, 70, 36, 4, "#6e6860")
  B.rect(12, 56, 16, 7, "#a97e14"); B.rect(13, 57, 14, 5, "#e8b83a"); for (let x = 15; x < 26; x += 2) B.set(x, 59, "#a97e14")
  // el rey, de cuerpo entero y orondo
  B.ell(20, 37, 11, 12, sh3(G3))
  B.rect(13, 44, 5, 5, "#a97e14"); B.rect(22, 44, 5, 5, "#a97e14")
  B.ell(20, 18, 7, 7.5, sh3(G3)); B.ell(20, 25, 8, 6, sh3(["#fff2c0", "#e8c860", "#b08a20"]))
  B.set(17, 17, "#7a5a10"); B.set(23, 17, "#7a5a10"); B.rect(18, 22, 5, 1, "#c89a30")
  // corona
  B.rect(14, 8, 13, 4, "#e8b83a"); for (const x of [14, 19, 24]) B.rect(x, 5, 3, 3, "#fbe39a"); B.set(20, 9, "#b3291d")
  // brazo alzado con el muslo
  B.line(29, 32, 34, 20, "#c89a30", 3); B.ell(34, 18, 2.5, 2.5, "#e8b83a")
  B.ell(35, 11, 3, 5, sh3(G3)); B.rect(35, 15, 1, 3, "#fff2c0")
  B.line(11, 32, 8, 42, "#a97e14", 3)
})

// ============================================================= Tormenta en la Costa
// El puerto con temporal: cielo de plomo, mar picado, el muelle de madera y las
// casas del pueblo a la izquierda. El barco amarrado lo mece el juego.
sprite("puerto", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  for (let y = 0; y < 96; y++) for (let x = 0; x < PW; x++) B.set(x, y, mix("#1c2230", "#4a5468", y / 96, 5))
  // nubarrones
  for (let i = 0; i < 9; i++) {
    const cx = h3(i, 1) * 170 - 5, cy = 50 + h3(i, 2) * 30, r = 14 + h3(i, 3) * 10
    B.ell(cx, cy, r * 1.5, r * 0.6, (x, y) => (y < cy - r * 0.2 ? "#5a6478" : "#3a4254"))
  }
  // mar en bandas con crestas
  for (let y = 96; y < PH; y++) for (let x = 0; x < PW; x++) {
    const band = (y - 96) / 80
    let col = mix("#2a4a5e", "#16303e", band, 4)
    const crest = Math.sin(x * 0.25 + y * 0.9) + Math.sin(x * 0.11 - y * 0.4)
    if (crest > 1.55) col = "#c8dce4"; else if (crest > 1.2) col = "#5a7e90"
    B.set(x, y, col)
  }
  // la costa y el pueblo, a la izquierda
  for (let y = 70; y < PH; y++) { const edge = 34 + (y - 70) * 0.3 + Math.sin(y * 0.3) * 2; for (let x = 0; x < edge; x++) B.set(x, y, y > 96 && x > edge - 4 ? "#3a3428" : "#4e4636") }
  for (const [hx, top] of [[0, 62], [14, 66]]) {
    B.rect(hx, top, 14, 18, (x) => (x === hx ? "#c8bca4" : "#a89c84")); B.tri(hx - 2, top, hx + 7, top - 9, hx + 16, top, "#7a2418")
    B.rect(hx + 5, top + 6, 3, 4, "#ffd060")
  }
  // el faro, con su luz apagada (la enciende el juego)
  B.rect(140, 40, 10, 56, (x, y) => (Math.floor(y / 8) % 2 ? "#e8e0d0" : "#b3291d")); B.rect(139, 34, 12, 6, "#3a3a40"); B.rect(141, 30, 8, 4, "#5a5a64")
  B.rect(134, 92, 22, 8, "#3a3428")
  // el muelle, de y = 128 a 136, con sus postes
  B.rect(56, 128, 104, 4, (x, y) => (y === 128 ? "#b07a44" : x % 8 === 7 ? "#3a2416" : "#8a5a30"))
  for (let px = 60; px < PW; px += 22) B.rect(px, 132, 4, 44, (x) => (x === px ? "#7a5232" : "#4a2c14"))
  B.rect(118, 120, 4, 8, "#5a3418"); B.ell(120, 120, 3, 1.5, "#7a4c26")
})
// El barco (con su vela recogida), de 44x40; el juego lo gira alrededor de (22, 36).
sprite("barco", { w: 44, h: 40, outline: "k" }, (c) => {
  const B = brush(c, 44, 40)
  // casco
  for (let y = 26; y < 38; y++) { const inset = (y - 26) * 0.7; for (let x = Math.round(2 + inset); x < Math.round(42 - inset * 0.6); x++) B.set(x, y, y === 26 ? "#c88a50" : y < 30 ? "#8a5a30" : (x + y) % 6 === 0 ? "#4a2c14" : "#6b4220") }
  B.rect(2, 29, 40, 1, "#b3291d")
  // mástil, verga y vela recogida
  B.rect(21, 2, 2, 24, "#5a3418"); B.rect(10, 7, 24, 2, "#7a4c26")
  B.ell(22, 10, 11, 2.2, sh3(["#f2ecd8", "#d8ccb0", "#a89c80"]))
  B.tri(23, 0, 23, 4, 30, 2, "#b3291d")
  // cuerdas
  B.line(22, 3, 3, 26, "#3a2a1a"); B.line(22, 3, 41, 26, "#3a2a1a")
  // ojos de buey
  for (const x of [10, 18, 26, 34]) B.set(x, 32, "#ffd060")
})

// ============================================================= Bandidos del Camino
// El camino del bosque al atardecer. La carreta entra por la izquierda y los
// bandidos salen de los matorrales (x = 26 y 128).
sprite("camino", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  for (let y = 0; y < 100; y++) for (let x = 0; x < PW; x++) B.set(x, y, mix("#3a2a5a", "#e88a4a", y / 100, 6))
  B.ell(110, 92, 12, 12, (x, y) => (y < 98 ? "#ffd890" : null))
  // colinas lejanas y bosque
  for (let x = 0; x < PW; x++) { const hy = 86 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.13) * 2; for (let y = Math.round(hy); y < 110; y++) B.set(x, y, "#4a3a5a") }
  for (let i = 0; i < 22; i++) { const tx = i * 8 - 4, ty = 98 + h3(i, 1) * 6; B.tri(tx - 6, ty + 12, tx, ty - 10 - h3(i, 2) * 6, tx + 6, ty + 12, "#2a3a34") }
  // prado y camino de tierra en perspectiva
  for (let y = 108; y < PH; y++) for (let x = 0; x < PW; x++) {
    const hw = 10 + (y - 108) * 0.9, d = Math.abs(x - 80)
    let col = h3(x >> 1, y, 3) > 0.6 ? "#4a6a2e" : "#3e5a26"
    if (d < hw) col = d > hw - 2 ? "#6a4e2e" : h3(x, y, 5) > 0.85 ? "#9a7a50" : (y + (x >> 3)) % 9 === 0 ? "#7a5e3a" : "#8a6c44"
    B.set(x, y, col)
  }
  // árboles grandes en los lados
  arbol(B, 8, 96, 14, ["#3e6a2a", "#2a4e20", "#1a3414"]); arbol(B, 150, 92, 16, ["#3e6a2a", "#2a4e20", "#1a3414"])
  // matorrales donde se esconden
  for (const [mx, my] of [[26, 130], [132, 128]]) {
    B.ell(mx, my, 16, 9, sh3(["#5a8a3a", "#3e6a2a", "#264a1e"])); B.ell(mx - 8, my + 3, 9, 6, sh3(["#5a8a3a", "#3e6a2a", "#264a1e"])); B.ell(mx + 9, my + 4, 9, 6, sh3(["#5a8a3a", "#3e6a2a", "#264a1e"]))
  }
  // mojón del camino
  B.rect(110, 142, 6, 10, (x) => (x === 110 ? "#c8c0b4" : "#8e877c")); B.ell(113, 142, 3, 2, "#c8c0b4")
})
// La carreta del mercader con sus sacos y el toldo; las ruedas van aparte.
sprite("carro", { w: 52, h: 34, outline: "k" }, (c) => {
  const B = brush(c, 52, 34)
  B.rect(4, 16, 44, 9, (x, y) => (y === 16 ? WOOD[0] : x % 9 === 8 ? WOOD[2] : WOOD[1]))
  B.rect(46, 20, 6, 2, WOOD[2])
  // toldo
  B.ell(24, 16, 20, 14, (x, y, dx, dy) => (y < 16 ? (x % 8 < 4 ? "#e8dcc0" : "#c8b890") : null))
  B.rect(4, 15, 40, 1, "#8a7454")
  // el mercader, asomado
  B.ell(42, 9, 4, 4.5, sh3(SKIN)); B.rect(38, 4, 8, 3, "#b3291d"); B.set(43, 9, "k")
  B.rect(39, 13, 7, 4, "#2e5aa8")
})
sprite("rueda", { w: 14, h: 14, outline: "k" }, (c) => {
  const B = brush(c, 14, 14)
  B.ell(7, 7, 6.5, 6.5, (x, y, dx, dy) => (dx * dx + dy * dy > 0.55 ? "#5a3418" : null))
  B.line(7, 1, 7, 13, "#7a4c26"); B.line(1, 7, 13, 7, "#7a4c26"); B.line(3, 3, 11, 11, "#7a4c26"); B.line(3, 11, 11, 3, "#7a4c26")
  B.ell(7, 7, 1.6, 1.6, "#3a3a40")
})
// El bandido: capucha, antifaz y garrote; dos fotogramas (garrote arriba y abajo).
function bandido(c, f) {
  const B = brush(c, 22, 34)
  B.rect(7, 29, 3, 5, "#3a2414"); B.rect(12, 29, 3, 5, "#3a2414")
  B.tri(3, 30, 11, 12, 19, 30, (x) => (x < 9 ? "#5a5a3a" : x > 14 ? "#3a3a24" : "#4a4a2e"))
  B.rect(5, 24, 12, 2, "#6b4220")
  B.ell(11, 9, 5, 5.5, sh3(SKIN))
  B.ell(11, 7, 6, 6, (x, y) => (y < 7 || x < 6 || x > 16 ? (x < 9 ? "#5a5a3a" : "#3a3a24") : null))
  B.rect(6, 8, 10, 2, "#1a1410"); B.set(8, 8, "#f2ecd8"); B.set(13, 8, "#f2ecd8")
  B.rect(9, 12, 4, 1, "#5a3020")
  // garrote
  if (f) { B.line(17, 18, 20, 4, WOOD[1], 2); B.ell(20, 3, 2.5, 3, sh3(WOOD)) }
  else { B.line(17, 18, 21, 12, WOOD[1], 2); B.ell(21, 10, 2.5, 3, sh3(WOOD)) }
  B.ell(17, 18, 1.8, 1.8, SKIN[1])
}
anim("bandido", { w: 22, h: 34, fps: 4, outline: "k" }, frame((c) => bandido(c, 0)), frame((c) => bandido(c, 1)))

// ============================================================= Torneo Real
// La liza: gradas con gallardetes, la valla del centro y la hierba. Los
// caballeros cargan por y = 128 (pies) a lo largo de la valla.
sprite("liza", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  for (let y = 0; y < 70; y++) for (let x = 0; x < PW; x++) B.set(x, y, mix("#6aaee8", "#cfe8f6", y / 70, 4))
  B.ell(30, 20, 10, 3, "#ffffff"); B.ell(120, 30, 14, 3, "#ffffff")
  // gradas de madera, con el palco real en medio
  for (let y = 58; y < 104; y++) for (let x = 0; x < PW; x++) {
    const step = Math.floor((y - 58) / 9)
    B.set(x, y, (y - 58) % 9 === 0 ? "#b07a44" : (y - 58) % 9 === 8 ? "#3a2416" : step % 2 ? "#7a4c26" : "#8a5a30")
  }
  B.rect(60, 44, 40, 20, "#5b2a86"); B.tri(56, 44, 80, 30, 104, 44, "#7a46b0"); B.rect(60, 60, 40, 4, "#e8b83a")
  for (let x = 62; x < 100; x += 6) B.rect(x, 44, 3, 4, "#e8b83a")
  B.rect(79, 24, 1, 8, "#3a3a40"); B.tri(80, 24, 80, 28, 86, 26, "#b3291d")
  // gallardetes en las gradas
  const flags = ["#b3291d", "#2e5aa8", "#e8b83a", "#246b2a", "#a23c9e"]
  for (let i = 0; i < 8; i++) { const fx = 6 + i * 20 + (i > 3 ? 12 : 0) - (i < 4 ? 0 : 0); if (fx > 52 && fx < 106) continue; B.rect(fx, 40, 1, 18, "#3a2414"); B.tri(fx + 1, 40, fx + 1, 46, fx + 9, 43, flags[i % 5]) }
  // hierba y arena de la liza
  for (let y = 104; y < PH; y++) for (let x = 0; x < PW; x++) {
    let col = y < 112 ? "#5a8a3a" : h3(x >> 1, y >> 1, 4) > 0.5 ? "#c8a870" : "#bc9c64"
    if (y >= 112 && h3(x, y, 6) > 0.92) col = "#a88a50"
    B.set(x, y, col)
  }
  // la valla del centro (detrás de los caballeros, a la altura del pecho del caballo)
  B.rect(0, 112, PW, 3, (x, y) => (y === 112 ? "#f2ecd8" : "#c8bca4"))
  for (let x = 4; x < PW; x += 16) B.rect(x, 112, 3, 12, (xx) => (xx === x ? "#f2ecd8" : "#a89c84"))
  for (let x = 0; x < PW; x += 8) B.rect(x, 113, 4, 1, "#b3291d")
})
// El caballero a caballo, mirando a la derecha, con lanza; con o sin yelmo.
function caballero(c, cols, yelmo) {
  const B = brush(c, 62, 44)
  const horse = ["#b07c50", "#8a5a34", "#5a3820"]
  // patas al galope, con cascos oscuros
  B.line(14, 32, 10, 42, horse[2], 2); B.line(20, 32, 24, 42, horse[1], 2); B.line(34, 32, 30, 42, horse[2], 2); B.line(40, 32, 46, 41, horse[1], 2)
  for (const [hx, hy] of [[10, 42], [24, 42], [30, 42], [46, 41]]) B.rect(hx - 1, hy, 3, 2, "#2a1a10")
  // cuerpo, cuello y cabeza del caballo, con crin y orejas
  B.ell(27, 28, 15, 7, sh3(horse))
  B.tri(36, 30, 42, 14, 46, 26, horse[1]); B.tri(36, 30, 46, 26, 44, 31, horse[1])
  B.ell(47, 18, 4, 4.5, sh3(horse)); B.ell(51, 22, 3.5, 2.6, sh3(horse)); B.set(53, 22, "#2a1a10")
  B.set(47, 16, "k"); B.tri(43, 13, 45, 9, 46, 14, horse[2])
  B.line(41, 15, 37, 26, "#2a1a10", 2)
  B.line(12, 25, 5, 33, "#2a1a10", 2)
  // gualdrapa con el color
  B.rect(14, 24, 26, 10, (x, y) => (y > 31 ? cols[2] : (x + y) % 6 === 0 ? cols[2] : cols[0]))
  for (let x = 14; x < 40; x += 4) B.tri(x, 34, x + 4, 34, x + 2, 37, cols[1])
  // jinete
  B.rect(22, 10, 9, 14, (x) => (x < 25 ? cols[0] : cols[1])); B.rect(24, 22, 4, 6, STEEL[2])
  if (yelmo) { B.ell(26.5, 7, 4.5, 5, sh3(STEEL)); B.rect(27, 6, 4, 1, "#1a1410"); B.tri(23, 2, 26, -2, 28, 2, cols[0]) }
  else { B.ell(26.5, 7, 4, 4.5, sh3(SKIN)); B.rect(23, 3, 7, 2, "#6b4220"); B.set(29, 7, "k"); B.ell(29, 10, 1.5, 1, "#7a2a20") }
  // escudo y lanza
  B.ell(22, 17, 3.5, 5, sh3(cols))
  B.line(30, 16, 61, 12, "#e8dcc0", 2); B.rect(30, 14, 4, 5, STEEL[1])
}
sprite("caballero_rojo", { w: 62, h: 44, outline: "k" }, (c) => caballero(c, ["#d04a3a", "#b3291d", "#7a1c13"], true))
sprite("caballero_azul", { w: 62, h: 44, outline: "k" }, (c) => caballero(c, ["#4a7ac8", "#2e5aa8", "#1c3a70"], true))
sprite("caballero_azul_sin_yelmo", { w: 62, h: 44, outline: "k" }, (c) => caballero(c, ["#4a7ac8", "#2e5aa8", "#1c3a70"], false))
sprite("yelmo", { w: 12, h: 13, outline: "k" }, (c) => {
  const B = brush(c, 12, 13)
  B.ell(6, 7, 4.5, 5, sh3(STEEL)); B.rect(6, 6, 4, 1, "#1a1410"); B.tri(2, 3, 5, -1, 7, 3, "#4a7ac8")
})

// ============================================================= La Paz del Rey
// Un prado con dos castillos lejanos: los soldados de dos casas bajan las lanzas.
sprite("prado", { w: PW, h: PH }, (c) => {
  const B = brush(c, PW, PH)
  for (let y = 0; y < 100; y++) for (let x = 0; x < PW; x++) B.set(x, y, mix("#7ec0f0", "#e0f0fa", y / 100, 5))
  B.ell(124, 28, 9, 9, sh3(["#fff6d0", "#ffe9a8", "#f2c860"]))
  B.ell(30, 58, 14, 3, "#ffffff"); B.ell(40, 56, 8, 3, "#ffffff"); B.ell(100, 64, 12, 2.5, "#ffffff")
  // colinas con castillos
  for (let x = 0; x < PW; x++) { const hy = 92 - Math.max(0, 14 - Math.abs(x - 24) * 0.5) - Math.max(0, 16 - Math.abs(x - 136) * 0.45); for (let y = Math.round(hy); y < 112; y++) B.set(x, y, y < hy + 2 ? "#8ab060" : "#6a9a48") }
  castillito(B, 14, 70, "#b3291d"); castillito(B, 126, 68, "#2e5aa8")
  // prado con flores
  for (let y = 108; y < PH; y++) for (let x = 0; x < PW; x++) {
    let col = mix("#6a9a48", "#4a7a30", (y - 108) / 68, 3)
    if (h3(x >> 1, y >> 1, 3) > 0.7) col = mix(col, "#2e5a1e", 0.25)
    const f = h3(x, y, 11); if (f > 0.985) col = "#f2ecd8"; else if (f > 0.975) col = "#e2585e"; else if (f > 0.968) col = "#fbe39a"
    B.set(x, y, col)
  }
  arbol(B, 70, 104, 9)
})
// El soldado: lanza en alto o lanza en el suelo con una flor en la mano.
function soldado(c, cols, paz) {
  const B = brush(c, 26, 44)
  B.rect(8, 38, 4, 6, "#3a2414"); B.rect(14, 38, 4, 6, "#3a2414")
  B.rect(7, 18, 12, 21, (x, y) => (y > 34 ? cols[2] : x < 10 ? cols[0] : x > 15 ? cols[2] : cols[1]))
  B.rect(7, 29, 12, 2, "#6b4220")
  B.ell(13, 11, 5, 5.5, sh3(SKIN)); B.set(15, 10, "k"); B.rect(13, 14, 3, 1, paz ? "#c0505a" : "#7a2a20")
  B.ell(13, 7, 6, 3.5, (x, y) => (y < 8 ? (x < 11 ? STEEL[0] : STEEL[1]) : null)); B.rect(6, 8, 14, 1, STEEL[2])
  if (paz) {
    B.line(2, 43, 25, 42, WOOD[1], 1); B.tri(22, 40, 25, 42, 22, 44, STEEL[1])
    B.line(19, 22, 22, 18, cols[1], 2); B.ell(22, 17, 1.6, 1.6, SKIN[1])
    B.rect(22, 11, 1, 6, "#3e6a2a"); B.ell(22, 10, 2.2, 2.2, "#e2585e"); B.set(22, 10, "#fbe39a")
  } else {
    B.rect(21, 0, 1, 40, WOOD[1]); B.tri(19.5, 4, 21.5, -2, 23.5, 4, STEEL[0]); B.ell(20, 24, 1.8, 1.8, SKIN[1])
    B.ell(6, 26, 4, 6, sh3(cols)); B.set(6, 26, "#e8b83a")
  }
}
anim("soldado_rojo", { w: 26, h: 44, fps: 1, outline: "k" }, frame((c) => soldado(c, ["#d04a3a", "#b3291d", "#7a1c13"], false)), frame((c) => soldado(c, ["#d04a3a", "#b3291d", "#7a1c13"], true)))
anim("soldado_azul", { w: 26, h: 44, fps: 1, outline: "k" }, frame((c) => soldado(c, ["#4a7ac8", "#2e5aa8", "#1c3a70"], false)), frame((c) => soldado(c, ["#4a7ac8", "#2e5aa8", "#1c3a70"], true)))
// La paloma con su ramita de olivo, dos aleteos.
function paloma(c, f) {
  const B = brush(c, 18, 12)
  B.ell(8, 7, 5, 3, sh3(["#ffffff", "#e4e8ee", "#a8b0bc"])); B.ell(13, 5, 2.5, 2.2, sh3(["#ffffff", "#e4e8ee", "#a8b0bc"]))
  B.set(14, 4, "k"); B.rect(15, 5, 2, 1, "#e8a040"); B.rect(16, 6, 2, 1, "#3e6a2a"); B.set(17, 7, "#6a9a3a")
  B.tri(2, 6, 4, 8, 0, 9, "#e4e8ee")
  if (f) B.tri(5, 6, 10, 6, 7, 0, "#e4e8ee"); else B.tri(5, 7, 10, 7, 6, 11, "#c8d0dc")
}
anim("paloma", { w: 18, h: 12, fps: 6, outline: "k" }, frame((c) => paloma(c, 0)), frame((c) => paloma(c, 1)))

// ============================================================= Carnaval
// El cabezudo del rey Aldric (la cabeza enorme y el cuerpo de tela) y la careta
// que el juego pone a los aldeanos.
sprite("cabezudo", { w: 44, h: 74, outline: "k" }, (c) => {
  const B = brush(c, 44, 74)
  // cuerpo de tela a rayas
  B.tri(6, 72, 22, 34, 38, 72, (x) => (Math.floor(x / 4) % 2 ? "#e8b83a" : "#5b2a86"))
  B.rect(15, 70, 5, 4, "#3a2414"); B.rect(24, 70, 5, 4, "#3a2414")
  // la cabeza enorme
  B.ell(22, 21, 18, 18, sh3(["#ffe0c0", "#f2b890", "#c4855a"]))
  B.ell(22, 32, 15, 9, sh3(["#ffffff", "#e2dccd", "#b8b0a0"]))
  B.ell(15, 17, 4, 4, "#ffffff"); B.ell(29, 17, 4, 4, "#ffffff"); B.ell(16, 18, 2, 2, "k"); B.ell(30, 18, 2, 2, "k")
  B.rect(10, 11, 9, 2, "#ffffff"); B.rect(25, 11, 9, 2, "#ffffff")
  B.ell(22, 23, 3.5, 3, sh3(["#f6b496", "#e0866a", "#b45c44"])); B.ell(11, 24, 3, 2, "#ea9a80"); B.ell(33, 24, 3, 2, "#ea9a80")
  B.ell(22, 30, 5, 3, "#5a1610"); B.rect(18, 28, 9, 1, "#ffffff")
  // corona torcida
  B.rect(8, 2, 28, 5, "#e8b83a"); for (const x of [8, 16, 24, 32]) B.tri(x, 2, x + 2, -4, x + 4, 2, "#fbe39a"); B.ell(22, 4, 1.8, 1.8, "#b3291d")
})
sprite("careta", { w: 10, h: 4 }, (c) => {
  const B = brush(c, 10, 4)
  B.rect(0, 0, 10, 3, "#b3291d"); B.rect(0, 0, 10, 1, "#e2585e"); B.set(3, 1, "#1a1410"); B.set(6, 1, "#1a1410"); B.set(0, 3, "#e8b83a"); B.set(9, 3, "#e8b83a")
})
