// Portada del juego (bloque 7): Aldricia vista desde el camino real, con la capital al fondo.
// Cada plano es un dibujo aparte (196x216) para que la maqueta los mueva a su velocidad (paralaje)
// y los tiña según la hora; el cielo, el sol, la luna y las estrellas los pinta la maqueta en código,
// y el título va en HTML encima del cielo. La escena "portada" monta todo para revisarlo.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js shot docs/maquetas/bloque7/pxl/portada.px.js portada
//   node scripts/pxl-a-juego.mjs docs/maquetas/bloque7/pxl/portada.px.js lejos colinas capital pueblo …
const W = 196, H = 216

pal({
  k: "#1c1410",                                             // contorno (el del mapa)
  1: "#22401f", 2: "#365f2b", 3: "#4f8035", 4: "#73a443", 5: "#9fc558", 6: "#c9df7e", // hierba
  e: "#45291a", E: "#694328", f: "#8f633b", F: "#b98c58",   // tierra, camino
  w: "#71500f", W: "#ad8126", y: "#dcb446", Y: "#f3da82",   // trigo
  s: "#36333d", S: "#57535e", t: "#827d8a", T: "#aaa5b1", u: "#d4d0d9", n: "#ffffff", // piedra
  h: "#3a2213", H: "#663c1f", j: "#956132", J: "#c18849",   // madera
  r: "#5f1f15", R: "#9c3626", q: "#cf5639",                 // tejas
  v: "#efe6cf", V: "#c2b597",                               // revoque, sacos
  z: "#2a3550", Z: "#4a6a9a",                               // cristal (de noche, la maqueta lo enciende)
  a: "#3e1a5c", P: "#5b2a86", p: "#7a46b0", i: "#a07ad6",   // púrpura real
  o: "#a97e14", O: "#e8b83a", g: "#fbe39a",                 // oro
  l: "#5d6f8f", L: "#7d8fae", m: "#a3b3cc", M: "#c9d4e3", N: "#eef3f8", // montes lejanos, nieve
  b: "#1f5384", B: "#3477ae", c: "#6eb0df", C: "#c8e8ff",   // agua
  7: "#a84e0f", 8: "#1b3c80", 9: "#b3291d", 0: "#246b2a",   // banderas de las casas
  x: "#e8e0d0", X: "#b8ab95",                               // humo
  G: "#2f6b4a", Q: "#4f9a6a",                               // contraventanas
})
ramps("eEfF", "wWyY", "sStTun", "hHjJ", "rRq", "VvN", "zZ", "aPpi", "oOg", "lLmM", "bBcC", "Xx", "GQ")
ramps("123456")

// Ruido determinista para que nada salga en fila.
const rnd = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }

// ================================================================ montes lejanos
// Dos cordilleras: la de atrás clara, casi del color del cielo; la de delante, más oscura y nevada.
function cresta(x, base, alto, semilla) {
  const v = Math.sin(x / 23 + semilla) * 0.5 + Math.sin(x / 11 + semilla * 2) * 0.25 + Math.sin(x / 5.3 + semilla * 3) * 0.1
  const pico = Math.max(0, 1 - Math.abs(((x + semilla * 40) % 70) - 35) / 22)
  return Math.round(base - alto * (0.55 + 0.35 * v + 0.5 * pico * pico))
}
sprite("lejos", { w: W, h: H }, (c) => {
  for (let x = 0; x < W; x++) {
    const t1 = cresta(x, 112, 30, 1.7)
    for (let y = t1; y < 130; y++) c.px(x, y, y - t1 < 2 ? "M" : "m")
    if (t1 < 88) for (let y = t1; y < Math.min(t1 + 4, 92); y++) c.px(x, y, "N")
  }
  for (let x = 0; x < W; x++) {
    const t2 = cresta(x, 124, 26, 4.1), izq = cresta(x - 1, 124, 26, 4.1), sol = t2 <= izq
    for (let y = t2; y < 140; y++) c.px(x, y, y - t2 < 1 ? "L" : sol ? "L" : "l")
    if (t2 < 103) for (let y = t2; y < Math.min(t2 + 3 + Math.round(rnd(x) * 2), 106); y++) c.px(x, y, sol ? "N" : "M")
    // bosques oscuros en la falda
    for (let y = 126; y < 140; y++) if (y > t2 + 6 && rnd(x, y) < 0.35) c.px(x, y, "l")
  }
})

// ================================================================ colinas, campos y castillos de las casas
// Un castillo pequeño de una casa: torre, muralla y bandera de su color (llave 7, 8, 9 o 0).
function castillito(c, x, y, k, alto) {
  c.rect(x, y - 9, 12, 9, "t"); c.rect(x + 4, y - 9 - alto, 5, alto, "t")
  for (let i = 0; i < 12; i += 2) c.px(x + i, y - 10, "t")
  c.px(x + 4, y - 10 - alto, "t"); c.px(x + 6, y - 10 - alto, "t"); c.px(x + 8, y - 10 - alto, "t")
  c.vline(x, y - 9, 9, "T"); c.vline(x + 4, y - 9 - alto, alto, "T")
  c.vline(x + 11, y - 9, 9, "S"); c.vline(x + 8, y - 9 - alto, alto, "S")
  c.rect(x + 5, y - 4, 2, 4, "s"); c.px(x + 6, y - 7 - alto, "z")
  c.vline(x + 6, y - 16 - alto, 6, "h"); c.rect(x + 7, y - 16 - alto, 4, 3, k); c.px(x + 10, y - 14 - alto, k)
}
// Un campo en la ladera: paralelogramo con surcos.
function campo(c, x, y, w, h, k, surco, inclina) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const X = x + xx + Math.round(yy * inclina)
    c.px(X, y + yy, (xx + yy) % 3 === 0 ? surco : k)
  }
}
sprite("colinas", { w: W, h: H }, (c) => {
  c.ellipse(22, 142, 64, 22, "3"); c.ellipse(178, 138, 58, 24, "3")
  c.rect(0, 142, W, 74, "3")
  // mosaico de campos en las lomas: trigo, hierba segada, barbecho
  campo(c, 2, 126, 12, 5, "y", "W", 0.6); campo(c, 18, 130, 14, 5, "5", "4", 0.4); campo(c, 34, 127, 10, 6, "W", "w", 0.2)
  campo(c, 4, 133, 10, 6, "F", "f", 0.3); campo(c, 20, 136, 16, 4, "y", "Y", 0.1)
  campo(c, 150, 122, 12, 5, "y", "W", -0.4); campo(c, 164, 128, 14, 5, "5", "4", -0.3); campo(c, 180, 124, 12, 6, "F", "f", -0.2)
  campo(c, 150, 130, 10, 6, "W", "w", -0.2); campo(c, 168, 134, 18, 4, "y", "Y", -0.1)
  // setos que separan los campos y arboledas
  for (let i = 0; i < 60; i++) {
    const x = Math.round(rnd(i, 1) * W), y = 120 + Math.round(rnd(i, 2) * 28)
    if (Math.abs(x - 98) < 48) continue
    c.px(x, y, "1"); c.px(x + 1, y, "2"); c.px(x, y - 1, "2"); c.px(x + 1, y - 1, "4")
  }
  // el molino de la loma izquierda (las aspas las mueve la maqueta: anim "aspas")
  c.rect(26, 121, 5, 9, "v"); c.vline(30, 121, 9, "V"); c.poly([25, 121, 32, 121, 28.5, 116], "R"); c.px(28, 125, "h"); c.rect(28, 127, 2, 3, "h")
  // los castillos de cuatro casas, cada uno en su loma
  castillito(c, 4, 128, "7", 7); castillito(c, 166, 120, "8", 8); castillito(c, 184, 136, "9", 5); castillito(c, 36, 140, "0", 4)
  // luz del oeste: brillos sueltos en la hierba
  for (let x = 0; x < W; x++) for (let y = 118; y < 150; y++) if (c.key(x, y) === "3" && rnd(x, y) < 0.05) c.px(x, y, "4")
})
anim("aspas", { w: 15, h: 15, frames: 8, fps: 6 }, (c) => {
  const a0 = c.phase * Math.PI / 2
  for (let k = 0; k < 4; k++) {
    const a = a0 + k * Math.PI / 2, ex = 7 + Math.cos(a) * 7, ey = 7 + Math.sin(a) * 7
    c.line(7, 7, Math.round(ex), Math.round(ey), "h")
    const px = 7 + Math.cos(a) * 4.5 + Math.cos(a + Math.PI / 2) * 1.2, py = 7 + Math.sin(a) * 4.5 + Math.sin(a + Math.PI / 2) * 1.2
    c.line(Math.round(7 + Math.cos(a + 0.3) * 2.5), Math.round(7 + Math.sin(a + 0.3) * 2.5), Math.round(px + Math.cos(a) * 2), Math.round(py + Math.sin(a) * 2), "v")
  }
  c.px(7, 7, "j")
})

// ================================================================ la capital
function almenas(c, x, y, w, k) { for (let i = 0; i < w; i += 3) c.rect(x + i, y - 2, 2, 2, k) }
function cono(c, cx, base, r, alto) {
  for (let yy = 0; yy < alto; yy++) {
    const half = Math.round((r * (alto - yy)) / alto)
    for (let x = cx - half; x <= cx + half; x++) {
      const lado = x < cx - half / 3 ? "p" : x > cx + half / 2 ? "a" : "P"
      c.px(x, base - yy, (yy % 4 === 3 && (x + yy) % 2) ? "a" : lado)
    }
  }
  c.hline(cx - r - 1, base + 1, r * 2 + 3, "a")
  c.px(cx, base - alto, "O"); c.px(cx, base - alto - 1, "g")
}
// Sillería: hiladas de 4 px, juntas alternas, la cara del sol (izquierda) más clara.
function sillares(c, x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const fila = Math.floor((yy - y) / 4), junta = (yy - y) % 4 === 3 || (xx - x + (fila % 2) * 4) % 8 === 0
    const luz = xx < x + 2 ? "T" : xx > x + w - 3 ? "S" : "t"
    c.px(xx, yy, junta ? (luz === "T" ? "t" : "S") : luz)
  }
}
function ventana(c, x, y, alta) { c.rect(x, y, 2, alta, "z"); c.px(x, y, "Z"); c.hline(x - 1, y + alta, 4, "T") ; c.px(x, y - 1, "z") }
function estandarte(c, x, y) {             // tapiz púrpura con la corona, colgado del adarve
  c.hline(x - 1, y, 7, "o")
  c.rect(x, y + 1, 5, 9, "P"); c.vline(x, y + 1, 9, "p"); c.vline(x + 4, y + 1, 9, "a")
  c.px(x + 1, y + 10, "P"); c.px(x + 3, y + 10, "P")
  c.px(x + 1, y + 3, "O"); c.px(x + 2, y + 2, "O"); c.px(x + 3, y + 3, "O"); c.hline(x + 1, y + 4, 3, "O")
}
function hiedra(c, x, y, w, h) {
  for (let i = 0; i < w * h / 3; i++) { const xx = x + Math.round(rnd(i, x) * w), yy = y + Math.round(Math.pow(rnd(x, i), 0.6) * h); c.px(xx, yy, rnd(i, yy) < 0.5 ? "2" : "3") }
}
function gallardete(c, x, y) { c.vline(x, y, 6, "h"); c.hline(x + 1, y, 4, "p"); c.hline(x + 1, y + 1, 3, "P"); c.px(x + 1, y + 2, "a") }
sprite("capital", { w: W, h: H, outline: "k" }, (c) => {
  // el cerro de la capital
  c.ellipse(98, 160, 62, 16, "2"); c.ellipse(98, 157, 54, 11, "3")
  for (let x = 42; x < 156; x++) if (rnd(x, 9) < 0.25) c.px(x, 150 + Math.round(rnd(x, 3) * 5), "S")
  // torres de esquina
  sillares(c, 50, 104, 14, 46); almenas(c, 50, 104, 14, "t"); cono(c, 57, 102, 9, 20); gallardete(c, 57, 76)
  sillares(c, 132, 104, 14, 46); almenas(c, 132, 104, 14, "t"); cono(c, 139, 102, 9, 20); gallardete(c, 139, 76)
  ventana(c, 56, 112, 4); ventana(c, 138, 112, 4); ventana(c, 56, 126, 3); ventana(c, 138, 126, 3)
  // torreón y torre del rey
  sillares(c, 78, 90, 40, 40); almenas(c, 78, 90, 40, "t")
  sillares(c, 90, 62, 16, 28); almenas(c, 90, 62, 16, "t")
  cono(c, 98, 60, 10, 22)
  c.vline(98, 25, 14, "h")                           // asta: la bandera la pone la maqueta (anim "bandera")
  ventana(c, 97, 69, 6)                              // la ventana del trono vacío
  c.hline(94, 76, 9, "S"); c.hline(94, 77, 9, "s"); c.px(94, 75, "S"); c.px(102, 75, "S")  // balcón
  ventana(c, 84, 99, 4); ventana(c, 111, 99, 4); ventana(c, 92, 104, 3); ventana(c, 103, 104, 3)
  c.ellipse(98, 85, 3, 3, "O"); c.px(98, 85, "o"); c.px(97, 84, "g")      // escudo dorado con la corona
  // muralla delantera con su adarve, la puerta y los estandartes
  sillares(c, 56, 122, 84, 28); almenas(c, 56, 122, 84, "T"); c.hline(56, 122, 84, "T")
  c.rect(91, 133, 14, 17, "s"); c.ellipse(98, 133, 7, 5, "s")
  c.ellipse(98, 133, 8, 6, "T", true)                                      // dovelas del arco
  for (let x = 92; x < 105; x += 3) c.vline(x, 130, 9, "h")                // rastrillo a medio subir
  c.hline(92, 133, 13, "h"); c.hline(92, 137, 13, "h"); for (let x = 92; x < 105; x += 3) c.px(x, 139, "S")
  estandarte(c, 68, 124); estandarte(c, 80, 124); estandarte(c, 111, 124); estandarte(c, 123, 124)
  hiedra(c, 56, 136, 14, 14); hiedra(c, 128, 140, 10, 10); hiedra(c, 50, 132, 6, 18)
  // sombra del torreón sobre la muralla (luz desde la izquierda)
  for (let y = 122; y < 150; y++) for (let x = 118; x < 124; x++) if ((x + y) % 2 === 0 && c.key(x, y) !== "s") c.px(x, y, "S")
  // foso y puente levadizo
  for (let x = 44; x < 152; x++) for (let y = 150; y < 154; y++) c.px(x, y, y === 150 ? "s" : (x + y * 3) % 11 === 0 ? "c" : "B")
  c.rect(92, 149, 13, 6, "j"); for (let x = 92; x < 105; x += 3) c.vline(x, 149, 6, "H"); c.hline(92, 149, 13, "J")
  c.line(91, 134, 92, 149, "h"); c.line(105, 134, 104, 149, "h")         // cadenas
})

// ================================================================ el pueblo, en primer plano
// Casa de entramado: revoque, vigas, aspas de refuerzo, tejado a dos aguas, contraventanas y jardineras.
function casa(c, x, base, w, h, revoque) {
  c.rect(x, base - h, w, h, revoque)
  for (let xx = x; xx < x + w; xx += 8) c.vline(xx, base - h, h, "H")
  c.vline(x + w - 1, base - h, h, "h")
  c.hline(x, base - h, w, "H"); c.hline(x, base - Math.round(h / 2), w, "H")
  for (let xx = x; xx + 8 <= x + w; xx += 16) { c.line(xx, base - Math.round(h / 2), xx + 8, base - h, "H") }  // aspas de refuerzo
  const alto = Math.round(w * 0.45)
  for (let yy = 0; yy < alto; yy++) {                                     // tejado: hiladas de teja con juntas
    const r = ((w + 6) / 2) * ((yy + 1) / alto), cx = x + w / 2
    for (let xx = Math.round(cx - r); xx < Math.round(cx + r); xx++) {
      const junta = yy % 3 === 2 || (xx + (Math.floor(yy / 3) % 2) * 2) % 4 === 0 && yy % 3 === 1
      c.px(xx, base - h - alto + yy, junta ? "r" : xx < cx ? "q" : "R")
    }
  }
  c.hline(x - 3, base - h, w + 6, "r"); c.hline(x - 3, base - h + 1, w + 6, "h")
  for (let wx = x + 3; wx < x + w - 5; wx += 8) {                         // ventanas con contraventanas y flores
    const wy = base - h + 4
    c.rect(wx, wy, 3, 5, "z"); c.px(wx, wy, "Z"); c.vline(wx - 1, wy, 5, "G"); c.vline(wx + 3, wy, 5, "Q")
    c.hline(wx - 1, wy + 5, 5, "j"); c.px(wx, wy + 4, "q"); c.px(wx + 2, wy + 4, "g"); c.px(wx + 1, wy + 4, "4")
  }
  const px = x + Math.round(w / 2) - 2
  c.rect(px, base - 10, 5, 10, "h"); c.vline(px + 2, base - 10, 10, "H"); c.px(px + 3, base - 5, "O")  // puerta
  c.hline(px - 1, base - 11, 7, "H")
  return [x + Math.round(w * 0.25), base - h - Math.round(alto * 0.6)]     // dónde va la chimenea
}
function chimenea(c, x, y) { c.rect(x, y, 3, 7, "S"); c.vline(x, y, 7, "t"); c.hline(x - 1, y, 5, "s") }
function arbol(c, x, y, r) {
  c.vline(x, y, 9, "h"); c.vline(x + 1, y, 9, "H"); c.px(x - 1, y + 8, "h"); c.px(x + 2, y + 8, "h")
  c.ellipse(x, y - 2, r, r - 1, "1")
  for (let i = 0; i < 12; i++) { const a = rnd(x + i, y) * 6.28, d = rnd(i, x) * (r - 2); c.ellipse(Math.round(x + Math.cos(a) * d), Math.round(y - 3 + Math.sin(a) * d * 0.8), 2, 2, i % 3 ? "2" : "3") }
  c.ellipse(x - 2, y - r + 1, 3, 1, "4"); c.px(x - 3, y - r + 1, "5"); c.px(x - 1, y - r, "5")
  c.ellipse(x + 1, y + 8, r - 1, 1, "2")                                  // sombra al pie
}
// El puesto del mercado: toldo a rayas, mostrador de tablas y hogazas.
function puesto(c, x, y) {
  c.vline(x, y, 12, "h"); c.vline(x + 15, y, 12, "h")
  for (let i = 0; i < 17; i++) { c.px(x - 1 + i, y, Math.floor(i / 2) % 2 ? "v" : "R"); c.px(x - 1 + i, y + 1, Math.floor(i / 2) % 2 ? "v" : "R") }
  for (let i = 0; i < 17; i += 2) c.px(x - 1 + i, y + 2, Math.floor(i / 2) % 2 ? "V" : "r")
  c.rect(x, y + 7, 16, 5, "j"); c.hline(x, y + 7, 16, "J"); c.hline(x, y + 11, 16, "H")
  for (let i = 0; i < 4; i++) { c.ellipse(x + 3 + i * 3, y + 6, 1, 1, "W"); c.px(x + 3 + i * 3, y + 5, "y") }
}
// El letrero de la taberna «La Pata de Pollo»: un muslo dorado. Aldric no lo encontraría gracioso.
function letreroTaberna(c, x, y) {
  c.hline(x, y, 9, "h"); c.vline(x + 2, y + 1, 2, "h"); c.vline(x + 7, y + 1, 2, "h")
  c.rect(x, y + 3, 10, 7, "H"); c.rect(x + 1, y + 4, 8, 5, "j")
  c.ellipse(x + 4, y + 6, 2, 1, "O"); c.px(x + 6, y + 6, "v"); c.px(x + 7, y + 5, "v"); c.px(x + 7, y + 7, "v")
}
sprite("pueblo", { w: W, h: H }, (c) => {
  // prado y el camino real, que sube serpenteando hasta el puente
  c.rect(0, 155, W, 61, "4")
  for (let y = 155; y < H; y++) for (let x = 0; x < W; x++) if (rnd(x * 2, y) < 0.06) c.px(x, y, rnd(y, x) < 0.5 ? "5" : "3")
  const via = (y) => { const t = (y - 155) / (H - 155); return [98 + Math.sin(t * 3.6) * 22 * t, 6 + t * 18] }
  for (let y = 155; y < H; y++) {
    const [cx, half] = via(y)
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const borde = x < cx - half + 2 || x > cx + half - 2
      c.px(x, y, borde ? "E" : (rnd(x, y) < 0.1 ? "E" : (rnd(y, x) < 0.12 ? "F" : "f")))
    }
    c.px(Math.round(cx - half) - 1, y, "3"); c.px(Math.round(cx + half) + 1, y, "3")
    if (y % 2 === 0 && y > 160) { c.px(Math.round(cx - half * 0.45), y, "E"); c.px(Math.round(cx + half * 0.45), y, "E") }  // rodadas
  }
  // valla de madera a la izquierda del camino: postes y travesaño
  let prev = null
  for (let y = 164; y <= 200; y += 6) {
    const [cx, half] = via(y), x = Math.round(cx - half) - 4
    c.vline(x, y - 5, 6, "h"); c.px(x, y - 6, "J")
    if (prev) c.line(prev[0], prev[1] - 3, x, y - 3, "j")
    prev = [x, y]
  }
  // casas a los lados del camino, enmarcando la capital
  const ch = []
  ch.push(casa(c, -8, 216, 34, 30, "v"))
  ch.push(casa(c, 28, 196, 24, 18, "V"))
  ch.push(casa(c, 146, 198, 26, 20, "v"))
  ch.push(casa(c, 170, 216, 34, 30, "V"))
  for (const [x, y] of ch) chimenea(c, x, y)
  // la tahona (cartel con una hogaza: el recurso se llama Pan) y la taberna
  c.vline(53, 182, 4, "h"); c.rect(51, 186, 9, 6, "H"); c.rect(52, 187, 7, 4, "J"); c.ellipse(55, 189, 2, 1, "y"); c.px(54, 188, "Y")
  letreroTaberna(c, 136, 180)
  // árboles, el pozo, el puesto, un pajar y barriles
  arbol(c, 64, 172, 8); arbol(c, 132, 168, 7); arbol(c, 14, 170, 6); arbol(c, 186, 168, 6)
  c.ellipse(116, 207, 7, 2, "s"); c.rect(109, 199, 15, 7, "t"); c.hline(109, 199, 15, "T"); c.rect(110, 201, 13, 4, "S")
  for (let x = 110; x < 123; x += 4) c.vline(x, 200, 6, "S")
  c.vline(110, 187, 12, "h"); c.vline(122, 187, 12, "h"); c.poly([107, 188, 125, 188, 116, 182], "R"); c.hline(107, 188, 19, "r")
  c.vline(116, 189, 6, "x"); c.rect(115, 195, 3, 3, "j")
  puesto(c, 66, 186)
  c.ellipse(36, 206, 7, 5, "W"); c.ellipse(36, 205, 6, 4, "y"); for (let i = 0; i < 8; i++) c.px(31 + i * 1.5, 202 + (i % 2), "Y")  // pajar
  c.rect(140, 204, 5, 7, "j"); c.hline(140, 205, 5, "h"); c.hline(140, 209, 5, "h"); c.rect(146, 205, 5, 6, "H"); c.hline(146, 207, 5, "h")
  // flores en el borde del prado
  for (let i = 0; i < 40; i++) { const x = Math.round(rnd(i, 7) * W), y = 176 + Math.round(rnd(i, 8) * 38); if (c.key(x, y) === "4" || c.key(x, y) === "5") c.px(x, y, i % 3 ? "q" : "g") }
})

// ================================================================ lo que se mueve
// La bandera del rey, con el lazo negro de luto, ondeando en 6 fotogramas.
anim("bandera", { w: 22, h: 12, frames: 6, fps: 8 }, (c) => {
  for (let x = 0; x < 20; x++) {
    const ola = Math.round(Math.sin(c.phase * Math.PI * 2 - x / 3.2) * (x / 10))
    for (let y = 0; y < 9; y++) {
      const k = y === 0 ? "p" : y === 8 ? "a" : (Math.sin(c.phase * Math.PI * 2 - x / 3.2 + 0.8) > 0.4 ? "p" : "P")
      c.px(x + 1, y + 1 + ola, k)
    }
    if (x > 6 && x < 12) { const yy = 3 + ola; c.px(x + 1, yy + 1, "O"); if (x === 7 || x === 9 || x === 11) c.px(x + 1, yy, "O"); c.px(x + 1, yy + 2, "o") }
  }
  c.rect(0, 0, 2, 3, "k"); c.px(2, 3, "k")                                 // lazo de luto en el asta
})

// Humo de chimenea (24 fotogramas).
anim("humo", { w: 16, h: 26, frames: 24, fps: 10 },
  plume(5, 24, "xXX", { every: 2, life: 24, rise: 20, wind: 0.3, size: [1, 3], seed: 3 }))

// Un pájaro que bate las alas (4 fotogramas).
anim("pajaro", { w: 7, h: 4, frames: 4, fps: 8 }, (c) => {
  const alas = [["k.....k", ".k...k.", "..k.k..", "...k..."], [".......", "kk...kk", "..kkk..", "...k..."], ["..kkk..", ".k.k.k.", "...k...", "......."], [".......", "kk...kk", "..kkk..", "...k..."]][c.frame]
  alas.forEach((row, y) => [...row].forEach((ch, x) => ch === "k" && c.px(x, y, "s")))
})

// La carreta del panadero con su burro, que sube por el camino (4 fotogramas).
anim("carreta", { w: 30, h: 16, frames: 4, fps: 6, outline: "k" }, (c) => {
  const f = c.frame
  // caja del carro con tablas y sacos de harina
  c.rect(12, 5, 16, 5, "j"); c.hline(12, 5, 16, "J"); c.hline(12, 9, 16, "H"); for (let x = 12; x < 28; x += 4) c.vline(x, 6, 3, "H")
  c.ellipse(16, 3, 3, 2, "v"); c.ellipse(22, 3, 3, 2, "V"); c.ellipse(19, 2, 2, 2, "v"); c.px(15, 2, "N"); c.px(19, 1, "N")
  c.line(4, 8, 12, 8, "h")                                                  // varas
  // rueda de radios que gira
  c.ellipse(20, 11, 3, 3, "h", true); c.px(20, 11, "J")
  const rad = [[0, 3, 0, -3], [2, 2, -2, -2], [3, 0, -3, 0], [2, -2, -2, 2]][f]
  c.line(20 + rad[0], 11 + rad[1], 20 + rad[2], 11 + rad[3], "H")
  // burro: cabeza gacha, orejas largas, cola y patas que se alternan
  c.rect(3, 4, 8, 4, "t"); c.hline(3, 4, 8, "T"); c.hline(3, 7, 8, "S")
  c.rect(0, 3, 3, 3, "t"); c.px(0, 5, "S"); c.px(1, 1, "T"); c.px(1, 2, "T"); c.px(2, 0, "T"); c.px(2, 1, "T"); c.px(1, 4, "k")
  c.px(11, 4, "S"); c.px(12, 5, "S")
  const L = [[3, 4, 9, 10], [4, 3, 10, 9], [3, 4, 9, 10], [2, 3, 8, 9]][f]
  c.vline(L[0], 8, 4, "S"); c.vline(L[1] + 1, 8, 4, "t"); c.vline(L[2], 8, 4, "S"); c.vline(L[3], 8, 4, "t")
})

// Un aldeano que camina (4 fotogramas).
anim("aldeano", { w: 7, h: 13, frames: 4, fps: 6, outline: "k" }, (c) => {
  const f = c.frame, bob = f % 2
  c.rect(2, 1 + bob, 3, 3, "F"); c.hline(2, 1 + bob, 3, "e")
  c.rect(1, 4 + bob, 5, 5, "b"); c.vline(1, 4 + bob, 5, "B")
  c.px(3, 6 + bob, "W")
  const pasos = [[2, 4], [3, 3], [4, 2], [3, 3]][f]
  c.vline(pasos[0], 9 + bob, 3 - bob, "e"); c.vline(pasos[1], 9 + bob, 3 - bob, "E")
  c.px(5, 5 + bob, "F"); c.rect(5, 6 + bob, 2, 2, "j")
})

// Una rata que cruza el camino (2 fotogramas): las ratas de Aldricia nunca descansan.
anim("rata", { w: 9, h: 4, frames: 2, fps: 10 }, (c) => {
  const f = c.frame
  c.ellipse(4, 2, 3, 1, "S"); c.px(7, 1, "S"); c.px(8, 2, "t"); c.px(7, 0, "t")
  c.hline(0, 2, 2, "t"); c.px(0, 1 + f, "t")
  c.px(3 + f, 3, "s"); c.px(5 - f, 3, "s")
})

// El fantasma de Aldric, que de noche flota junto a la torre (6 fotogramas, ida y vuelta).
anim("fantasma", { w: 16, h: 18, frames: 6, fps: 6, dir: "pingpong" }, (c) => {
  const b = Math.round(Math.sin(c.phase * Math.PI) * 2)
  c.ellipse(7, 7 + b, 5, 6, "M"); c.rect(2, 7 + b, 11, 7, "M")
  for (let x = 2; x < 13; x++) c.px(x, 14 + b + ((x + c.frame) % 3 === 0 ? 1 : 0), "M")
  c.ellipse(6, 6 + b, 3, 4, "N")
  c.px(5, 6 + b, "l"); c.px(9, 6 + b, "l"); c.hline(6, 9 + b, 3, "L")
  c.hline(4, 2 + b, 7, "O"); c.px(4, 1 + b, "O"); c.px(7, 0 + b, "O"); c.px(10, 1 + b, "O")
  c.px(13, 9 + b, "M"); c.ellipse(14, 7 + b, 1, 2, "v"); c.px(14, 5 + b, "N")                    // el muslo de pollo, para siempre
})

// La corona del título: cinco puntas con perlas, banda con piedras de las casas.
sprite("corona", { w: 26, h: 18, outline: "k" }, (c) => {
  for (const [x, alto, ancho] of [[3, 7, 3], [8, 9, 3], [13, 12, 4], [18, 9, 3], [23, 7, 3]]) {
    for (let y = 0; y < alto; y++) {
      const half = Math.max(0, Math.round(ancho * (1 - y / alto)))
      for (let xx = x - half; xx <= x + half; xx++) c.px(xx, 12 - y, xx < x ? "g" : xx > x ? "o" : "O")
    }
    c.ellipse(x, 12 - alto - 1, 1, 1, "g"); c.px(x, 12 - alto - 2, "n")
  }
  c.rect(1, 11, 25, 6, "O"); c.hline(1, 11, 25, "g"); c.hline(1, 16, 25, "o"); c.vline(1, 11, 6, "g"); c.vline(25, 11, 6, "o")
  c.rect(5, 13, 2, 2, "9"); c.px(5, 13, "q"); c.rect(12, 13, 3, 2, "8"); c.px(12, 13, "B"); c.rect(20, 13, 2, 2, "0"); c.px(20, 13, "4")
  for (const x of [3, 9, 17, 23]) c.px(x, 14, "g")
})
anim("brillo", { w: 7, h: 7, frames: 8, fps: 10 }, (c) => {
  const r = [0, 1, 2, 3, 2, 1, 0, 0][c.frame]
  if (!r) return
  c.hline(3 - r, 3, r * 2 + 1, "g"); c.vline(3, 3 - r, r * 2 + 1, "g"); c.px(3, 3, "n")
})

// ================================================================ la portada entera, para revisarla
scene("portada", { w: W, h: H + 24, bg: "M" },
  layer("cielo", (c) => { c.grad(0, 0, W, 130, "LmM", "v") }),
  layer("lejos", stamp("lejos", 0, 24)),
  layer("colinas", stamp("colinas", 0, 24), stamp("aspas", 21, 137)),
  layer("capital", stamp("capital", 0, 24), stamp("bandera", 99, 49)),
  layer("humo", stamp("humo", 0, 162), stamp("humo", 26, 172), stamp("humo", 147, 174), stamp("humo", 172, 172)),
  layer("pueblo", stamp("pueblo", 0, 24)),
  layer("vida", stamp("carreta", 104, 208), stamp("aldeano", 82, 192), stamp("rata", 92, 232),
    stamp("pajaro", 30, 60), stamp("pajaro", 40, 66, { frame: 2 }), stamp("pajaro", 150, 50, { frame: 1 })),
)
