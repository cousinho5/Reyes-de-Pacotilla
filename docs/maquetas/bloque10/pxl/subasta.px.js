// Gran Subasta (bloque 10, extra): el puesto del subastador bajo el toldo real, con la vela que marca
// el tiempo (subasta «a la candela»), los tres lotes sobre la mesa y los sobres lacrados de las pujas.
// La escena mide 160x88 y se ve al doble en la tarjeta (320x176). Cada pieza es un dibujo aparte para
// que el juego la monte: el fondo, el subastador (con el mazo arriba o dando el golpe), la vela en 13
// alturas con su llama, los lotes y el sobre.
// - El color de la casa va en las letras 7 (claro), 8 (oscuro) y 9 (brillo): el sobre con tu lacre.
// - La luz viene de arriba a la izquierda, cálida, como en el castillo.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js shot docs/maquetas/bloque10/pxl/subasta.px.js subasta
const W = 160, H = 88, MESA = 60

pal({
  k: "#1a1220",                                                         // contorno
  // tela roja del toldo y del paño (la de las tejas del castillo)
  r: "#47171f", R: "#73262a", q: "#a23d31", Q: "#cc5f3f", p: "#ec8f5e",
  // madera
  h: "#2c1914", H: "#4d2c1d", j: "#75462a", J: "#a26b3e", i: "#cf9a5f",
  // lona del toldo, pergamino y cera
  0: "#c4b496", c: "#ddd0b4", W: "#efe6d2", N: "#fbf4e4",
  // arpillera de los sacos
  e: "#3f2820", f: "#64432d", g: "#8d6640", t: "#b8915e", T: "#dcc08b",
  // oro y llama
  o: "#8a5a12", K: "#d49a2a", I: "#f8d66a", Y: "#fff6c8",
  // casaca azul del subastador
  z: "#1d4677", Z: "#2f69a6", P: "#5b9bd1",
  // piel y barba
  n: "#c4855a", F: "#ebb48a", s: "#f8d4b0", x: "#b8b0b4", X: "#e4dee0",
  // humo
  u: "#8a8494", U: "#b8b4c0",
  // piedra y hierro de las marcas de los sacos
  A: "#433c52", B: "#625a6e", C: "#857b8c", D: "#a99ea6",
  // color de la casa (verde de muestra)
  7: "#3f8a3a", 8: "#2a5f28", 9: "#7fcf62",
})
ramps("rRqQp", "hHjJi", "0cWN", "efgtT", "oKIY", "zZP", "nFs", "xX", "uU", "ABCD", "879")

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16

// ================================================================ fondo: toldo, estandarte y mesa
sprite("subasta_fondo", { w: W, h: H }, (c) => {
  // Lona a rayas; un tono más oscura abajo, donde no llega la luz de la entrada (trama solo en el cambio).
  for (let y = 0; y < MESA; y++) for (let x = 0; x < W; x++) {
    const raya = Math.floor((x + 4) / 10) % 2 === 0
    const abajo = y + (bayer(x, y) - 0.5) * 4 > 44
    let k = raya ? (abajo ? "c" : "W") : (abajo ? "0" : "c")
    if ((x + 4) % 20 === 0) k = "0"                                     // costuras
    c.px(x, y, k)
  }
  // Faldón del toldo: festones rojos con galón de oro.
  c.rect(0, 0, W, 6, "R"); c.hline(0, 0, W, "r"); c.hline(0, 4, W, "K"); for (let x = 1; x < W; x += 3) c.px(x, 4, "I")
  for (let s = 0; s < W; s += 10) for (let x = 0; x < 10; x++) {
    const d = Math.round(Math.sqrt(Math.max(0, 25 - (x - 4.5) ** 2)) * 0.8)
    for (let y = 6; y < 6 + d; y++) c.px(s + x, y, y === 5 + d ? "r" : x < 3 ? "q" : "R")
  }
  for (let s = 0; s < W; s += 10) { c.px(s + 4, 10, "K"); c.px(s + 5, 10, "K"); c.px(s + 4, 11, "I") }   // borlas
  // Estandarte de la Corona colgado de una barra dorada, con cola de golondrina.
  const bx = 98, bw = 18
  c.hline(bx - 3, 13, bw + 6, "o"); c.hline(bx - 3, 12, bw + 6, "K"); c.px(bx - 4, 12, "I"); c.px(bx + bw + 3, 12, "I")
  for (let y = 14; y < 35; y++) for (let x = bx; x < bx + bw; x++) {
    const cola = y >= 30 && Math.abs(x - (bx + bw / 2 - 0.5)) < (y - 29) * 1.1
    if (cola) continue
    c.px(x, y, x < bx + 2 ? "Q" : x > bx + bw - 3 ? "R" : "q")
  }
  c.hline(bx, 15, bw, "K"); c.hline(bx, 28, bw, "K")
  // Corona: aro, tres puntas con perlas.
  const cx = bx + bw / 2 - 0.5
  c.rect(cx - 5, 22, 11, 3, "K"); c.hline(cx - 5, 22, 11, "I"); c.hline(cx - 5, 24, 11, "o")
  for (const dx of [-5, 0, 5]) { c.vline(cx + dx, 18, 4, "K"); c.px(cx + dx, 17, "Y") }
  c.px(cx - 3, 20, "K"); c.px(cx + 3, 20, "K"); c.px(cx - 2, 23, "q"); c.px(cx + 2, 23, "Z")
  // Mesa: tablero y paño rojo con pliegues y fleco de oro.
  c.hline(0, MESA, W, "i"); c.rect(0, MESA + 1, W, 2, "J"); c.hline(0, MESA + 3, W, "j")
  for (let y = MESA + 4; y < H; y++) for (let x = 0; x < W; x++) {
    const pl = (x % 16) / 16
    let k = pl < 0.12 ? "Q" : pl > 0.82 ? "R" : "q"
    if (y === MESA + 4) k = "R"                                          // sombra del tablero
    c.px(x, y, k)
  }
  c.hline(0, H - 5, W, "K"); for (let x = 0; x < W; x++) { c.px(x, H - 4, x % 2 ? "o" : "K"); c.px(x, H - 3, x % 2 ? "o" : "I"); if (x % 4 === 1) c.vline(x, H - 2, 2, "K") }
  // Coronita bordada bajo el subastador.
  c.rect(35, 76, 9, 2, "K"); for (const dx of [0, 4, 8]) c.px(35 + dx, 75, "I"); c.px(37, 75, "K"); c.px(41, 75, "K")
})

// ================================================================ el subastador
// Visto de cintura arriba tras la mesa: sombrero de copa baja, barba blanca, casaca azul con cadena.
// golpe: el mazo baja sobre la mesa.
function subastador(c, golpe) {
  const ox = 2
  // casaca
  c.poly([ox + 6, 22, ox + 22, 22, ox + 25, 40, ox + 3, 40], "Z")
  c.poly([ox + 6, 22, ox + 9, 22, ox + 6, 40, ox + 3, 40], "P")
  c.poly([ox + 19, 22, ox + 22, 22, ox + 25, 40, ox + 21, 40], "z")
  c.vline(ox + 14, 24, 16, "z"); for (let y = 26; y < 40; y += 4) c.px(ox + 13, y, "K")
  // cadena de oro con medalla
  c.line(ox + 8, 22, ox + 14, 30, "K"); c.line(ox + 20, 22, ox + 14, 30, "o"); c.ellipse(ox + 14, 31, 1.6, 1.6, "I")
  // cuello y cabeza
  c.rect(ox + 10, 19, 8, 3, "W")
  c.ellipse(ox + 14, 12, 6, 6.5, "F"); c.ellipse(ox + 13.4, 11.6, 5.2, 5.6, "s")
  c.px(ox + 12, 11, "k"); c.px(ox + 16, 11, "k"); c.px(ox + 11, 10, "n"); c.px(ox + 12, 10, "n"); c.px(ox + 16, 10, "n"); c.px(ox + 17, 10, "n")
  c.px(ox + 14, 13, "F"); c.px(ox + 14, 12, "n")
  // barba: cae sobre el cuello, más oscura por la derecha
  for (let y = 14; y < 23; y++) {
    const hw = y < 17 ? 6 - (17 - y) : 6 - (y - 17) * 0.75
    for (let x = Math.round(ox + 14 - hw); x <= Math.round(ox + 14 + hw); x++) c.px(x, y, x > ox + 15 ? "x" : "X")
  }
  c.hline(ox + 13, 15, 3, "R")                                           // boca
  c.px(ox + 11, 14, "X"); c.px(ox + 17, 14, "X"); c.px(ox + 10, 14, "X")  // bigote
  // sombrero de copa baja con cinta de oro
  c.rect(ox + 5, 6, 18, 2, "h"); c.hline(ox + 5, 6, 18, "H")
  c.rect(ox + 8, 0, 12, 6, "h"); c.vline(ox + 8, 0, 6, "H"); c.hline(ox + 8, 4, 12, "K")
  // brazo izquierdo apoyado en la mesa
  c.line(ox + 5, 25, ox + 2, 39, "P"); c.line(ox + 6, 25, ox + 3, 39, "Z"); c.ellipse(ox + 3, 40, 2, 1.4, "s")
  // brazo derecho con el mazo
  if (!golpe) {
    c.line(ox + 22, 25, ox + 29, 17, "Z"); c.line(ox + 23, 25, ox + 30, 18, "z"); c.ellipse(ox + 30, 16, 1.8, 1.8, "s")
    c.line(ox + 31, 14, ox + 33, 7, "j"); c.rect(ox + 29, 2, 8, 5, "J"); c.hline(ox + 29, 2, 8, "i"); c.hline(ox + 29, 6, 8, "j"); c.vline(ox + 29, 2, 5, "i")
  } else {
    c.line(ox + 22, 25, ox + 28, 34, "Z"); c.line(ox + 23, 25, ox + 29, 34, "z"); c.ellipse(ox + 29, 35, 1.8, 1.8, "s")
    c.line(ox + 30, 36, ox + 33, 36, "j"); c.rect(ox + 32, 34, 4, 7, "J"); c.vline(ox + 32, 34, 7, "i"); c.vline(ox + 35, 34, 7, "j")
  }
}
sprite("subastador", { w: 40, h: 41, outline: "k", pivot: "bottom", facing: "front" }, (c) => subastador(c, false))
sprite("subastador_golpe", { w: 40, h: 41, outline: "k", pivot: "bottom", facing: "front" }, (c) => subastador(c, true))

// ================================================================ la vela
// Vela en su palmatoria: 13 alturas, de entera (12) a apurada (0). La cera gotea por el lado de la luz.
const ALTURAS = 13, VELA_MAX = 24
function vela(c, n) {
  const alto = 2 + Math.round((VELA_MAX - 2) * n / (ALTURAS - 1)), base = 30, top = base - alto
  c.ellipse(6, base + 1, 6, 1.6, "K"); c.hline(1, base + 2, 11, "o"); c.hline(2, base, 9, "I")   // palmatoria
  c.rect(10, base - 3, 3, 1, "K"); c.px(12, base - 2, "K")                                      // asa
  c.rect(4, top, 5, alto, "W"); c.vline(4, top, alto, "N"); c.vline(8, top, alto, "0")
  c.hline(4, top, 5, "N"); c.px(5, top + 1 + (n % 3), "N"); c.vline(4, top + 2, Math.min(4, alto - 2), "N")
  if (n > 0) c.px(9, top + 1, "W"), c.px(9, top + 2, "c")                                       // goterón
  c.px(6, top - 1, "k")                                                                          // pabilo
}
for (let n = 0; n < ALTURAS; n++) sprite(`vela_${n}`, { w: 13, h: 33, outline: "k", pivot: "bottom" }, (c) => vela(c, n))
// Llama: 4 fotogramas que tiemblan. Se pone encima del pabilo. (pxl check avisa de que se ilumina por la
// derecha en dos fotogramas: es la propia llama, que da la luz; se deja así.)
anim("llama", { w: 7, h: 9, fps: 6, pivot: "bottom" }, (c) => {}, ...[0, 1, 2, 1].map((f) => frame((c) => {
  const dx = f === 2 ? 1 : 0, alto = f === 1 ? 7 : 6
  c.ellipse(3 + dx * 0.5, 8 - alto / 2, 2, alto / 2, "K")
  c.ellipse(3, 8 - alto / 2 + 1, 1.3, alto / 2 - 1, "I")
  c.vline(3, 9 - alto + 2, alto - 3, "Y"); c.px(3 + dx, 9 - alto, "p")
})))
// Humo cuando se apaga.
anim("humo", { w: 9, h: 14, fps: 4, pivot: "bottom" }, ...[0, 1, 2].map((f) => frame((c) => {
  for (let i = 0; i < 4; i++) { const y = 12 - i * 3 - f; if (y < 0) continue; c.px(4 + Math.round(Math.sin(i + f) * 2), y, i < 2 ? "U" : "u") }
})))

// ================================================================ los lotes
// Sacos de un recurso (el juego pone el icono del recurso encima).
sprite("lote_saco", { w: 26, h: 22, outline: "k", pivot: "bottom" }, (c) => {
  // Dos sacos de arpillera atados por el cuello; el de detrás, más alto. Trama de tejido en franjas.
  for (const [x0, y0, rx, ry] of [[16, 13, 8, 8], [7, 15, 6, 6.5]]) {
    for (let y = 0; y < 22; y++) for (let x = 0; x < 26; x++) {
      const d = ((x + 0.5 - x0) / rx) ** 2 + ((y + 0.5 - y0) / (y < y0 ? ry * 0.9 : ry)) ** 2
      if (d > 1) continue
      const luz = 0.7 - (x - x0) / rx * 0.4 - (y - y0) / ry * 0.2
      c.px(x, y, luz > 0.85 ? "T" : luz > 0.45 ? "t" : "g")
      if ((y - Math.round(x0)) % 3 === 0 && luz < 0.9 && d < 0.8) c.px(x, y, luz > 0.45 ? "g" : "f")   // franjas
    }
    // Cuello fruncido y atado: un penacho de tela que se abre por arriba.
    const top = Math.round(y0 - ry * 0.9), cx = Math.round(x0)
    c.hline(cx - 1, top, 3, "f"); c.px(cx + 1, top + 1, "f")                                         // cuerda
    c.hline(cx - 1, top - 1, 3, "t"); c.hline(cx - 2, top - 2, 5, "t"); c.px(cx - 2, top - 2, "T"); c.px(cx + 2, top - 2, "g")
    c.px(cx - 2, top - 3, "T"); c.px(cx, top - 3, "t"); c.px(cx + 2, top - 3, "g")
  }
  c.hline(1, 21, 23, "f")
})
// Un saco suelto con la marca de su recurso pintada delante (el juego los coloca de uno en uno o de dos
// en dos según el lote). Las marcas son de 7x5 y van centradas en la panza del saco.
function sacoSuelto(c) {
  const x0 = 8, y0 = 12, rx = 7.5, ry = 7.5
  for (let y = 0; y < 21; y++) for (let x = 0; x < 17; x++) {
    const d = ((x + 0.5 - x0) / rx) ** 2 + ((y + 0.5 - y0) / (y < y0 ? ry * 0.9 : ry)) ** 2
    if (d > 1) continue
    const luz = 0.7 - (x - x0) / rx * 0.4 - (y - y0) / ry * 0.2
    c.px(x, y, luz > 0.85 ? "T" : luz > 0.45 ? "t" : "g")
    if ((y - x0) % 3 === 0 && luz < 0.9 && d < 0.8) c.px(x, y, luz > 0.45 ? "g" : "f")
  }
  const top = Math.round(y0 - ry * 0.9)
  c.hline(x0 - 1, top, 3, "f"); c.px(x0 + 1, top + 1, "f")
  c.hline(x0 - 1, top - 1, 3, "t"); c.hline(x0 - 2, top - 2, 5, "t"); c.px(x0 - 2, top - 2, "T"); c.px(x0 + 2, top - 2, "g")
  c.px(x0 - 2, top - 3, "T"); c.px(x0, top - 3, "t"); c.px(x0 + 2, top - 3, "g")
  c.hline(1, 20, 15, "f")
}
const MARCAS = {
  pan: `
    .kkkkk.
    kJiJiJk
    kJJJJJk
    kjjjjjk
    .kkkkk.`,
  madera: `
    kkkkkk.
    kiJJJJk
    kkkkkkk
    kiJJJJk
    kkkkkk.`,
  piedra: `
    .kkkk..
    kDDCCk.
    kDCCCBk
    kCCBBBk
    .kkkkk.`,
  hierro: `
    .kkkkk.
    .kDDCk.
    kCCCCBk
    kBBBBAk
    kkkkkkk`,
}
for (const [r, marca] of Object.entries(MARCAS)) {
  sprite(`saco_${r}`, { w: 17, h: 21, outline: "k", pivot: "bottom" }, (c) => sacoSuelto(c), grid(5, 11, marca))
}
// Montoncito de Oro para los lotes de dos recursos.
sprite("monton_oro", { w: 15, h: 9, outline: "k", pivot: "bottom" }, (c) => {
  for (let y = 0; y < 9; y++) for (let x = 0; x < 15; x++) {
    if (8 - y > 8 - Math.abs(x - 7) * 1.1) continue
    c.px(x, y, (x + y * 2) % 5 === 0 ? "I" : (x * 3 + y) % 7 === 0 ? "o" : x < 6 ? "K" : (x + y) % 3 ? "K" : "o")
  }
  c.hline(5, 3, 3, "Y"); c.hline(9, 6, 3, "Y"); c.px(3, 6, "Y")
})
// Monedas de Oro en montón.
sprite("lote_oro", { w: 24, h: 14, outline: "k", pivot: "bottom" }, (c) => {
  for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) {
    const hgt = 12 - Math.abs(x - 11.5) * 0.9
    if (13 - y > hgt) continue
    c.px(x, y, (x + y * 2) % 5 === 0 ? "I" : (x * 3 + y) % 7 === 0 ? "o" : x < 10 ? "K" : (x + y) % 3 ? "K" : "o")
  }
  for (const [x, y] of [[8, 5], [13, 3], [16, 8], [5, 10], [19, 11]]) { c.hline(x, y, 3, "Y"); c.px(x + 1, y + 1, "I") }
})
// La carta: pergamino con lacre sobre un cojín de terciopelo.
sprite("lote_carta", { w: 20, h: 22, outline: "k", pivot: "bottom" }, (c) => {
  c.ellipse(10, 18, 9.5, 3.5, "R"); c.ellipse(9, 17, 8, 2.5, "q"); c.hline(4, 16, 8, "Q")
  c.px(0, 19, "K"); c.px(19, 19, "K"); c.px(0, 20, "I"); c.px(19, 20, "I")                      // borlas
  c.rect(4, 2, 12, 13, "W"); c.vline(4, 2, 13, "N"); c.vline(15, 2, 13, "0")
  c.rect(3, 0, 14, 2, "c"); c.hline(3, 0, 14, "N"); c.rect(3, 14, 14, 2, "c"); c.hline(3, 15, 14, "0")
  for (let y = 4; y < 11; y += 2) c.hline(6, y, y === 10 ? 5 : 8, "0")
  c.vline(10, 11, 6, "q"); c.ellipse(10, 12, 2, 2, "R"); c.px(9, 11, "Q")                       // cinta y lacre
})

// ================================================================ el sobre de una puja
// Sobre lacrado (9x6). El tuyo lleva el lacre del color de tu casa y un filo de oro, para verlo
// aunque tu color sea el rojo del lacre.
function sobre(c, lacre, tuyo = false) {
  c.rect(0, 0, 9, 6, "N"); c.hline(0, 5, 9, "c"); c.vline(8, 0, 6, "c")
  if (tuyo) { c.rect(0, 0, 9, 1, "I"); c.vline(0, 0, 6, "I"); c.hline(0, 5, 9, "K"); c.vline(8, 0, 6, "K") }
  c.line(0, 0, 4, 3, "0"); c.line(8, 0, 4, 3, "0")
  c.ellipse(4, 3, 1.6, 1.4, lacre[0]); c.px(4, 3, lacre[1]); c.px(3, 2, lacre[2])
}
sprite("sobre", { w: 9, h: 6, outline: "k" }, (c) => sobre(c, ["R", "q", "Q"]))
sprite("sobre_tuyo", { w: 9, h: 6, outline: "k" }, (c) => sobre(c, ["8", "7", "9"], true))

// ================================================================ escenas de muestra
const LOTES = [["lote_saco", 74], ["lote_carta", 107], ["lote_oro", 139]]
function sobres(c, x, n, tuyo) {
  // El tuyo, delante de los demás.
  const orden = [...Array(n).keys()].sort((a, b) => (a === tuyo) - (b === tuyo))
  for (const i of orden) c.stamp(i === tuyo ? "sobre_tuyo" : "sobre", x - 12 + i * 6, MESA + 8 + (i % 2) * 3)
}
function montar(c, { altura, cuentas, tuyo, golpe, apagada, f }) {
  c.stamp("subasta_fondo", 0, 0)
  c.stamp(golpe ? "subastador_golpe" : "subastador", 40, MESA + 1)
  c.stamp(`vela_${altura}`, 13, MESA + 1)
  const top = MESA + 1 - 3 - (2 + Math.round((VELA_MAX - 2) * altura / (ALTURAS - 1)))
  if (!apagada) c.stamp("llama", 13, top - 1)
  else c.stamp("humo", 13, top - 1)
  for (const [n, x] of LOTES) c.stamp(n, x, MESA + 1)
  LOTES.forEach(([, x], i) => sobres(c, x, cuentas[i], tuyo[i]))
  if (golpe) for (const [dx, dy] of [[-6, -2], [6, -2], [-4, -5], [4, -5]]) c.px(77 + dx, MESA - 3 + dy, "Y")
}
// Subasta abierta: vela a media altura, sobres en cada lote (el tuyo, con tu lacre).
scene("subasta", { w: W, h: H, world: { light: [-0.6, -1] } },
  layer("todo", (c) => montar(c, { altura: 7, cuentas: [3, 1, 2], tuyo: [1, -1, -1] })))
// La historia en un bucle: la vela se consume, llegan los sobres, se apaga y cae el mazo.
const LLEGAN = [[1, 0], [3, 2], [4, 0], [6, 1], [7, 2], [9, 0]]
anim("subasta_historia", { w: W, h: H, fps: 3 }, ...Array.from({ length: 16 }, (_, i) => frame(
  i >= 14 ? { hold: 2 } : {},
  (c) => {
    const cuentas = [0, 0, 0], tuyo = [-1, -1, -1]
    for (const [t, l] of LLEGAN) if (i >= t) { if (t === 3) tuyo[l] = cuentas[l]; cuentas[l]++ }
    montar(c, { altura: Math.max(0, 12 - i), cuentas, tuyo, apagada: i >= 12, golpe: i >= 14 })
  })))
// Lámina de piezas: la vela en sus alturas, los lotes y los sobres.
scene("subasta_piezas", { w: 300, h: 44, bg: "c" },
  layer("piezas", ...Array.from({ length: ALTURAS }, (_, n) => stamp(`vela_${n}`, 8 + n * 9, 40)),
    stamp("lote_saco", 135, 40), stamp("lote_carta", 160, 40), stamp("lote_oro", 184, 40),
    ...["pan", "madera", "piedra", "hierro"].map((r, i) => stamp(`saco_${r}`, 212 + i * 19, 40)), stamp("monton_oro", 290, 40),
    stamp("sobre", 125, 4), stamp("sobre_tuyo", 137, 4)))
