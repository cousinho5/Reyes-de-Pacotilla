// El rey Aldric y su fantasma (bloque 13), de cintura para arriba en 52x60.
// Parte del rey de la maqueta (../engine.js, kingLay y ghostLay) con más
// fotogramas: contento, alza el muslo, muerde, mastica (dos), tose (dos), se
// ahoga y se ahoga sin corona. La caída tras la mesa la hace el juego girando
// el último dibujo. El fantasma es el mismo rey en colores de niebla y con cola.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/aldric.px.js --out <carpeta>
pal({
  k: "#1a1410",                                       // tinta
  f: "#f8d4b0", F: "#ebb48a", n: "#c4855a",           // piel
  z: "#d2e6a8", Z: "#adc888", x: "#7f9a64",           // piel ahogándose
  r: "#d84a3a", R: "#b3291d", q: "#7a1c13", Q: "#9a2418", // túnica
  y: "#fbe39a", Y: "#e8b83a", o: "#a97e14",           // oro
  w: "#ffffff", W: "#ece6da", v: "#bfb6a4", V: "#d0c8b6", // barba y pelo
  u: "#e2dccd", U: "#cfc7b6", t: "#e8e2d6",
  e: "#efe9dc", E: "#f4f0e6", D: "#d8d2c4",           // armiño
  m: "#5a1610", M: "#c0505a", a: "#7a2a20", A: "#3a0d08", // boca
  c: "#ea9a80", C: "#9fb880",                         // mejillas
  p: "#f6b496", P: "#e0866a", s: "#b45c44",           // nariz
  h: "#c9dca8", H: "#9cb47e", j: "#748c58",           // nariz ahogándose
  b: "#2e5aa8", B: "#5b84d0", g: "#2f8a3e", G: "#55b964", l: "#c0392b", L: "#e8604c", i: "#a8321f", I: "#fff7d0", // joyas
  d: "#e0974f", "1": "#b0642c", "2": "#7a4219", "3": "#f2b56e", "4": "#f2e6cc", // muslo de pollo
  "5": "#a8d8f0", "6": "#7fc0e8",                     // sudor
  // fantasma: niebla de cinco tonos y su contorno
  "7": "#f4fcff", "8": "#d4ecf7", "9": "#a6cde2", "0": "#7fb0cc", N: "#5e92b2", K: "#3d6e8e",
})

const W = 52, H = 60, O = 6
/** Altura de la corona sobre la cabeza (la banda acaba en la fila 16, donde empieza la frente). */
const CORONA_Y = 5
const SKIN = ["f", "F", "n"], CHOKE = ["z", "Z", "x"], ROBE = ["r", "R", "q"], GOLD = ["y", "Y", "o"], BEARD = ["w", "W", "v"]

// Pincel con las formas de la maqueta (redondea como ella), sobre el lienzo de pxl.
function brush(c, w = W, h = H) {
  const B = {
    set(x, y, k) { x = Math.round(x); y = Math.round(y); if (k && x >= 0 && y >= 0 && x < w && y < h) c.px(x, y, k) },
    rect(x0, y0, rw, rh, k) { for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) B.set(x, y, typeof k === "function" ? k(x, y) : k) },
    ell(cx, cy, rx, ry, k) {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) B.set(x, y, typeof k === "function" ? k(x, y, dx, dy) : k)
      }
    },
    line(x0, y0, x1, y1, k, r = 0) {
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (r) B.ell(x, y, r, r, k); else B.set(x, y, k) }
    },
  }
  return B
}
// Sombreado esférico: luz arriba a la izquierda.
const sh3 = (cols) => (x, y, dx, dy) => { const l = dx + dy; return l < -0.75 ? cols[0] : l > 0.6 ? cols[2] : cols[1] }

// ------------------------------------------------------------- corona y muslo
function corona(c, ox, oy) {
  const B = brush(c)
  B.rect(ox + 2, oy + 7, 20, 5, (x, y) => (y === oy + 7 ? "y" : x > ox + 17 ? "o" : y === oy + 11 ? "o" : "Y"))
  for (const [px, top] of [[2, 3], [7, 4], [12, 0], [17, 4], [21, 3]]) {
    for (let y = top + 1; y < 7; y++) { const hw = Math.floor((y - top) / 2.2); for (let x = px - hw; x <= px + hw; x++) B.set(ox + x, oy + y, x < px ? "y" : "Y") }
    B.ell(ox + px + 0.5, oy + top + 0.5, 1.2, 1.2, "y")
  }
  for (const [x, y, k] of [[6, 9, "b"], [7, 9, "B"], [11, 9, "l"], [12, 9, "L"], [12, 10, "i"], [16, 9, "g"], [17, 9, "G"], [4, 8, "I"], [9, 8, "I"]]) B.set(ox + x, oy + y, k)
}
sprite("corona", { w: 24, h: 13, outline: "k" }, (c) => corona(c, 0, 0))

// Muslo de pollo asado; `bocado` le quita un mordisco.
function muslo(c, ox, oy, bocado) {
  const B = brush(c)
  B.ell(ox + 5, oy + 9.5, 4, 5, (x, y, dx, dy) => (bocado && ((x === ox + 8 && (y === oy + 8 || y === oy + 9)) || (x === ox + 7 && y === oy + 8)) ? null : sh3(["d", "1", "2"])(x, y, dx, dy)))
  B.set(ox + 3, oy + 7, "3"); B.set(ox + 4, oy + 7, "3")
  B.rect(ox + 5, oy + 1, 2, 4, "4"); for (const [x, y] of [[4, 0], [7, 0], [4, 1], [7, 1]]) B.set(ox + x, oy + y, "4")
}
sprite("muslo", { w: 11, h: 15, outline: "k" }, (c) => muslo(c, 0, 0, true))

// ------------------------------------------------------------- el rey
// o: { arm: "up" | "bite" | "throat" | "hold", mouth: "chew" | "full" | "o" | "cough", look: "left", happy, choke, crown, dx }
function rey(c, o = {}) {
  const B = brush(c), sk = o.choke ? CHOKE : SKIN, X = o.dx ?? 0
  const set = (x, y, k) => B.set(x + X, y, k)
  const rect = (x0, y0, rw, rh, k) => B.rect(x0 + X, y0, rw, rh, typeof k === "function" ? (x, y) => k(x - X, y) : k)
  const ell = (cx, cy, rx, ry, k) => B.ell(cx + X, cy, rx, ry, typeof k === "function" ? (x, y, dx, dy) => k(x - X, y, dx, dy) : k)
  const line = (x0, y0, x1, y1, k, r) => B.line(x0 + X, y0, x1 + X, y1, k, r)
  // túnica, cinturón y armiño
  for (let y = 33 + O; y < 60; y++) { const hw = 12 + (y - 33 - O) * 0.45; for (let x = Math.round(26 - hw); x < Math.round(26 + hw); x++) { const t = (x - (26 - hw)) / (2 * hw); set(x, y, t < 0.16 ? "r" : t > 0.8 ? "q" : (x % 6 === 0 && y > 42 + O) ? "Q" : "R") } }
  rect(13, 46 + O, 26, 3, (x, y) => (y === 46 + O ? "y" : x % 5 === 0 ? "o" : "Y"))
  rect(23, 45 + O, 6, 5, (x, y) => (x === 23 || y === 45 + O ? "y" : "Y")); rect(25, 47 + O, 2, 1, "i")
  const armino = (x, y) => (((x * 3 + y * 5) % 11 === 0) ? "k" : x === 23 ? "w" : "e")
  rect(23, 34 + O, 6, 11, armino); rect(23, 49 + O, 6, 11, armino)
  for (let y = 30 + O; y < 36 + O; y++) { const hw = 16 - (y - 30 - O) * 0.4; for (let x = Math.round(26 - hw); x < Math.round(26 + hw); x++) set(x, y, (((x * 7 + y * 3) % 9 === 0) && y > 30 + O) ? "k" : y === 30 + O ? "w" : (x > 34 ? "D" : "E")) }
  // brazo izquierdo (el de la derecha del dibujo va después, encima de la barba)
  if (o.arm === "throat") { line(12, 40 + O, 19, 31 + O, "R", 2.6); line(40, 40 + O, 33, 31 + O, "q", 2.6) }
  else if (o.arm === "hold") { line(12, 38 + O, 8, 14 + O, "R", 2.6); line(40, 38 + O, 44, 14 + O, "q", 2.6); rect(5, 18 + O, 7, 2, "E"); rect(41, 18 + O, 7, 2, "E") }
  else line(12, 38 + O, 11, 52 + O, "R", 2.8)
  // pelo de los lados, orejas y cabeza
  ell(16, 15 + O, 3.4, 5, sh3(BEARD)); ell(36, 15 + O, 3.4, 5, sh3(BEARD))
  ell(16.5, 19 + O, 2, 2.8, sh3(sk)); ell(35.5, 19 + O, 2, 2.8, sh3(sk))
  ell(26, 18 + O, 9.5, 10, sh3(sk))
  // barba, solo por debajo de la boca
  ell(26, 29 + O, 12, 10, (x, y, dx, dy) => (y < 22 + O ? null : ((x + y) % 4 === 0 && y > 27 + O) ? "V" : sh3(BEARD)(x, y, dx, dy)))
  ell(26, 37 + O, 6, 3.5, sh3(BEARD))
  // bigote
  for (let x = 17; x <= 35; x++) { const yy = 21 + O + (Math.abs(x - 26) > 6 ? -1 : 0) + (Math.abs(x - 26) > 8 ? -1 : 0); set(x, yy, x < 26 ? "w" : "u"); set(x, yy + 1, x < 26 ? "W" : "U") }
  // boca
  if (o.mouth === "chew") { rect(23, 24 + O, 6, 3, "m"); rect(24, 26 + O, 4, 1, "M"); rect(24, 24 + O, 4, 1, "w") }
  else if (o.mouth === "full") { rect(23, 24 + O, 6, 1, "a"); ell(31.5, 23.5 + O, 2.4, 2, sh3(sk)) }   // carrillo lleno
  else if (o.mouth === "o") { ell(26, 26 + O, 3.2, 3.4, "A"); rect(25, 27 + O, 3, 2, "M") }
  else if (o.mouth === "cough") { ell(26, 25.5 + O, 4, 2.2, "A"); rect(24, 24 + O, 5, 1, "w") }
  else rect(23, 24 + O, 6, 1, "a")
  // mejillas y nariz
  ell(20, 21 + O, 1.8, 1.1, o.choke ? "C" : "c"); ell(32, 21 + O, 1.8, 1.1, o.choke ? "C" : "c")
  ell(26.5, 19.5 + O, 2.7, 2.4, sh3(o.choke ? ["h", "H", "j"] : ["p", "P", "s"]))
  // ojos y cejas
  if (o.choke) {
    ell(21, 15.5 + O, 2.6, 2.6, "w"); ell(31, 15.5 + O, 2.6, 2.6, "w"); set(21, 15 + O, "k"); set(31, 15 + O, "k")
    rect(18, 11 + O, 5, 1, "t"); rect(29, 11 + O, 5, 1, "t")
  } else if (o.mouth === "cough") {
    // ojos apretados al toser
    rect(19, 16 + O, 4, 1, "k"); rect(29, 16 + O, 4, 1, "k"); set(19, 15 + O, "k"); set(32, 15 + O, "k")
    rect(18, 13 + O, 6, 1, "w"); rect(28, 13 + O, 6, 1, "w")
  } else {
    rect(19, 15 + O, 4, 2, "w"); rect(29, 15 + O, 4, 2, "w")
    const lx = o.look === "left" ? 0 : 2; rect(19 + lx, 15 + O, 2, 2, "k"); rect(29 + lx, 15 + O, 2, 2, "k")
    rect(18, 13 + O, 6, 1, "w"); rect(28, 13 + O, 6, 1, "w"); set(18, 12 + O, "W"); set(33, 12 + O, "W")
    if (o.happy) { rect(19, 16 + O, 4, 1, sk[1]); rect(29, 16 + O, 4, 1, sk[1]) }
  }
  // brazo derecho
  if (o.arm === "up") { line(38, 39 + O, 43, 27 + O, "q", 2.6); rect(40, 29 + O, 7, 2, "E"); ell(44, 24 + O, 2.6, 2.6, sh3(sk)); muslo(c, 39 + X, 7 + O, false) }
  else if (o.arm === "bite") { line(38, 39 + O, 37, 29 + O, "q", 2.6); ell(36, 26 + O, 2.6, 2.6, sh3(sk)); muslo(c, 28 + X, 14 + O, false) }
  else if (o.arm === "chew") { line(38, 39 + O, 41, 31 + O, "q", 2.6); ell(42, 28 + O, 2.6, 2.6, sh3(sk)); muslo(c, 37 + X, 11 + O, true) }
  else if (o.arm === "throat") { ell(20.5, 31 + O, 3, 2.4, sh3(sk)); ell(31.5, 31 + O, 3, 2.4, sh3(sk)) }
  else if (o.arm === "hold") { ell(8, 12 + O, 2.6, 2.6, sh3(sk)); ell(44, 12 + O, 2.6, 2.6, sh3(sk)) }
  else line(40, 38 + O, 42, 52 + O, "q", 2.8)
  // La corona se apoya en la coronilla: la banda tapa el borde de arriba de la cabeza.
  if (o.crown !== false && o.arm !== "hold") corona(c, 14 + X + (o.crownDx ?? 0), CORONA_Y + (o.crownDy ?? 0))
  if (o.choke) { set(12, 10 + O, "5"); set(12, 11 + O, "6"); set(40, 8 + O, "5"); set(40, 9 + O, "6") }
}

const REY = { w: W, h: H, outline: "k" }
sprite("rey_contento", REY, (c) => rey(c, { look: "left", happy: 1 }))
sprite("rey_alza", REY, (c) => rey(c, { arm: "up", look: "left", happy: 1 }))
sprite("rey_muerde", REY, (c) => rey(c, { arm: "bite", mouth: "chew" }))
sprite("rey_mastica_a", REY, (c) => rey(c, { arm: "chew", mouth: "full", look: "left", happy: 1 }))
sprite("rey_mastica_b", REY, (c) => rey(c, { arm: "chew", mouth: "chew", look: "left", happy: 1, crownDy: 1 }))
sprite("rey_tose_a", REY, (c) => rey(c, { arm: "throat", mouth: "cough", dx: -1, crownDy: 1 }))
sprite("rey_tose_b", REY, (c) => rey(c, { arm: "throat", mouth: "cough", dx: 1, crownDx: 1 }))
sprite("rey_ahoga", REY, (c) => rey(c, { choke: 1, arm: "throat", mouth: "o" }))
sprite("rey_ahoga_sin_corona", REY, (c) => rey(c, { choke: 1, arm: "throat", mouth: "o", crown: false }))

// ------------------------------------------------------------- el fantasma
// El mismo rey en niebla: cada color pasa al tono de su luz, y abajo una cola que ondea.
const NIEBLA = (() => {
  const hex = { f: "#f8d4b0", F: "#ebb48a", n: "#c4855a", z: "#d2e6a8", Z: "#adc888", x: "#7f9a64", r: "#d84a3a", R: "#b3291d", q: "#7a1c13", Q: "#9a2418", y: "#fbe39a", Y: "#e8b83a", o: "#a97e14", w: "#ffffff", W: "#ece6da", v: "#bfb6a4", V: "#d0c8b6", u: "#e2dccd", U: "#cfc7b6", t: "#e8e2d6", e: "#efe9dc", E: "#f4f0e6", D: "#d8d2c4", m: "#5a1610", M: "#c0505a", a: "#7a2a20", A: "#3a0d08", c: "#ea9a80", C: "#9fb880", p: "#f6b496", P: "#e0866a", s: "#b45c44", h: "#c9dca8", H: "#9cb47e", j: "#748c58", b: "#2e5aa8", B: "#5b84d0", g: "#2f8a3e", G: "#55b964", l: "#c0392b", L: "#e8604c", i: "#a8321f", I: "#fff7d0", d: "#e0974f", "1": "#b0642c", "2": "#7a4219", "3": "#f2b56e", "4": "#f2e6cc", "5": "#a8d8f0", "6": "#7fc0e8" }
  const out = { k: "K" }
  for (const [key, h] of Object.entries(hex)) {
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255
    out[key] = lum > 0.82 ? "7" : lum > 0.62 ? "8" : lum > 0.42 ? "9" : lum > 0.25 ? "0" : "N"
  }
  return out
})()
function cola(c, ph) {
  const B = brush(c, W, 76)
  for (let y = 56; y < 76; y++) {
    const hw = 16 - (y - 56) * 0.75 + Math.sin(y * 0.7 + ph * Math.PI * 2) * 1.5
    for (let x = Math.round(26 - hw); x < Math.round(26 + hw); x++) if (!(y > 66 && (x + y + Math.round(ph * 4)) % 5 === 0)) B.set(x, y, "R")
  }
}
const FANTASMA = { w: W, h: 76, outline: "k", swap: NIEBLA }
sprite("fantasma_corona", FANTASMA, (c) => cola(c, 0), (c) => rey(c, { arm: "hold", mouth: "o", happy: 1, crown: false }))
sprite("fantasma_muslo", FANTASMA, (c) => cola(c, 0), (c) => rey(c, { arm: "up", mouth: "chew", crown: false }))
sprite("fantasma_opina", FANTASMA, (c) => cola(c, 0.5), (c) => rey(c, { mouth: "o", look: "left", crown: false }))

// ------------------------------------------------------------- para revisar
// Lo que hace el rey en el banquete, en orden, y el fantasma flotando.
anim("rey_banquete", { w: W, h: H },
  frame({ ms: 900 }, stamp("rey_contento", 0, 0)),
  frame({ ms: 700 }, stamp("rey_alza", 0, 0)),
  frame({ ms: 450 }, stamp("rey_muerde", 0, 0)),
  frame({ ms: 260 }, stamp("rey_mastica_a", 0, 0)), frame({ ms: 260 }, stamp("rey_mastica_b", 0, 0)),
  frame({ ms: 260 }, stamp("rey_mastica_a", 0, 0)), frame({ ms: 260 }, stamp("rey_mastica_b", 0, 0)),
  frame({ ms: 400 }, stamp("rey_contento", 0, 0)),
  frame({ ms: 150 }, stamp("rey_tose_a", 0, 0)), frame({ ms: 150 }, stamp("rey_tose_b", 0, 0)),
  frame({ ms: 150 }, stamp("rey_tose_a", 0, 0)), frame({ ms: 150 }, stamp("rey_tose_b", 0, 0)),
  frame({ ms: 700 }, stamp("rey_ahoga", 0, 0)),
  frame({ ms: 900 }, stamp("rey_ahoga_sin_corona", 0, 0)))
anim("fantasma_flota", { w: W, h: 80 },
  frame({ ms: 250 }, stamp("fantasma_opina", 0, 2)), frame({ ms: 250 }, stamp("fantasma_opina", 0, 1)),
  frame({ ms: 250 }, stamp("fantasma_opina", 0, 0)), frame({ ms: 250 }, stamp("fantasma_opina", 0, 1)),
  frame({ ms: 500 }, stamp("fantasma_corona", 0, 2)), frame({ ms: 500 }, stamp("fantasma_muslo", 0, 1)))
