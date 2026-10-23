// Fray Abundio nuevo (bloque 3, paso 8): 48x48, de medio cuerpo tras su pupitre.
// Monje mayor con tonsura despeinada, gafas de culo de botella, nariz de buen
// vino, pluma larguísima, tintero y pergamino. Cinco caras (las de siempre) y
// cinco animaciones cortas: parpadea, habla, moja la pluma, cabecea dormido y
// hace sonar las monedas.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque3/pxl/fray.px.js --out <carpeta>
pal({
  k: "#21160f",                                   // contorno
  O: "#ffffff", s: "#efc39a", S: "#d29a6e", Z: "#a96f4c", // piel (brillo, luz, media, sombra)
  p: "#e98a7a", n: "#d46a5c",                     // mejillas y nariz
  h: "#f1ede4", H: "#a9a398",                     // pelo blanco
  g: "#2b2a30", w: "#cfe6f2", e: "#1a1a1a",       // gafas, cristal, pupila
  M: "#6e2219", m: "#c75b4c",                     // boca
  o: "#87613a", r: "#6b4a2b", R: "#4a3119", q: "#3b2614", // hábito y escapulario
  y: "#cfa65a",                                   // cordón
  f: "#fbfaf5", F: "#c4beb1",                     // pluma
  t: "#a87444", d: "#8a5a32", D: "#5e3a1e",       // pupitre
  c: "#efe2bf", C: "#d4c094", i: "#3a2c5a",       // pergamino y tinta
  Y: "#f3c94a", W: "#b8862a",                     // monedas
  b: "#73b8ec",                                   // gota de sudor
  v: "#6fa64e", V: "#3e6e2e",                     // hojas de la capitular
})
ramps("kqRro", "ZSsO", "Hh", "Ddt", "Cc", "WY", "Vv")

const CX = 24

// El cuerpo: hábito con capucha caída, escapulario, mangas anchas y una cruz
// de madera. Se dibuja entero; el pupitre lo tapa después de cintura para abajo.
function cuerpo(c, dy) {
  // Capucha caída por detrás de los hombros (asoma alrededor del cuello).
  c.ellipse(CX - 0.5, 28 + dy, 13, 5, "R")
  c.ellipse(CX - 0.5, 27 + dy, 11, 3.5, "o")
  // Tronco: se ensancha hacia abajo; luz por la izquierda.
  for (let y = 29 + dy; y < 46; y++) {
    const half = 11 + (y - 29 - dy) * 0.6
    for (let x = Math.floor(CX - half); x <= Math.ceil(CX + half - 1); x++) {
      const dx = (x + 0.5 - CX) / half
      c.px(x, y, dx < -0.7 ? "o" : dx > 0.55 ? "R" : "r")
    }
  }
  // Cuello de la capucha, enrollado.
  for (let x = CX - 7; x < CX + 7; x++) { c.px(x, 28 + dy, Math.abs(x + 0.5 - CX) > 4 ? "o" : "R"); c.px(x, 29 + dy, "R") }
  c.hline(CX - 6, 28 + dy, 3, "q")
  // Escapulario: la tira de tela de delante, más oscura, con su borde.
  c.rect(CX - 4, 30 + dy, 8, 16, "q")
  c.vline(CX - 5, 30 + dy, 16, "R"); c.vline(CX + 4, 30 + dy, 16, "R")
  for (let y = 32 + dy; y < 46; y += 3) c.px(CX - 3, y, "R")
  // Cruz de madera colgada del cuello.
  c.vline(CX - 0, 31 + dy, 2, "y")
  c.vline(CX - 1, 33 + dy, 5, "t"); c.vline(CX, 33 + dy, 5, "d"); c.hline(CX - 3, 34 + dy, 6, "t"); c.hline(CX - 3, 35 + dy, 6, "d")
}
// Una manga ancha del hombro (x0, y0) al puño (x1, y1), por delante del pupitre:
// así se ve que el fraile apoya los brazos en el tablero.
function manga(c, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n
    c.ellipse(x, y, 3.2, 2.6, "q")
  }
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n
    c.ellipse(x, y, 2.2, 1.7, "r")
    c.px(Math.round(x - 1), Math.round(y - 1), "o")
  }
  // Puño vuelto.
  c.ellipse(x1, y1, 2.2, 2.2, "o"); c.px(Math.round(x1), Math.round(y1), "R")
}

// La cabeza: calva con brillo, tonsura, orejas, gafas, nariz, boca. `o` son las opciones de la cara.
function cabeza(c, o) {
  const dy = o.dy ?? 0
  const cy = 16.5 + dy
  c.ellipse(CX - 0.5, cy, 11, 11.5, "s")
  // Sombra a la derecha y abajo, brillo arriba a la izquierda.
  c.clip((x, y) => ((x + 1 - CX) / 11) ** 2 + ((y + 0.5 - cy) / 11.5) ** 2 <= 1, () => {
    c.ellipse(CX + 3, cy + 3, 11, 11.5, "S")
    c.ellipse(CX - 1.5, cy - 1, 9.5, 10, "s")
  })
  c.ellipse(CX - 5, 9 + dy, 2.5, 1.5, "O"); c.px(CX - 2, 8 + dy, "O")
  // Orejas.
  for (let y = 16; y <= 20; y++) { c.px(CX - 13, y + dy, "s"); c.px(CX - 12, y + dy, "S"); c.px(CX + 11, y + dy, "S"); c.px(CX + 12, y + dy, "Z") }
  // Tonsura: cerco de pelo blanco y despeinado.
  for (let y = 10; y <= 16; y++) for (const x of [CX - 12, CX - 11, CX - 10, CX + 9, CX + 10, CX + 11]) c.px(x, y + dy, (x + y) % 3 ? "h" : "H")
  for (const [x, y] of [[-13, 9], [-14, 11], [-13, 13], [12, 9], [13, 11], [12, 13], [-10, 9], [9, 9], [-14, 10], [13, 10]]) c.px(CX + x, y + dy, "h")
  // Cejas pobladas y blancas.
  const ceja = o.cejas ?? 0
  for (const x0 of [CX - 9, CX + 2]) {
    c.hline(x0, 12 + dy - ceja, 6, "h"); c.hline(x0 + 1, 13 + dy - ceja, 4, "H")
    c.px(x0 === CX - 9 ? x0 - 1 : x0 + 6, 11 + dy - ceja, "h")
  }
  // Gafas de culo de botella.
  for (const lx of [CX - 6, CX + 4]) {
    c.ellipse(lx + 0.5, 18 + dy, 4, 3.5, "g")
    c.ellipse(lx + 0.5, 18 + dy, 3, 2.5, "w")
  }
  c.hline(CX - 2, 17 + dy, 3, "g")
  // Ojos (aumentados por los cristales) o párpados.
  const ojos = o.ojos ?? "abiertos"
  for (const lx of [CX - 6, CX + 4]) {
    const ex = lx + (o.mira ?? 0)
    if (ojos === "abiertos") { c.rect(ex - 1, 17 + dy, 3, 3, "e"); c.px(ex - 1, 17 + dy, "O") }
    if (ojos === "grandes") { c.rect(ex - 1, 16 + dy, 3, 4, "e"); c.px(ex - 1, 16 + dy, "O"); c.px(ex, 16 + dy, "O") }
    if (ojos === "medio") { c.hline(ex - 2, 17 + dy, 5, "S"); c.rect(ex - 1, 18 + dy, 3, 2, "e") }
    if (ojos === "cerrados") c.hline(ex - 2, 19 + dy, 5, "e")
    if (ojos === "contentos") { c.px(ex - 2, 19 + dy, "e"); c.px(ex - 1, 18 + dy, "e"); c.px(ex, 18 + dy, "e"); c.px(ex + 1, 18 + dy, "e"); c.px(ex + 2, 19 + dy, "e") }
  }
  // Brillo del cristal.
  for (const lx of [CX - 6, CX + 4]) c.px(lx + 2, 16 + dy, "O")
  // Nariz de buen vino.
  c.ellipse(CX - 0.5, 22 + dy, 1.8, 1.5, "n"); c.px(CX - 1, 21 + dy, "p")
  // Mejillas.
  if (o.mejillas) { c.hline(CX - 9, 22 + dy, 2, "p"); c.hline(CX + 6, 22 + dy, 2, "p") }
  // Boca.
  const boca = o.boca ?? "seria"
  const by = 25 + dy
  if (boca === "seria") c.hline(CX - 2, by, 4, "M")
  if (boca === "abierta") { c.hline(CX - 2, by, 4, "M"); c.hline(CX - 2, by + 1, 4, "m"); c.hline(CX - 1, by + 2, 2, "M") }
  if (boca === "o") { c.rect(CX - 1, by, 2, 3, "M"); c.px(CX - 1, by + 1, "m"); c.px(CX, by + 1, "m") }
  if (boca === "sonrisa") { c.px(CX - 3, by, "M"); c.hline(CX - 2, by + 1, 4, "M"); c.px(CX + 2, by, "M"); c.hline(CX - 1, by + 1, 2, "m") }
  if (boca === "ronca") { c.rect(CX - 1, by, 2, 2, "M") }
  if (o.sudor) { c.px(CX - 13, 7 + dy, "b"); c.px(CX - 13, 8 + dy, "b"); c.px(CX - 14, 8 + dy, "b") }
}

// El pupitre: tablero inclinado por delante del fraile, con su canto de luz y
// la sombra que el tablero echa sobre el hábito; el pergamino encima.
function pupitre(c, escrito) {
  c.hline(0, 38, 48, "R")                      // sombra del canto sobre el hábito
  c.rect(0, 39, 48, 9, "d")
  c.poly([0, 39, 48, 39, 48, 42, 0, 42], "t")  // tablero, más claro por arriba
  c.hline(0, 39, 48, "c")                      // canto con luz
  c.hline(0, 43, 48, "D")                      // borde del tablero
  c.rect(0, 44, 48, 4, "d"); c.hline(0, 47, 48, "D")
  for (const x of [6, 41]) { c.vline(x, 44, 4, "D"); c.vline(x + 1, 44, 4, "t") }
  // Pergamino, con renglones que crecen al escribir.
  c.poly([12, 39, 32, 39, 33, 43, 11, 43], "c"); c.hline(11, 43, 23, "C"); c.vline(11, 40, 3, "C")
  for (let r = 0; r < 2; r++) c.hline(14, 40 + r * 2, Math.min(16, escrito - r * 16 > 0 ? escrito - r * 16 : 0), "i")
}
function tintero(c) { c.rect(39, 34, 7, 5, "i"); c.rect(40, 33, 5, 1, "g"); c.px(40, 35, "w"); c.px(41, 35, "w") }

// Las manos: la derecha (a la derecha de la imagen) lleva la pluma; `mano` es su punta.
function manoPluma(c, x, y) {
  // Pluma larguísima, inclinada hacia fuera.
  for (let i = 0; i <= 26; i++) {
    const px = Math.round(x + i * 0.32), py = y - i
    if (py < 0) break
    c.px(px, py, "F")
    if (i > 6) { c.px(px - 1, py, i % 2 ? "f" : "F"); c.px(px + 1, py, "f"); if (i > 9 && i < 22) c.px(px + 2, py, i % 3 ? "f" : "F") }
  }
  c.px(x, y + 1, "k")
  // La mano que la sujeta.
  c.rect(x - 2, y - 2, 4, 3, "S"); c.hline(x - 2, y - 2, 4, "s"); c.vline(x + 1, y - 1, 2, "Z")
}
function manoQuieta(c, x, y) { c.rect(x, y, 4, 3, "S"); c.hline(x, y, 4, "s"); c.vline(x + 3, y + 1, 2, "Z") }

function monedas(c, alto) {
  for (let i = 0; i < 4; i++) { c.ellipse(15.5, 39 - i * 2 - (i === 3 ? alto : 0), 3, 1.2, i % 2 ? "W" : "Y"); c.px(14, 39 - i * 2 - (i === 3 ? alto : 0), "Y") }
}

function zetas(c, f) {
  const z = (x, y) => { c.hline(x, y, 3, "H"); c.px(x + 1, y + 1, "H"); c.hline(x, y + 2, 3, "H") }
  z(37, 6 - f); if (f > 0) z(41, 2 - (f - 1))
}

// Fray Abundio entero. `o`: cara (ver cabeza), mano de la pluma, monedas, zetas.
function fray(c, o) {
  cuerpo(c, o.dy ?? 0)
  cabeza(c, o)
  pupitre(c, o.escrito ?? 14)
  tintero(c)
  const dy = o.dy ?? 0
  const [lx, ly] = o.monedas != null ? [10, 36] : [12, 38]
  manga(c, CX - 10, 32 + dy, lx - 1, ly + 1)
  if (o.monedas != null) monedas(c, o.monedas)
  manoQuieta(c, lx, ly)
  const mx = o.manoX ?? 33, my = o.manoY ?? 40
  manga(c, CX + 9, 32 + dy, mx + 3, my - 2)
  manoPluma(c, mx, my)
  if (o.zetas != null) zetas(c, o.zetas)
}

const CARAS = {
  solemne: { boca: "seria" },
  adulador: { boca: "sonrisa", ojos: "contentos", mejillas: true },
  escandalizado: { boca: "o", ojos: "grandes", cejas: 2, sudor: true },
  dormido: { boca: "ronca", ojos: "cerrados", dy: 1, zetas: 1 },
  monedas: { boca: "sonrisa", ojos: "abiertos", mira: -1, monedas: 0 },
}
const OPT = { w: 48, h: 48, outline: "k" }
for (const [nombre, cara] of Object.entries(CARAS)) sprite(nombre, OPT, (c) => fray(c, cara))

// Animaciones cortas (respetan «reducir movimiento» en el juego: allí se queda la cara quieta).
anim("parpadea", { ...OPT, fps: 8 },
  frame({ ms: 2400 }, (c) => fray(c, CARAS.solemne)),
  frame({ ms: 90 }, (c) => fray(c, { ...CARAS.solemne, ojos: "medio" })),
  frame({ ms: 120 }, (c) => fray(c, { ...CARAS.solemne, ojos: "cerrados" })),
  frame({ ms: 90 }, (c) => fray(c, { ...CARAS.solemne, ojos: "medio" })))
anim("habla", { ...OPT, fps: 7 },
  ...["seria", "abierta", "o", "abierta", "seria", "abierta"].map((boca, i) => frame((c) => fray(c, { boca, escrito: 14 + i }))))
anim("moja", { ...OPT, fps: 6 },
  ...[[33, 40, 14], [35, 37, 16], [39, 33, 16], [41, 35, 16], [41, 35, 16], [39, 33, 16], [35, 37, 16], [33, 40, 18]].map(([manoX, manoY, escrito]) =>
    frame((c) => fray(c, { manoX, manoY, escrito, mira: manoX > 36 ? 1 : 0 }))))
anim("cabecea", { ...OPT, fps: 3 },
  frame((c) => fray(c, { ...CARAS.dormido, dy: 0, zetas: 0 })),
  frame((c) => fray(c, { ...CARAS.dormido, dy: 1, zetas: 1 })),
  frame((c) => fray(c, { ...CARAS.dormido, dy: 2, zetas: 2 })),
  frame((c) => fray(c, { ...CARAS.dormido, dy: 1, zetas: 2 })))
anim("tintinea", { ...OPT, fps: 8 },
  ...[0, 1, 2, 1, 0, 0].map((alto) => frame((c) => fray(c, { ...CARAS.monedas, monedas: alto }))))

// Letra capitular de la Crónica Definitiva: marco de oro con fondo de gules y
// una enredadera. La letra la pone el juego encima, con su tipo de letra.
sprite("capitular", { w: 26, h: 26 }, (c) => {
  c.rect(0, 0, 26, 26, "W"); c.rect(1, 1, 24, 24, "Y"); c.rect(2, 2, 22, 22, "W")
  c.rect(3, 3, 20, 20, "M")
  // Fondo de rombos, como en los libros iluminados.
  for (let y = 3; y < 23; y++) for (let x = 3; x < 23; x++) if ((x + y) % 4 === 0 && (x - y + 40) % 4 === 0) c.px(x, y, "m")
  // Enredadera que sube por la izquierda y baja por la derecha.
  for (let y = 4; y < 22; y++) {
    const lx = 4 + Math.round((Math.sin(y * 0.9) + 1) * 0.6), rx = 21 - Math.round((Math.sin(y * 0.9 + 1.5) + 1) * 0.6)
    c.px(lx, y, "V"); c.px(rx, y, "V")
    if (y % 4 === 1) { c.px(lx + 1, y, "v"); c.px(lx + 1, y - 1, "v"); c.px(rx - 1, y + 2, "v"); c.px(rx - 1, y + 1, "v") }
  }
  for (const [x, y] of [[7, 4], [18, 21], [5, 21], [20, 4]]) { c.px(x, y, "y"); c.px(x + 1, y, "Y"); c.px(x, y + 1, "Y") }
  // Esquinas con un punto de oro.
  for (const [x, y] of [[1, 1], [23, 1], [1, 23], [23, 23]]) { c.rect(x, y, 2, 2, "y"); c.px(x, y, "O") }
})
