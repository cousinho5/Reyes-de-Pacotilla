// Vista del castillo (bloque 2): tu castillo de frente, en su loma, con los cinco edificios alrededor.
// La escena mide 195x136 y se ve al doble en el móvil (390x272). Cada pieza es un dibujo aparte para
// que el juego la monte: el fondo, el castillo en sus 5 etapas y cada edificio en sus niveles.
// El color de la casa va en las letras 7 (claro), 8 (oscuro) y 9 (brillo): el juego las cambia por
// los de cada casa. La luz viene de la izquierda, como en el mapa y en la portada.
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js shot docs/maquetas/bloque2/pxl/castillo.px.js escena
const W = 195, H = 136

pal({
  k: "#1c1410",                                             // contorno (el del mapa)
  1: "#22401f", 2: "#365f2b", 3: "#4f8035", 4: "#73a443", 5: "#9fc558", 6: "#c9df7e", // hierba
  e: "#45291a", E: "#694328", f: "#8f633b", F: "#b98c58",   // tierra, camino
  w: "#71500f", W: "#ad8126", y: "#dcb446", Y: "#f3da82",   // trigo
  s: "#36333d", S: "#57535e", t: "#827d8a", T: "#aaa5b1", u: "#d4d0d9", n: "#ffffff", // piedra
  h: "#3a2213", H: "#663c1f", j: "#956132", J: "#c18849",   // madera
  r: "#5f1f15", R: "#9c3626", q: "#cf5639",                 // tejas
  v: "#efe6cf", V: "#c2b597",                               // revoque, lona
  z: "#2a3550", Z: "#4a6a9a",                               // cristal
  o: "#a97e14", O: "#e8b83a", g: "#fbe39a",                 // oro, antorchas
  l: "#5d6f8f", L: "#7d8fae", m: "#a3b3cc", M: "#c9d4e3", N: "#eef3f8", // montes lejanos, cielo, nieve
  b: "#1f5384", B: "#3477ae", c: "#6eb0df", C: "#c8e8ff",   // agua
  a: "#4a4038", A: "#6b5d50", i: "#8c7b69", I: "#b09d86",   // roca de la montaña
  x: "#e8e0d0", X: "#b8ab95",                               // humo, polvo
  G: "#2f6b4a", Q: "#4f9a6a",                               // contraventanas
  7: "#b3291d", 8: "#7a1a12", 9: "#e0533f",                 // color de la casa (rojo de muestra)
})
ramps("eEfF", "wWyY", "sStTun", "hHjJ", "rRq", "Vv", "zZ", "oOg", "lLmMN", "bBcC", "aAiI", "Xx", "GQ", "879")
ramps("123456")

// Ruido determinista para que nada salga en fila.
const rnd = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }

// ================================================================ piezas comunes
// Sillería: hiladas de 4 px con juntas alternas; la cara del sol (izquierda) más clara.
function sillares(c, x, y, w, h, claro = "T", medio = "t", oscuro = "S") {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const fila = Math.floor((yy - y) / 4), junta = (yy - y) % 4 === 3 || (xx - x + (fila % 2) * 4) % 8 === 0
    const luz = xx < x + 2 ? claro : xx > x + w - 3 ? oscuro : medio
    c.px(xx, yy, junta ? (luz === claro ? medio : oscuro) : luz)
  }
}
function almenas(c, x, y, w, k = "t") { for (let i = 0; i < w; i += 3) c.rect(x + i, y - 2, 2, 2, k) }
// Tejado cónico de pizarra o de teja con hiladas y una bola dorada en la punta.
function cono(c, cx, base, r, alto, teja = ["q", "R", "r"]) {
  for (let yy = 0; yy < alto; yy++) {
    const half = Math.round((r * (alto - yy)) / alto)
    for (let x = cx - half; x <= cx + half; x++) {
      const lado = x < cx - half / 3 ? teja[0] : x > cx + half / 2 ? teja[2] : teja[1]
      c.px(x, base - yy, (yy % 3 === 2 && (x + yy) % 2) ? teja[2] : lado)
    }
  }
  c.hline(cx - r - 1, base + 1, r * 2 + 3, teja[2])
  c.px(cx, base - alto, "O")
}
function aspillera(c, x, y, alta) { c.vline(x, y, alta, "s"); c.px(x, y - 1, "S") }
function ventana(c, x, y, alta) { c.rect(x, y, 2, alta, "z"); c.px(x, y, "Z"); c.hline(x - 1, y + alta, 4, "T"); c.px(x, y - 1, "z") }
// Mástil con bandera de la casa (quieta; en el juego ondea).
function bandera(c, x, y, largo = 7, alto = 5) {
  c.vline(x, y, largo + 6, "h"); c.px(x, y - 1, "O")
  for (let xx = 1; xx <= largo; xx++) for (let yy = 0; yy < alto; yy++) {
    const ola = Math.round(Math.sin(xx / 2.2) * 0.8)
    c.px(x + xx, y + 1 + yy + ola, yy === 0 ? "9" : yy === alto - 1 ? "8" : "7")
  }
}
// Tapiz con el color de la casa colgado del adarve.
function tapiz(c, x, y, alto = 9) {
  c.hline(x - 1, y, 7, "o")
  c.rect(x, y + 1, 5, alto, "7"); c.vline(x, y + 1, alto, "9"); c.vline(x + 4, y + 1, alto, "8")
  c.px(x + 1, y + alto + 1, "7"); c.px(x + 3, y + alto + 1, "7")
  c.px(x + 2, y + 3, "O"); c.hline(x + 1, y + 4, 3, "O"); c.px(x + 2, y + 5, "O")
}
// Repostero: la barra dorada de la que cuelga el escudo de la casa en el torreón. El escudo lo pone
// el juego (16x18, el de cada casa, de shield.ts) con su esquina de arriba a la izquierda en
// (cx - 8, y); en esta maqueta va uno de muestra, en la escena, con ESCUDO_EN.
function escudo(c, cx, y) {
  c.hline(cx - 9, y - 1, 19, "o"); c.px(cx - 10, y - 1, "O"); c.px(cx + 10, y - 1, "O")
  c.px(cx - 5, y - 2, "o"); c.px(cx + 5, y - 2, "o"); c.px(cx, y - 3, "o"); c.line(cx - 5, y - 2, cx, y - 3, "o"); c.line(cx + 5, y - 2, cx, y - 3, "o")
}
/** Dónde va el escudo en cada etapa (esquina de arriba a la izquierda, en el lienzo del castillo con su contorno). */
const ESCUDO_EN = { 1: 38, 2: 49, 3: 49, 4: 55, 5: 67 }   // filas por encima de la base (CB)
// Puerta en arco con rastrillo a medio subir.
function puerta(c, cx, base, w, h, madera = false) {
  const x = cx - Math.floor(w / 2)
  c.rect(x, base - h, w, h, "s"); c.ellipse(cx, base - h, Math.floor(w / 2), Math.floor(w / 3), "s")
  if (madera) {
    for (let xx = x; xx < x + w; xx++) for (let yy = base - h + 1; yy < base; yy++) c.px(xx, yy, (xx - x) % 3 === 2 ? "h" : "H")
    c.hline(x, base - h + 3, w, "h"); c.hline(x, base - 3, w, "h")
    return
  }
  c.ellipse(cx, base - h, Math.floor(w / 2) + 1, Math.floor(w / 3) + 1, "T", true)
  for (let xx = x + 1; xx < x + w; xx += 3) c.vline(xx, base - h - 2, Math.round(h * 0.55), "h")
  c.hline(x, base - h + 1, w, "h"); c.hline(x, base - h + Math.round(h * 0.45), w, "h")
}
function antorcha(c, x, y) { c.px(x, y, "g"); c.px(x, y - 1, "O"); c.vline(x, y + 1, 2, "h") }
// Torre redonda: sillería, almenas o tejado, ventanas.
function torre(c, x, base, w, h, opciones = {}) {
  if (opciones.liso) { sillares(c, x, base - h, w, h); for (let yy = base - h; yy < base; yy++) c.px(x + w - 1, yy, "s"); almenas(c, x, base - h, w); if (opciones.bandera) bandera(c, x + Math.floor(w / 2), base - h - 13); return }
  sillares(c, x, base - h, w, h)
  for (let yy = base - h; yy < base; yy++) { c.px(x + w - 1, yy, "s") }   // sombra del lado derecho
  if (opciones.tejado) cono(c, x + Math.floor(w / 2), base - h - 1, Math.floor(w / 2) + 2, opciones.tejado, opciones.teja)
  else almenas(c, x, base - h, w)
  if (opciones.bandera && opciones.tejado) bandera(c, x + Math.floor(w / 2), base - h - opciones.tejado - 10)
  else if (opciones.bandera) bandera(c, x + Math.floor(w / 2), base - h - 13)
  aspillera(c, x + Math.floor(w / 2), base - h + 5, 4)
  if (h > 22) aspillera(c, x + Math.floor(w / 2), base - h + 16, 4)
}

// Escudo de muestra para la maqueta (español, partido, con una torre dorada).
sprite("escudo_muestra", { w: 16, h: 18 }, (c) => {
  for (let y = 0; y < 18; y++) for (let x = 0; x < 16; x++) {
    const dentro = y < 11 || Math.hypot(x - 7.5, y - 10) < 8
    if (!dentro) continue
    const borde = x === 0 || x === 15 || y === 0 || (y >= 11 && Math.hypot(x - 7.5, y - 10) > 7)
    c.px(x, y, borde ? "k" : x < 8 ? (y < 2 || x < 2 ? "9" : "7") : "8")
  }
  c.rect(6, 5, 4, 7, "O"); c.rect(5, 4, 6, 2, "O"); c.px(5, 3, "O"); c.px(7, 3, "O"); c.px(10, 3, "O"); c.vline(9, 6, 6, "o"); c.rect(7, 9, 2, 3, "k")
})

// ================================================================ el castillo, en 5 etapas
// Todas en un lienzo de 104x112 con la base en la fila de abajo y el centro en x = 52.
const CW = 104, CH = 112, CX = 52, CB = 108
// Etapa 1: una torre de piedra con cadalso de madera y una empalizada. De pacotilla.
function etapa1(c) {
  // empalizada: estacas afiladas
  for (let x = CX - 30; x <= CX + 30; x += 2) {
    const alto = 12 + Math.round(rnd(x, 1) * 2)
    c.vline(x, CB - alto, alto, (x / 2) % 2 ? "j" : "H"); c.px(x, CB - alto - 1, "J")
  }
  c.hline(CX - 30, CB - 8, 61, "h"); c.hline(CX - 30, CB - 4, 61, "h")
  // torre del homenaje: piedra basta abajo, cadalso de madera arriba con tejadillo
  sillares(c, CX - 9, CB - 40, 18, 40, "I", "i", "A")
  for (let x = CX - 11; x <= CX + 11; x++) for (let y = CB - 48; y < CB - 40; y++) c.px(x, y, (x - CX) % 3 === 0 ? "h" : y === CB - 48 ? "J" : "j")
  for (let yy = 0; yy < 7; yy++) c.hline(CX - 12 + yy, CB - 49 - yy, 25 - yy * 2, yy % 2 ? "H" : "j")
  bandera(c, CX, CB - 68)
  escudo(c, CX, CB - 38)
  // puerta de madera de la empalizada
  puerta(c, CX, CB, 10, 11, true)
  // banderín clavado en la empalizada y un cubo al lado
  c.vline(CX - 24, CB - 22, 10, "h"); c.hline(CX - 23, CB - 22, 4, "7"); c.hline(CX - 23, CB - 21, 3, "8")
}
// Etapa 2: torre de piedra con almenas, muralla baja y dos torrecillas.
function etapa2(c) {
  torre(c, CX - 11, CB - 18, 22, 34, { bandera: true, liso: true })
  escudo(c, CX, CB - 49)
  sillares(c, CX - 30, CB - 20, 60, 20); almenas(c, CX - 30, CB - 20, 60, "T"); c.hline(CX - 30, CB - 20, 60, "T")
  torre(c, CX - 36, CB, 11, 26); torre(c, CX + 25, CB, 11, 26)
  puerta(c, CX, CB, 10, 12, true)
}
// Etapa 3: como el castillo del mapa. Torreón almenado, muralla con adarve y torres con tejado cónico.
function etapa3(c) {
  sillares(c, CX - 13, CB - 52, 26, 30); almenas(c, CX - 13, CB - 52, 26)
  bandera(c, CX, CB - 66, 9, 6)
  ventana(c, CX - 11, CB - 46, 4); ventana(c, CX + 9, CB - 46, 4); escudo(c, CX, CB - 49)
  sillares(c, CX - 32, CB - 24, 64, 24); almenas(c, CX - 32, CB - 24, 64, "T"); c.hline(CX - 32, CB - 24, 64, "T")
  c.hline(CX - 32, CB - 21, 64, "S")
  torre(c, CX - 42, CB, 13, 36, { tejado: 12, bandera: true }); torre(c, CX + 29, CB, 13, 36, { tejado: 12, bandera: true })
  puerta(c, CX, CB, 12, 13)
  antorcha(c, CX - 10, CB - 10); antorcha(c, CX + 10, CB - 10)
}
// Etapa 4: torreón con tejado, puerta entre dos torres y tapices en la muralla.
function etapa4(c) {
  sillares(c, CX - 14, CB - 58, 28, 34); almenas(c, CX - 14, CB - 58, 28)
  torre(c, CX - 5, CB - 58, 10, 10, { tejado: 12, bandera: true })
  ventana(c, CX - 12, CB - 50, 5); ventana(c, CX + 10, CB - 50, 5); escudo(c, CX, CB - 55)
  sillares(c, CX - 38, CB - 26, 76, 26); almenas(c, CX - 38, CB - 26, 76, "T"); c.hline(CX - 38, CB - 26, 76, "T")
  c.hline(CX - 38, CB - 23, 76, "S")
  tapiz(c, CX - 30, CB - 22); tapiz(c, CX + 25, CB - 22)
  torre(c, CX - 48, CB, 14, 40, { tejado: 14, bandera: true }); torre(c, CX + 34, CB, 14, 40, { tejado: 14, bandera: true })
  torre(c, CX - 15, CB, 9, 32, { tejado: 9 }); torre(c, CX + 6, CB, 9, 32, { tejado: 9 })
  puerta(c, CX, CB, 12, 14)
  antorcha(c, CX - 18, CB - 12); antorcha(c, CX + 17, CB - 12)
}
// Etapa 5: doble muralla. La de dentro, alta, con el torreón; la de fuera, baja, con sus torres.
function etapa5(c) {
  // recinto de dentro
  sillares(c, CX - 15, CB - 70, 30, 34); almenas(c, CX - 15, CB - 70, 30)
  torre(c, CX - 6, CB - 70, 12, 10, { tejado: 14, bandera: true })
  ventana(c, CX - 13, CB - 62, 5); ventana(c, CX + 11, CB - 62, 5); escudo(c, CX, CB - 67)
  sillares(c, CX - 34, CB - 38, 68, 16); almenas(c, CX - 34, CB - 38, 68, "T"); c.hline(CX - 34, CB - 38, 68, "T")
  torre(c, CX - 40, CB - 22, 12, 30, { tejado: 12, bandera: true }); torre(c, CX + 28, CB - 22, 12, 30, { tejado: 12, bandera: true })
  tapiz(c, CX - 26, CB - 36, 7); tapiz(c, CX + 21, CB - 36, 7)
  // muralla de fuera
  sillares(c, CX - 46, CB - 18, 92, 18); almenas(c, CX - 46, CB - 18, 92, "T"); c.hline(CX - 46, CB - 18, 92, "T")
  c.hline(CX - 46, CB - 15, 92, "S")
  torre(c, CX - 52, CB, 12, 28, { tejado: 10 }); torre(c, CX + 40, CB, 12, 28, { tejado: 10 })
  torre(c, CX - 14, CB, 9, 24, { tejado: 8 }); torre(c, CX + 5, CB, 9, 24, { tejado: 8 })
  puerta(c, CX, CB, 10, 12)
  antorcha(c, CX - 18, CB - 8); antorcha(c, CX + 18, CB - 8)
  // estandartes grandes en las torres de fuera
  tapiz(c, CX - 49, CB - 20, 8); tapiz(c, CX + 42, CB - 20, 8)
}
const ETAPAS = [etapa1, etapa2, etapa3, etapa4, etapa5]
ETAPAS.forEach((fn, i) => sprite(`castillo_${i + 1}`, { w: CW, h: CH, outline: "k", pivot: "bottom" }, (c) => fn(c)))

// ================================================================ los edificios (de muestra, nivel 3)
// Cada uno en su lienzo, con la base abajo en el centro. Lo que es suelo (campos, roca, plaza) va
// en una capa sin contorno para que se funda con el prado; el contorno solo rodea lo construido.
// Tejado a dos aguas de teja, de frente: hiladas con juntas, la mitad del sol más clara.
function tejado(c, x, y, w, alto, k = ["q", "R", "r"]) {
  for (let yy = 0; yy < alto; yy++) {
    const r = (w / 2) * ((yy + 1) / alto), cx = x + w / 2
    for (let xx = Math.round(cx - r); xx < Math.round(cx + r); xx++) {
      const junta = yy % 3 === 2 || ((xx + (Math.floor(yy / 3) % 2) * 2) % 4 === 0 && yy % 3 === 1)
      c.px(xx, y - alto + yy, junta ? k[2] : xx < cx ? k[0] : k[1])
    }
  }
  c.hline(x - 1, y, w + 2, k[2])
}
// Campo de trigo en surcos que bajan hacia nosotros.
function campo(c, x, y, w, h, inclina = 0) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const px = x + xx + Math.round(inclina * yy)
    const surco = (xx + Math.round(yy * 0.6)) % 4
    c.px(px, y + yy, surco === 0 ? "w" : surco === 1 ? "W" : yy % 5 === 0 ? "Y" : "y")
  }
}
// Granja, nivel 3: granero de piedra con tejado de teja, almiar y campos de trigo.
sprite("granja_3", { w: 62, h: 38, outline: "k", pivot: "bottom" },
  layer("campos", { outline: false }, (c) => {
    campo(c, 4, 22, 24, 15, -0.2); campo(c, 31, 26, 28, 11, 0.2)
  }),
  (c) => {
    sillares(c, 20, 10, 22, 14, "u", "T", "t")
    tejado(c, 18, 10, 26, 9)
    c.rect(28, 15, 7, 9, "H"); c.vline(31, 15, 9, "h"); c.line(28, 15, 34, 23, "h")
    c.rect(30, 4, 3, 2, "z")
    c.ellipse(52, 23, 6, 5, "W"); c.ellipse(51, 21, 4, 3, "y"); c.px(49, 20, "Y"); c.px(52, 18, "Y")
    c.vline(52, 14, 4, "h")
    // espantapájaros
    c.vline(12, 22, 8, "h"); c.hline(9, 24, 7, "H"); c.rect(11, 20, 3, 2, "V"); c.hline(10, 19, 5, "W")
  })
// Aserradero, nivel 3: sierra de agua con rueda en el arroyo, troncos apilados.
sprite("aserradero_3", { w: 50, h: 36, outline: "k", pivot: "bottom" }, (c) => {
  c.rect(14, 16, 26, 18, "j")
  for (let x = 14; x < 40; x += 3) c.vline(x, 16, 18, "H")
  c.hline(14, 16, 26, "J"); c.rect(24, 23, 7, 11, "h"); c.vline(27, 23, 11, "H")
  for (let yy = 0; yy < 8; yy++) c.hline(12 + yy, 15 - yy, 30 - yy * 2, yy % 2 ? "H" : "h")
  c.hline(11, 16, 32, "h")
  // rueda de agua
  c.ellipse(9, 26, 8, 8, "H", true); c.ellipse(9, 26, 6, 6, "j", true)
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.line(9, 26, Math.round(9 + Math.cos(a) * 7), Math.round(26 + Math.sin(a) * 7), "h") }
  c.px(9, 26, "J")
  // troncos apilados
  for (const [tx, ty] of [[40, 30], [40, 27], [42, 24]]) { c.rect(tx, ty, 8, 3, "H"); c.hline(tx, ty, 8, "j"); c.ellipse(tx + 8, ty + 1, 1, 1, "J") }
})
// Cantera, nivel 3: un corte en la ladera en tres bancadas, andamio y pluma de madera.
// Cada bancada: pared cortada (en sombra, con las marcas del pico) y repisa clara encima.
function bancadas(c, cx, top, n, ancho, alto = 8) {
  for (let i = 0; i < n; i++) {
    const half = ancho / 2 - i * 6, y0 = top + i * alto
    for (let y = y0; y < y0 + alto; y++) for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const dx = (x - cx) / half
      if (i === 0 && y < y0 + Math.round(dx * dx * 5)) continue                  // borde de arriba en arco
      const repisa = y < y0 + 2
      let k = repisa ? (y === y0 ? "u" : "I") : "A"
      if (!repisa && dx < -0.82) k = "a"                                         // pared de la izquierda, en sombra
      if (!repisa && dx > 0.8) k = "i"                                           // pared de la derecha, al sol
      if (!repisa && k === "A" && (x * 3 + i) % 5 === 0 && y > y0 + 3) k = "a"   // marcas del pico
      c.px(x, y, k)
    }
    if (i > 0) c.hline(Math.round(cx - half) + 1, y0 + 2, Math.round(half * 2) - 1, "a")  // sombra bajo la repisa
  }
}
sprite("cantera_3", { w: 50, h: 34, outline: "k", pivot: "bottom" },
  layer("roca", { outline: false }, (c) => { bancadas(c, 25, 5, 3, 48, 9) }),
  (c) => {
    c.rect(28, 28, 6, 5, "T"); c.hline(28, 28, 6, "u"); c.rect(35, 29, 5, 4, "t"); c.hline(35, 29, 5, "T")
    for (const x of [8, 16]) c.vline(x, 9, 24, "H")
    c.hline(7, 14, 11, "j"); c.hline(7, 23, 11, "j"); c.line(8, 23, 16, 14, "h")
    c.vline(42, 4, 20, "h"); c.line(42, 4, 30, 8, "H"); c.vline(30, 9, 7, "S"); c.rect(29, 16, 3, 2, "T")
  })
// Mina, nivel 3: boca entibada en la ladera, castillete de madera y vagoneta con mineral.
sprite("mina_3", { w: 50, h: 38, outline: "k", pivot: "bottom" },
  layer("ladera", { outline: false }, (c) => {
    for (let y = 12; y < 38; y++) for (let x = 20; x < 50; x++) if (y > 40 - (x - 20) * 1.2) c.px(x, y, rnd(x, y) < 0.12 ? "A" : "i")
    c.hline(16, 37, 30, "F")
  }),
  (c) => {
    c.rect(27, 21, 12, 15, "k"); c.rect(25, 19, 2, 17, "j"); c.rect(39, 19, 2, 17, "j"); c.rect(24, 17, 18, 3, "H"); c.hline(24, 17, 18, "J")
    c.line(4, 36, 12, 6, "H"); c.line(20, 36, 12, 6, "H"); c.hline(7, 26, 11, "h"); c.hline(9, 17, 7, "h"); c.line(6, 26, 15, 17, "h")
    c.ellipse(12, 6, 3, 3, "h", true); c.px(12, 6, "J"); c.vline(12, 9, 14, "S")
    c.hline(18, 36, 24, "S"); c.rect(30, 30, 9, 5, "S"); c.hline(30, 30, 9, "t"); c.ellipse(34, 29, 3, 1, "a"); c.px(33, 28, "T"); c.px(35, 28, "o")
    c.px(31, 35, "s"); c.px(37, 35, "s")
  })
// Mercado, nivel 3: plaza empedrada con tres puestos de toldo a rayas.
function puesto(c, x, y, k1, k2) {
  c.vline(x, y, 11, "h"); c.vline(x + 13, y, 11, "h")
  for (let i = 0; i < 15; i++) { c.px(x - 1 + i, y, Math.floor(i / 2) % 2 ? k2 : k1); c.px(x - 1 + i, y + 1, Math.floor(i / 2) % 2 ? k2 : k1) }
  for (let i = 0; i < 15; i += 2) c.px(x - 1 + i, y + 2, Math.floor(i / 2) % 2 ? "V" : k1)
  c.rect(x, y + 6, 14, 5, "j"); c.hline(x, y + 6, 14, "J"); c.hline(x, y + 10, 14, "H")
}
sprite("mercado_3", { w: 56, h: 30, outline: "k", pivot: "bottom" },
  layer("plaza", { outline: false }, (c) => {
    c.ellipse(28, 23, 27, 6, "f")
    for (let y = 17; y < 30; y++) for (let x = 0; x < 56; x++) if (c.key(x, y) === "f" && (x + (y % 2) * 2) % 4 === 0) c.px(x, y, "E")
    for (let y = 17; y < 30; y++) for (let x = 0; x < 56; x++) if (c.key(x, y) === "f" && (x * 7 + y) % 5 === 0) c.px(x, y, "F")
  }),
  (c) => {
    puesto(c, 3, 10, "R", "v"); puesto(c, 21, 5, "Z", "v"); puesto(c, 39, 11, "G", "v")
    for (let i = 0; i < 3; i++) { c.ellipse(7 + i * 3, 15, 1, 1, "W"); c.px(7 + i * 3, 14, "y") }
    c.rect(24, 10, 8, 1, "O"); c.rect(25, 9, 6, 1, "g")
    c.rect(42, 16, 4, 1, "T"); c.rect(47, 16, 3, 1, "S")
    c.ellipse(18, 25, 2, 2, "V"); c.ellipse(37, 26, 2, 2, "V"); c.px(17, 23, "h"); c.px(36, 24, "h")
  })

// ================================================================ el fondo
// Nubes: tiras pálidas con la base plana, la parte de arriba más clara.
function nube(c, x, y, w) {
  for (let i = 0; i < w; i += 3) { const r = 2 + Math.round(Math.sin((i / w) * Math.PI) * 3 + rnd(i, x) * 1.5); c.ellipse(x + i, y - r + 2, 3, r, "N") }
  c.hline(x - 2, y + 2, w + 3, "M"); c.hline(x, y + 1, w - 1, "M")
}
// Abeto pequeño para el pie de la montaña y la linde del bosque.
function abeto(c, x, base, alto) {
  for (let yy = 0; yy < alto; yy++) { const r = Math.round((yy / alto) * (alto / 3)); c.hline(x - r, base - alto + yy, r * 2 + 1, yy % 3 === 2 ? "1" : "2"); c.px(x - r, base - alto + yy, "3") }
  c.px(x, base, "h")
}
// Árbol de copa redonda: masa oscura, montones con la cara del sol clara.
function arbol(c, x, y, r) {
  c.ellipse(x, y, r, r - 1, "1")
  for (let i = 0; i < 7; i++) { const a = rnd(x + i, y) * 6.28, d = rnd(i, x) * (r - 3); c.ellipse(Math.round(x + Math.cos(a) * d), Math.round(y - 1 + Math.sin(a) * d * 0.7), 2, 2, "2") }
  c.ellipse(x - 2, y - r + 2, 2, 1, "3"); c.px(x - 3, y - r + 2, "4")
}
// La montaña de la derecha: dos picos, la cara del sol clara, estratos y nieve en lo alto.
const PICOS = [[174, 14, 0.72], [138, 38, 0.95]]
const alturaPico = (x, p) => p[1] + Math.abs(x - p[0]) * p[2]
function picoDe(x) { return PICOS.reduce((a, p) => (alturaPico(x, p) < alturaPico(x, a) ? p : a)) }
sprite("fondo", { w: W, h: H }, (c) => {
  c.grad(0, 0, W, 70, "LmMN", "v")
  nube(c, 14, 18, 26); nube(c, 92, 10, 18); nube(c, 120, 30, 14)
  // cordillera lejana, en la bruma
  for (let x = 0; x < W; x++) {
    const v = Math.sin(x / 19 + 1) * 0.5 + Math.sin(x / 8.3) * 0.25
    const pico = Math.max(0, 1 - Math.abs((x % 64) - 32) / 20)
    const top = Math.round(54 - 12 * (0.5 + 0.4 * v + 0.6 * pico * pico))
    for (let y = top; y < 74; y++) c.px(x, y, y < top + 3 && pico > 0.4 ? "N" : y < top + 4 ? "M" : "m")
  }
  for (let x = 0; x < W; x++) {
    const top = Math.round(62 - 6 * (0.5 + Math.sin(x / 13 + 2) * 0.4 + Math.sin(x / 5) * 0.15))
    for (let y = top; y < 76; y++) c.px(x, y, y < top + 1 ? "L" : "l")
  }
  // colinas y prado
  for (let x = 0; x < W; x++) {
    const top = Math.round(72 + Math.sin(x / 26) * 3 + Math.sin(x / 11) * 1.2)
    for (let y = top; y < H; y++) c.px(x, y, y < top + 1 ? "4" : "3")
  }
  // la montaña de la derecha, que baja hasta el prado
  for (let x = 104; x < W; x++) {
    const p = picoDe(x), top = Math.round(alturaPico(x, p) + Math.sin(x / 3.1) * 0.8)
    const pie = 100 - Math.max(0, 128 - x) * 0.9
    for (let y = top; y < pie; y++) {
      const sol = x < p[0] - (y - top) * 0.1
      let k = sol ? (y > top + 26 || (y > top + 23 && (x + y) % 2) ? "i" : "I") : x < p[0] + 3 ? "i" : "A"
      if (y > pie - 3) k = "2"
      if (p === PICOS[0] && y < 24 + Math.round(Math.sin(x / 2.3) * 1.5 + Math.sin(x / 5.1) * 2)) k = sol ? "N" : "M"
      c.px(x, y, k)
    }
  }
  // grietas y salientes: rayas cortas, oscuras bajo una arista clara
  for (let i = 0; i < 70; i++) {
    const x = 108 + Math.round(rnd(i, 21) * 86), y = Math.round(alturaPico(x, picoDe(x))) + 4 + Math.round(rnd(i, 22) * 50), len = 3 + Math.round(rnd(i, 23) * 4)
    for (let j = 0; j < len; j++) { const xx = x + j, yy = y + Math.round(j * 0.4); const k = c.key(xx, yy); if (k === "I" || k === "i" || k === "A" || k === "a") { c.px(xx, yy, k === "I" ? "i" : "a") } }
  }
  // abetos al pie de la montaña
  for (let i = 0; i < 12; i++) abeto(c, 112 + i * 7 + Math.round(rnd(i, 2) * 4), 92 + Math.round(rnd(i, 5) * 5), 9 + Math.round(rnd(i, 6) * 4))
  // el bosque de la izquierda, detrás del aserradero
  for (let i = 0; i < 18; i++) arbol(c, Math.round(i * 4.2 - 4 + rnd(i, 3) * 3), 70 + Math.round(rnd(i, 4) * 6) + (i % 2) * 3, 6 + Math.round(rnd(i, 9) * 2))
  for (let i = 0; i < 6; i++) abeto(c, 6 + i * 11, 84, 10 + (i % 3) * 2)
  // el arroyo del aserradero: baja del bosque y sale por la izquierda
  for (let y = 82; y < 106; y++) {
    const cx = 12 - (y - 82) * 0.5 + Math.sin(y / 3) * 1.2, half = 2 + (y - 82) * 0.08
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) c.px(x, y, (x + y) % 6 === 0 ? "C" : (x + y) % 3 === 0 ? "c" : "B")
    c.px(Math.round(cx - half) - 1, y, "2"); c.px(Math.round(cx + half) + 1, y, "4")
  }
  // la loma del castillo
  c.ellipse(98, 106, 68, 12, "4"); c.ellipse(96, 104, 60, 9, "5")
  // matas de hierba: dos píxeles claros sobre el verde, más en lo cercano
  for (let i = 0; i < 260; i++) {
    const x = Math.round(rnd(i, 11) * W), y = 86 + Math.round(Math.pow(rnd(i, 12), 0.7) * 48)
    if (c.key(x, y) === "3" && c.key(x + 1, y) === "3") { c.px(x, y, "4"); if (y > 110) c.px(x + 1, y - 1, "4") }
  }
  for (let i = 0; i < 80; i++) { const x = Math.round(rnd(i, 13) * W), y = 90 + Math.round(rnd(i, 14) * 44); if (c.key(x, y) === "3") c.px(x, y, "2") }
  // el camino desde la puerta hasta abajo, con rodadas
  for (let y = 102; y < H; y++) {
    const t = (y - 102) / (H - 102), cx = 98 + Math.sin(t * 3) * 6 * t, half = 4 + t * 9
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const borde = x < cx - half + 1.5 || x > cx + half - 1.5
      c.px(x, y, borde ? "E" : rnd(x, y) < 0.12 ? "F" : "f")
    }
    if (y % 2 === 0) { c.px(Math.round(cx - half * 0.45), y, "E"); c.px(Math.round(cx + half * 0.45), y, "E") }
  }
  // flores
  for (let i = 0; i < 60; i++) { const x = Math.round(rnd(i, 7) * W), y = 104 + Math.round(rnd(i, 8) * 30); if (c.key(x, y) === "3" || c.key(x, y) === "4") c.px(x, y, i % 3 ? "q" : "g") }
})

// ================================================================ la escena entera, para revisarla
// Sitios de cada pieza (pivote abajo en el centro): los usa también el juego.
const SITIOS = {
  castillo: [98, 104],
  aserradero: [30, 90],
  cantera: [166, 70],
  mina: [172, 108],
  granja: [32, 132],
  mercado: [150, 130],
}
function escena(nombre, etapa) {
  scene(nombre, { w: W, h: H, bg: "M" },
    layer("fondo", stamp("fondo", 0, 0)),
    layer("lejos", stamp("aserradero_3", ...SITIOS.aserradero), stamp("cantera_3", ...SITIOS.cantera)),
    layer("castillo", stamp(`castillo_${etapa}`, ...SITIOS.castillo),
      stamp("escudo_muestra", SITIOS.castillo[0] - 53 + 1 + CX - 8, SITIOS.castillo[1] - CH - 2 + 1 + CB - ESCUDO_EN[etapa])),
    layer("cerca", stamp("mina_3", ...SITIOS.mina), stamp("granja_3", ...SITIOS.granja), stamp("mercado_3", ...SITIOS.mercado)),
  )
}
escena("escena", 3)
for (let e = 1; e <= 5; e++) escena(`escena_${e}`, e)
sheet("etapas", ["castillo_1", "castillo_2", "castillo_3", "castillo_4", "castillo_5"], { pad: 4 })

// Lámina de revisión: las 5 etapas en fila sobre la loma, cada una con el color de otra casa.
const COLORES = [
  { 7: "#b3291d", 8: "#7a1a12", 9: "#e0533f" },  // gules
  { 7: "#1b3c80", 8: "#10264f", 9: "#3f68b8" },  // azur
  { 7: "#246b2a", 8: "#154119", 9: "#3f9446" },  // sinople
  { 7: "#a23c9e", 8: "#6a2367", 9: "#cc66c8" },  // púrpura
  { 7: "#a84e0f", 8: "#6e3108", 9: "#d87a34" },  // naranjado
]
scene("lamina", { w: 5 * 108 + 4, h: 120, bg: "M" },
  layer("suelo", rect(0, 108, 5 * 108 + 4, 12, "4"), rect(0, 112, 5 * 108 + 4, 8, "3")),
  layer("castillos", ...[1, 2, 3, 4, 5].flatMap((e) => [stamp(`castillo_${e}`, 56 + (e - 1) * 108, 112, { swap: COLORES[e - 1] }),
    stamp("escudo_muestra", 56 + (e - 1) * 108 - 53 + 1 + CX - 8, 112 - CH - 2 + 1 + CB - ESCUDO_EN[e], { swap: COLORES[e - 1] })])),
)
