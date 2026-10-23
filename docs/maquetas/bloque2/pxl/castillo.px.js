// Vista del castillo (bloque 2), segunda versión: tu castillo de frente, en su loma, con los cinco
// edificios alrededor, a media tarde. La escena mide 195x136 y se ve al doble en el móvil (390x272).
// Cada pieza es un dibujo aparte para que el juego la monte: el fondo, el castillo en sus 5 etapas y
// cada edificio en sus niveles.
// - El color de la casa va en las letras 7 (claro), 8 (oscuro) y 9 (brillo): el juego las cambia.
// - El escudo de la casa (16x18, de shield.ts) lo cuelga el juego del torreón: ESCUDO_EN.
// - La luz viene de arriba a la izquierda, cálida; las sombras son frías (violáceas).
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js shot docs/maquetas/bloque2/pxl/castillo.px.js escena
const W = 195, H = 136

pal({
  k: "#1a1220",                                                         // contorno
  // piedra del castillo, de la sombra fría a la cara del sol
  A: "#2b2638", B: "#433c52", C: "#625a6e", D: "#857b8c", E: "#a99ea6", F: "#cfc3c0", G: "#efe3d6",
  // teja
  r: "#47171f", R: "#73262a", q: "#a23d31", Q: "#cc5f3f", p: "#ec8f5e",
  // madera
  h: "#2c1914", H: "#4d2c1d", j: "#75462a", J: "#a26b3e", i: "#cf9a5f",
  // hierba, de lo hondo a lo que da el sol
  1: "#1b3326", 2: "#2a4f2f", 3: "#3f7134", 4: "#5f963d", 5: "#8bbd4f", 6: "#c3dd7c",
  // tierra y camino
  e: "#3f2820", f: "#64432d", g: "#8d6640", t: "#b8915e", T: "#dcc08b",
  // trigo
  w: "#7f5716", x: "#b9872a", X: "#e2bb4a", y: "#f6e08c",
  // cielo
  a: "#41609f", b: "#5f84c4", c: "#86a9da", d: "#aec8e6", n: "#d5e2ee", N: "#f4e8cf",
  // montes lejanos (bruma) y nieve
  l: "#6c7ca8", L: "#8899c2", m: "#a8b6d6", M: "#c8d2e8", u: "#f6f6ff", U: "#cfd5ec",
  // roca de la montaña
  s: "#3a3036", S: "#5a4b4f", v: "#80706c", V: "#a8978a", Y: "#d0c0a8",
  // agua
  z: "#1d4677", Z: "#2f69a6", P: "#5b9bd1", O: "#b4e0f4",
  // oro, fuego y ventanas encendidas
  o: "#8a5a12", K: "#d49a2a", I: "#f8d66a",
  // tela, lana, revoque
  W: "#efe6d2", 0: "#c4b496",
  // color de la casa (rojo de muestra)
  7: "#b3291d", 8: "#7a1a12", 9: "#e0533f",
})
ramps("ABCDEFG", "rRqQp", "hHjJi", "123456", "efgtT", "wxXy", "abcdnN", "lLmMuU", "sSvVY", "zZPO", "oKI", "0W", "879")

// ================================================================ utilidades
const rnd = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
const PIEDRA = "ABCDEFG", TEJA = "rRqQp", MADERA = "hHjJi", TIERRA = "efgtT", ROCA = "sSvVY"
// Un tono de una rampa por un valor 0..1, con trama entre dos tonos vecinos.
// Como tono, pero el tramado solo cubre la franja central entre dos colores: degradados lisos, sin granito.
function tonoSuave(rampa, v, x, y, ancho = 0.35) {
  const f = Math.max(0, Math.min(1, v)) * (rampa.length - 1), i = Math.floor(f), d = f - i
  return rampa[Math.min(rampa.length - 1, i + (d > 0.5 + (bayer(x, y) - 0.5) * ancho ? 1 : 0))]
}
function tono(rampa, v, x, y) {
  const f = Math.max(0, Math.min(0.999, v)) * (rampa.length - 1), i = Math.floor(f)
  return rampa[Math.min(rampa.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))]
}
// Oscurece un píxel un paso dentro de su rampa (sombras proyectadas).
const OSCURO = {}
for (const r of [PIEDRA, TEJA, MADERA, "123456", TIERRA, ROCA, "wxXy", "zZPO", "0W", "879", "oKI"]) for (let i = 1; i < r.length; i++) OSCURO[r[i]] = r[i - 1]
function sombra(c, x, y, pasos = 1) { let k = c.key(x, y); if (k == null) return; for (let i = 0; i < pasos; i++) k = OSCURO[k] ?? k; c.px(x, y, k) }

// ================================================================ piezas del castillo
// Lienzo común de las 5 etapas: 112x118, base en la fila CB y centro en CX.
const CW = 112, CH = 118, CX = 56, CB = 114
// Torre redonda: cada columna recibe más o menos sol según su sitio en el cilindro; sillares en
// hiladas de 3 px, cada piedra con su tono.
function torreRedonda(c, x, y, w, h) {
  for (let xx = 0; xx < w; xx++) {
    const t = (xx + 0.5) / w, luz = Math.cos((t - 0.28) * Math.PI * 0.95)
    for (let yy = 0; yy < h; yy++) {
      const fila = Math.floor(yy / 3), largo = 4, desp = (fila % 2) * 2
      const piedra = Math.floor((xx + desp) / largo), junta = yy % 3 === 2 || (xx + desp) % largo === 0
      const v = 0.12 + luz * 0.72 + (rnd(piedra, fila + x) - 0.5) * 0.14 - (yy > h - 4 ? 0.12 : 0)
      c.px(x + xx, y + yy, junta ? tono(PIEDRA, v - 0.2, xx, yy) : tono(PIEDRA, v, xx, yy))
    }
  }
}
// Muro plano: de frente al sol, más claro arriba; piedras de 6x3; musgo al pie.
function muro(c, x, y, w, h) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const fila = Math.floor(yy / 3), desp = (fila % 2) * 3
    const piedra = Math.floor((xx + desp) / 6), junta = yy % 3 === 2 || (xx + desp) % 6 === 0
    let v = 0.58 - yy / h * 0.14 + (rnd(piedra + x, fila + y) - 0.5) * 0.16
    if (xx < 1) v += 0.15
    c.px(x + xx, y + yy, junta ? tono(PIEDRA, v - 0.18, xx, yy) : tono(PIEDRA, v, xx, yy))
    if (yy >= h - 2 && rnd(xx + x, yy) < 0.35) c.px(x + xx, y + yy, rnd(xx, x) < 0.5 ? "2" : "3")
  }
}
// Almenas con su sombra debajo y la cara del sol en el borde izquierdo de cada merlón.
function almenas(c, x, y, w, alto = 3) {
  for (let i = 0; i + 2 <= w; i += 4) {
    for (let yy = 0; yy < alto; yy++) { c.px(x + i, y - alto + yy, "F"); c.px(x + i + 1, y - alto + yy, "E"); if (i + 2 < w) c.px(x + i + 2, y - alto + yy, "C") }
  }
  for (let xx = 0; xx < w; xx++) { c.px(x + xx, y, "F"); sombra(c, x + xx, y + 1); sombra(c, x + xx, y + 2) }
}
// Matacanes: ménsulas bajo el adarve de una torre, con su sombra.
function matacanes(c, x, y, w) {
  for (let xx = -1; xx <= w; xx++) { c.px(x + xx, y, "E"); c.px(x + xx, y + 1, xx % 3 === 0 ? "D" : "B") }
  for (let xx = 0; xx < w; xx += 3) { c.px(x + xx, y + 2, "C") }
}
// Tejado cónico: hiladas de teja en escamas, la luz rueda por el cono de izquierda a derecha.
function cono(c, cx, base, r, alto) {
  for (let yy = 0; yy < alto; yy++) {
    const half = r * (alto - yy) / alto
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const t = half < 0.5 ? 0.3 : (x - (cx - half)) / (2 * half), luz = Math.cos((t - 0.3) * Math.PI * 0.95)
      const escama = (yy % 3 === 0 && (x + Math.floor(yy / 3) * 2) % 4 !== 0)
      c.px(x, base - yy, tono(TEJA, 0.1 + luz * 0.8 - (escama ? 0.22 : 0), x, yy))
    }
  }
  for (let x = Math.round(cx - r - 1); x <= Math.round(cx + r + 1); x++) c.px(x, base + 1, "r")
  c.px(Math.round(cx), base - alto, "K"); c.px(Math.round(cx), base - alto - 1, "I")
}
// Ventana en arco: hondo oscuro, alféizar claro; algunas, encendidas.
function ventana(c, x, y, alto, luz = false) {
  c.rect(x, y, 2, alto, luz ? "K" : "A"); c.px(x, y - 1, "A"); c.px(x + 1, y - 1, "A")
  if (luz) { c.px(x, y + 1, "I"); c.px(x + 1, y + alto - 1, "o") } else c.px(x + 1, y, "B")
  c.hline(x - 1, y + alto, 4, "G"); c.hline(x - 1, y + alto + 1, 4, "C")
}
function aspillera(c, x, y, alto) { c.vline(x, y, alto, "A"); c.px(x, y + alto, "F"); c.px(x - 1, y + Math.floor(alto / 2), "A"); c.px(x + 1, y + Math.floor(alto / 2), "A") }
// Bandera de la casa al viento, con la sombra de sus pliegues.
function bandera(c, x, y, largo = 9, alto = 5) {
  c.vline(x, y - 1, alto + 9, "h"); c.px(x, y - 2, "I"); c.px(x, y - 3, "K")
  for (let xx = 1; xx <= largo; xx++) {
    const ola = Math.sin(xx / 2.4 - 0.6) * 1.1, cola = xx > largo - 2 ? 1 : 0
    for (let yy = cola; yy < alto - cola; yy++) {
      const pliegue = Math.cos(xx / 2.4 - 0.6)
      c.px(x + xx, Math.round(y + yy + ola), yy === 0 ? "9" : pliegue < -0.4 ? "8" : yy === alto - 1 ? "8" : "7")
    }
  }
}
// Tapiz con el color de la casa, con barra dorada, borla y un galón de oro.
function tapiz(c, x, y, alto = 10) {
  c.hline(x - 1, y, 7, "K"); c.px(x - 2, y, "o"); c.px(x + 5, y, "o")
  for (let yy = 1; yy <= alto; yy++) for (let xx = 0; xx < 5; xx++) c.px(x + xx, y + yy, xx === 0 ? "9" : xx === 4 ? "8" : "7")
  c.px(x + 1, y + alto + 1, "7"); c.px(x + 3, y + alto + 1, "8"); c.px(x + 2, y + alto + 2, "K")
  c.hline(x, y + 2, 5, "K"); c.px(x + 2, y + 4, "K"); c.px(x + 1, y + 5, "K"); c.px(x + 2, y + 5, "I"); c.px(x + 3, y + 5, "K"); c.px(x + 2, y + 6, "K")
}
// El repostero del que cuelga el escudo de la casa: barra dorada con cordones.
function escudo(c, cx, y) {
  c.hline(cx - 9, y - 1, 19, "K"); c.px(cx - 10, y - 1, "I"); c.px(cx + 10, y - 1, "I")
  c.line(cx - 6, y - 2, cx, y - 4, "o"); c.line(cx + 6, y - 2, cx, y - 4, "o"); c.px(cx, y - 5, "K")
}
const ESCUDO_EN = { 1: 44, 2: 36, 3: 55, 4: 61, 5: 75 }   // filas por encima de la base (CB) donde empieza el escudo
// Puerta: arco de dovelas, portón de madera y rastrillo a medio subir.
function puerta(c, cx, base, w, h, soloMadera = false) {
  const x = cx - Math.floor(w / 2), r = Math.floor(w / 2)
  for (let yy = base - h - r; yy < base; yy++) for (let xx = x; xx < x + w; xx++) {
    const dy = yy - (base - h)
    if (dy >= 0 || Math.hypot(xx + 0.5 - cx, dy) <= r) c.px(xx, yy, "A")
  }
  for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.18) c.px(Math.round(cx - 0.5 + Math.cos(a) * (r + 1)), Math.round(base - h + Math.sin(a) * (r + 1)), "G")
  const madera = (xx) => ((xx - x) % 3 === 2 ? "H" : (xx - x) < w / 2 ? "J" : "j")
  for (let yy = base - Math.round(h * (soloMadera ? 1 : 0.62)); yy < base; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) c.px(xx, yy, madera(xx))
  if (!soloMadera) {
    for (let xx = x + 1; xx < x + w - 1; xx += 2) c.vline(xx, base - h - r + 2, Math.round(h * 0.55), "B")
    c.hline(x + 1, base - h - 1, w - 2, "B")
  }
  c.hline(x + 1, base - 3, w - 2, "h"); c.px(x + 2, base - 6, "K"); c.px(x + w - 3, base - 6, "K")
}
function antorcha(c, x, y) { c.px(x, y - 2, "I"); c.px(x, y - 1, "K"); c.px(x - 1, y - 1, "o"); c.vline(x, y, 3, "h") }
// Torre redonda completa: cuerpo, matacanes, tejado o almenas, bandera y ventanas.
function torre(c, x, base, w, h, o = {}) {
  torreRedonda(c, x, base - h, w, h)
  if (o.tejado) { matacanes(c, x, base - h, w); cono(c, x + (w - 1) / 2, base - h - 1, w / 2 + 1.5, o.tejado) }
  else almenas(c, x - 1, base - h, w + 2)
  if (o.bandera) bandera(c, Math.round(x + (w - 1) / 2), base - h - (o.tejado ?? 3) - 12)
  const mx = Math.round(x + w / 2) - 1
  if (o.ventanas !== false) {
    if (h > 18) ventana(c, mx, base - h + 6, 4, o.luz)
    if (h > 30) aspillera(c, mx + 1, base - h + 18, 4)
  }
}
// Sombra de una torre o del torreón sobre el muro de al lado (el sol viene de la izquierda).
function sombraDe(c, x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (bayer(xx, yy) < 0.85 - (xx - x) / w * 0.5) sombra(c, xx, yy) }

// ================================================================ el castillo, en 5 etapas
// Etapa 1: una torre de piedra basta con cadalso de madera y empalizada de estacas.
// De pacotilla, pero con su escudo y su bandera.
function etapa1(c) {
  torreRedonda(c, CX - 10, CB - 46, 20, 46)
  // cadalso de madera que sobresale, con tablas y tornapuntas
  for (let xx = CX - 13; xx <= CX + 12; xx++) for (let yy = CB - 56; yy < CB - 46; yy++) {
    const tabla = (xx - CX + 13) % 3 === 0
    c.px(xx, yy, tabla ? "H" : xx < CX - 4 ? "J" : xx > CX + 6 ? "j" : tono(MADERA, 0.62, xx, yy))
  }
  c.hline(CX - 13, CB - 47, 26, "h"); c.line(CX - 13, CB - 46, CX - 10, CB - 42, "h"); c.line(CX + 12, CB - 46, CX + 9, CB - 42, "h")
  for (let yy = 0; yy < 9; yy++) { const half = 15 - yy * 1.6; for (let xx = Math.round(CX - half); xx <= Math.round(CX - 1 + half); xx++) c.px(xx, CB - 57 - yy, tono(MADERA, 0.35 + Math.cos(((xx - CX + half) / (2 * half) - 0.3) * 3) * 0.4 - (yy % 2) * 0.12, xx, yy)) }
  bandera(c, CX, CB - 80)
  ventana(c, CX - 1, CB - 18, 4)
  // empalizada: estacas afiladas de alturas desiguales, la cara del sol clara
  for (let x = CX - 34; x <= CX + 33; x += 2) {
    if (Math.abs(x - CX) < 6) continue
    const alto = 13 + Math.round(rnd(x, 1) * 3)
    for (let yy = 0; yy < alto; yy++) { c.px(x, CB - yy - 1, yy > alto - 3 ? "i" : "J"); c.px(x + 1, CB - yy - 1, yy > alto - 2 ? "j" : "H") }
    c.px(x, CB - alto - 1, "i")
  }
  c.hline(CX - 34, CB - 9, 68, "h"); c.hline(CX - 34, CB - 5, 68, "h")
  puerta(c, CX, CB, 10, 10, true)
  // banderín en la empalizada
  c.vline(CX - 28, CB - 26, 12, "h"); for (let i = 0; i < 4; i++) { c.px(CX - 27 + i, CB - 26 + Math.floor(i / 2), "7"); c.px(CX - 27 + i, CB - 25 + Math.floor(i / 2), "8") }
  escudo(c, CX, CB - ESCUDO_EN[1])
}
// Etapa 2: torre del homenaje de piedra con almenas, muralla baja y dos torrecillas.
function etapa2(c) {
  muro(c, CX - 32, CB - 22, 64, 22); almenas(c, CX - 33, CB - 22, 66)
  torre(c, CX - 12, CB - 20, 24, 40, { bandera: true, ventanas: false })
  sombraDe(c, CX + 12, CB - 20, 6, 20)
  torre(c, CX - 40, CB, 12, 30, { luz: true }); torre(c, CX + 28, CB, 12, 30)
  sombraDe(c, CX - 28, CB - 22, 5, 22)
  puerta(c, CX, CB, 10, 11, true)
  antorcha(c, CX - 9, CB - 8); antorcha(c, CX + 8, CB - 8)
  escudo(c, CX, CB - 20 - ESCUDO_EN[2])
}
// Etapa 3: el castillo del mapa. Torreón, muralla con adarve y dos torres con tejado cónico.
function etapa3(c) {
  muro(c, CX - 14, CB - 60, 28, 34); almenas(c, CX - 15, CB - 60, 30)
  torre(c, CX - 4, CB - 60, 8, 8, { bandera: true, ventanas: false })
  ventana(c, CX - 12, CB - 52, 4, true); ventana(c, CX + 10, CB - 52, 4)
  muro(c, CX - 34, CB - 26, 68, 26); almenas(c, CX - 35, CB - 26, 70)
  sombraDe(c, CX + 14, CB - 26, 6, 14)
  for (const dx of [-26, -18, 16, 24]) aspillera(c, CX + dx, CB - 19, 4)
  torre(c, CX - 46, CB, 14, 40, { tejado: 14, bandera: true, luz: true }); torre(c, CX + 32, CB, 14, 40, { tejado: 14, bandera: true })
  sombraDe(c, CX - 32, CB - 26, 6, 26)
  puerta(c, CX, CB, 12, 12)
  antorcha(c, CX - 10, CB - 9); antorcha(c, CX + 9, CB - 9)
  escudo(c, CX, CB - ESCUDO_EN[3])
}
// Etapa 4: torreón más alto con su torrecilla, puerta entre dos torres y tapices en la muralla.
function etapa4(c) {
  muro(c, CX - 15, CB - 66, 30, 38); almenas(c, CX - 16, CB - 66, 32)
  torre(c, CX - 5, CB - 66, 10, 12, { tejado: 12, bandera: true, ventanas: false })
  ventana(c, CX - 13, CB - 58, 5, true); ventana(c, CX + 11, CB - 58, 5)
  muro(c, CX - 40, CB - 28, 80, 28); almenas(c, CX - 41, CB - 28, 82)
  sombraDe(c, CX + 15, CB - 28, 6, 14)
  tapiz(c, CX - 32, CB - 24); tapiz(c, CX + 27, CB - 24)
  torre(c, CX - 52, CB, 15, 44, { tejado: 16, bandera: true, luz: true }); torre(c, CX + 37, CB, 15, 44, { tejado: 16, bandera: true })
  sombraDe(c, CX - 37, CB - 28, 6, 28)
  torre(c, CX - 15, CB, 9, 34, { tejado: 10 }); torre(c, CX + 6, CB, 9, 34, { tejado: 10 })
  sombraDe(c, CX - 6, CB - 26, 3, 26)
  puerta(c, CX, CB, 11, 13)
  antorcha(c, CX - 19, CB - 12); antorcha(c, CX + 18, CB - 12)
  escudo(c, CX, CB - ESCUDO_EN[4])
}
// Etapa 5: doble muralla. Dentro, el gran torreón y dos torres; fuera, la barrera con sus torres,
// estandartes y la puerta fortificada.
function etapa5(c) {
  muro(c, CX - 16, CB - 80, 32, 38); almenas(c, CX - 17, CB - 80, 34)
  torre(c, CX - 6, CB - 80, 12, 12, { tejado: 16, bandera: true, ventanas: false })
  ventana(c, CX - 14, CB - 72, 5, true); ventana(c, CX + 12, CB - 72, 5, true)
  muro(c, CX - 36, CB - 44, 72, 20); almenas(c, CX - 37, CB - 44, 74)
  sombraDe(c, CX + 16, CB - 44, 6, 14)
  torre(c, CX - 44, CB - 24, 13, 34, { tejado: 13, bandera: true, luz: true }); torre(c, CX + 31, CB - 24, 13, 34, { tejado: 13, bandera: true })
  tapiz(c, CX - 29, CB - 41, 8); tapiz(c, CX + 24, CB - 41, 8)
  muro(c, CX - 50, CB - 20, 100, 20); almenas(c, CX - 51, CB - 20, 102)
  sombraDe(c, CX - 31, CB - 20, 5, 20); sombraDe(c, CX + 44, CB - 20, 4, 20)
  torre(c, CX - 56, CB, 13, 30, { tejado: 11, luz: true }); torre(c, CX + 43, CB, 13, 30, { tejado: 11 })
  tapiz(c, CX - 53, CB - 18, 9); tapiz(c, CX + 47, CB - 18, 9)
  torre(c, CX - 14, CB, 9, 27, { tejado: 9 }); torre(c, CX + 5, CB, 9, 27, { tejado: 9 })
  sombraDe(c, CX - 5, CB - 18, 3, 18)
  puerta(c, CX, CB, 10, 12)
  antorcha(c, CX - 19, CB - 8); antorcha(c, CX + 18, CB - 8)
  escudo(c, CX, CB - ESCUDO_EN[5])
}
const ETAPAS = [etapa1, etapa2, etapa3, etapa4, etapa5]
ETAPAS.forEach((fn, i) => sprite(`castillo_${i + 1}`, { w: CW, h: CH, outline: "k", pivot: "bottom" }, (c) => fn(c)))

// Escudo de muestra para la maqueta (español, partido, con una torre dorada).
sprite("escudo_muestra", { w: 16, h: 18 }, (c) => {
  for (let y = 0; y < 18; y++) for (let x = 0; x < 16; x++) {
    if (!(y < 11 || Math.hypot(x - 7.5, y - 10) < 8)) continue
    const borde = x === 0 || x === 15 || y === 0 || (y >= 11 && Math.hypot(x - 7.5, y - 10) > 7)
    c.px(x, y, borde ? "k" : x < 8 ? (y < 2 || x < 2 ? "9" : "7") : "8")
  }
  c.rect(6, 5, 4, 7, "I"); c.rect(5, 4, 6, 2, "I"); c.px(5, 3, "I"); c.px(7, 3, "I"); c.px(10, 3, "I"); c.vline(9, 6, 6, "K"); c.rect(7, 9, 2, 3, "k")
})

// ================================================================ los edificios (de muestra, nivel 3)
// Lo que es suelo (campos, roca, plaza) va en una capa sin contorno para que se funda con el
// prado; el contorno solo rodea lo construido.
// Tejado a dos aguas de frente: escamas en hiladas y la mitad del sol más clara.
function tejado(c, x, y, w, alto, rampa = TEJA) {
  for (let yy = 0; yy < alto; yy++) {
    const r = (w / 2) * ((yy + 1) / alto), cx = x + w / 2
    for (let xx = Math.round(cx - r); xx < Math.round(cx + r); xx++) {
      const escama = yy % 2 === 1 && (xx + Math.floor(yy / 2)) % 3 === 0
      c.px(xx, y - alto + yy, tono(rampa, (xx < cx ? 0.78 : 0.42) - (escama ? 0.2 : 0) - yy / alto * 0.12, xx, yy))
    }
  }
  c.hline(x - 1, y, w + 2, rampa[0])
}
// Campo de trigo en surcos, con la luz rozando las espigas.
function campo(c, x, y, w, h, inclina = 0) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const px = x + xx + Math.round(inclina * yy), surco = (xx + Math.round(yy * 0.5)) % 4
    c.px(px, y + yy, surco === 0 ? "w" : surco === 1 ? "x" : tono("xXy", 0.3 + (1 - yy / h) * 0.6 + rnd(xx, yy) * 0.15, xx, yy))
  }
  for (let xx = 0; xx < w; xx++) c.px(x + xx + Math.round(inclina * h), y + h, "2")
}
function oveja(c, x, y) { c.rect(x, y, 4, 2, "W"); c.px(x + 1, y - 1, "W"); c.px(x + 2, y - 1, "W"); c.px(x, y + 1, "0"); c.px(x + 3, y + 1, "0"); c.px(x + 4, y, "k"); c.px(x + 4, y - 1, "k"); c.px(x + 1, y + 2, "k"); c.px(x + 3, y + 2, "k") }
function gallina(c, x, y) { c.px(x, y, "W"); c.px(x + 1, y, "W"); c.px(x + 1, y - 1, "W"); c.px(x + 2, y - 1, "q"); c.px(x, y + 1, "K") }
// Persona pequeña (6 px): cabeza, cuerpo con ropa de un color, piernas.
function persona(c, x, y, ropa = "Z", gorro = null) {
  c.px(x, y - 5, gorro ?? "h"); c.px(x, y - 4, "t"); c.rect(x - 1, y - 3, 3, 2, ropa); c.px(x - 1, y - 2, OSCURO[ropa] ?? ropa); c.px(x, y - 1, ropa); c.px(x - 1, y, "h"); c.px(x + 1, y, "h")
}

// Cada edificio crece en 5 niveles sobre el mismo lienzo, para que la escena no se mueva: el 1 es
// una chapuza honrada, el 3 el de muestra y el 5 una obra que presume con la bandera de la casa.
const PAJA = "wxXy"
// Pared de tablas verticales, más clara del lado del sol.
function tablas(c, x, y, w, h) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++)
    c.px(x + xx, y + yy, xx % 3 === 2 ? "H" : tono(MADERA, (xx < w / 2 ? 0.74 : 0.55) - yy / h * 0.1, xx, yy))
}
// Pared de sillares, como la del granero.
function sillares(c, x, y, w, h) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const fila = Math.floor(yy / 3), junta = yy % 3 === 2 || (xx + (fila % 2) * 2) % 5 === 0
    c.px(x + xx, y + yy, tono(PIEDRA, (xx < w / 2 ? 0.86 : 0.66) - (junta ? 0.16 : 0) + (rnd(xx >> 2, fila) - 0.5) * 0.1, xx, yy))
  }
}
// Banderín de la casa en un mástil corto (8 px).
function banderin(c, x, y) {
  c.vline(x, y, 9, "h"); c.px(x, y - 1, "K")
  for (let xx = 1; xx <= 6; xx++) for (let yy = 0; yy < 4; yy++) {
    if (xx === 6 && (yy === 1 || yy === 2)) continue
    c.px(x + xx, y + yy, yy === 0 ? "9" : yy === 3 ? "8" : "7")
  }
}
function puertaTablas(c, x, y, w, h) { c.rect(x, y, w, h, "h"); c.vline(x + Math.floor(w / 2), y, h, "H"); c.hline(x - 1, y - 1, w + 2, "H") }
function humo(c, x, y) { for (const [dx, dy, k] of [[0, 0, "n"], [1, -1, "n"], [0, -2, "d"], [1, -3, "d"], [2, -4, "n"], [1, -5, "d"]]) c.px(x + dx, y + dy, k) }
function vaca(c, x, y) { c.rect(x, y, 6, 3, "W"); c.px(x + 1, y, "k"); c.px(x + 2, y + 1, "k"); c.px(x + 4, y, "k"); c.rect(x + 6, y - 1, 2, 2, "W"); c.px(x + 7, y, "t"); c.px(x + 1, y + 3, "k"); c.px(x + 5, y + 3, "k") }
function espantapajaros(c, x, y) { c.vline(x, y + 2, 9, "h"); c.hline(x - 3, y + 4, 7, "H"); c.rect(x - 1, y + 3, 3, 3, "0"); c.hline(x - 2, y + 1, 5, "w"); c.px(x, y, "w"); c.px(x, y + 3, "k") }
// Molino de viento: torre de piedra con caperuza y cuatro aspas (de lienzo, o de la casa).
function molino(c, x, base, deCasa = false) {
  for (let yy = 0; yy < 16; yy++) { const half = 3 + yy * 0.18; for (let xx = Math.round(x - half); xx <= Math.round(x + half); xx++) c.px(xx, base - 16 + yy, tono(PIEDRA, (xx < x ? 0.85 : 0.6) - (yy % 3 === 2 ? 0.12 : 0), xx, yy)) }
  for (let yy = 0; yy < 4; yy++) for (let xx = -3 + yy; xx <= 3 - yy; xx++) c.px(x + xx, base - 17 - yy, xx < 0 ? "Q" : "q")
  c.rect(x, base - 5, 2, 5, "h")
  const cx = x, cy = base - 16
  for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) {
    for (let i = 2; i <= 9; i++) { c.px(cx + dx * i, cy + dy * i, "h"); if (i > 3) { c.px(cx + dx * i + dx, cy + dy * i, deCasa ? (dy < 0 ? "9" : "7") : "W"); c.px(cx + dx * i, cy + dy * i - dy, deCasa ? "8" : "0") } }
  }
  c.px(cx, cy, "K")
}

// ---------------------------------------------------------------- granja (64x40)
function granja(n) {
  return [
    layer("campos", { outline: false }, (c) => {
      if (n === 1) campo(c, 32, 28, 18, 9)
      else if (n === 2) { campo(c, 3, 25, 22, 12, -0.15); campo(c, 35, 29, 20, 8, 0.15) }
      else { campo(c, 3, 23, 25, 14, -0.15); campo(c, 33, 27, 27, 10, 0.15) }
      if (n === 5) for (let x = 0; x < 64; x += 3) { c.vline(x, 37, 3, "J"); if (x < 62) { c.hline(x, 38, 3, "j") } }
    }),
    (c) => {
      if (n <= 2) {
        // Choza (1) o casita (2) de tablas con tejado de paja.
        const x = n === 1 ? 14 : 20, w = n === 1 ? 14 : 20, h = n === 1 ? 10 : 13
        tablas(c, x, 37 - h, w, h)
        tejado(c, x - 2, 37 - h, w + 4, n === 1 ? 8 : 10, PAJA)
        puertaTablas(c, x + Math.floor(w / 2) - 2, 37 - 7, 4, 7)
        if (n === 2) { c.rect(x + 3, 37 - h + 3, 3, 3, "K"); c.px(x + 3, 37 - h + 3, "I"); c.ellipse(53, 30, 4, 3, "x"); c.ellipse(52, 29, 3, 2, "X"); c.vline(53, 25, 3, "h") }
        espantapajaros(c, n === 1 ? 41 : 11, n === 1 ? 20 : 19)
        gallina(c, n === 1 ? 6 : 40, 36); if (n === 2) { gallina(c, 44, 37); oveja(c, 56, 34) }
        return
      }
      if (n >= 4) molino(c, 8, 26, n === 5)
      sillares(c, 20, 10, 22, 15)
      tejado(c, 18, 11, 26, 10)
      c.rect(27, 15, 8, 10, "j"); c.vline(31, 15, 10, "h"); c.line(27, 15, 34, 24, "H"); c.line(34, 15, 27, 24, "H"); c.hline(26, 14, 10, "h")
      c.rect(30, 4, 2, 2, "A"); c.hline(29, 6, 4, "G")
      c.ellipse(53, 25, 6, 5, "x"); c.ellipse(52, 23, 5, 4, "X"); c.ellipse(51, 22, 3, 2, "y"); c.vline(53, 16, 5, "h")
      for (let i = 0; i < 6; i++) c.px(48 + i * 2, 29, "w")
      if (n === 3) { c.vline(11, 22, 9, "h"); c.hline(8, 24, 7, "H"); c.rect(10, 21, 3, 3, "0"); c.hline(9, 20, 5, "w"); c.px(11, 19, "w"); c.px(11, 22, "k") }
      if (n === 5) { vaca(c, 14, 31); c.rect(2, 30, 4, 3, "C"); c.hline(1, 29, 6, "E"); c.px(3, 31, "z") }
      oveja(c, 2, 34); oveja(c, 56, 34); gallina(c, 40, 36); gallina(c, 44, 37)
    },
  ]
}

// ---------------------------------------------------------------- aserradero (52x38)
function rueda(c, x, y, r) {
  c.ellipse(x, y, r, r, "j", true); c.ellipse(x, y, r - 1, r - 1, "H", true); c.ellipse(x, y, 3, 3, "H", true)
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; c.line(Math.round(x + Math.cos(a) * 3), Math.round(y + Math.sin(a) * 3), Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), k % 2 ? "J" : "j") }
  c.px(x, y, "i")
}
function troncos(c, pila) { for (const [tx, ty] of pila) { c.rect(tx, ty, 8, 3, "j"); c.hline(tx, ty, 8, "J"); c.hline(tx, ty + 2, 8, "H"); c.ellipse(tx + 8, ty + 1, 1, 1, "i") } }
function caballete(c, x, y) { c.line(x, y, x + 2, y - 4, "h"); c.line(x + 4, y, x + 2, y - 4, "h"); c.line(x + 7, y, x + 9, y - 4, "h"); c.line(x + 11, y, x + 9, y - 4, "h"); c.rect(x - 1, y - 6, 13, 2, "J"); c.hline(x - 1, y - 6, 13, "i"); c.vline(x + 5, y - 9, 4, "E") }
function aserradero(n) {
  return [(c) => {
    if (n === 1) {
      // Cobertizo de cuatro palos con techo de tablas, caballete con tronco, tocón con hacha.
      for (const x of [16, 33]) c.vline(x, 22, 13, "h")
      for (let x = 14; x < 37; x++) for (let y = 0; y < 3; y++) c.px(x, 20 + y + Math.round((x - 14) * 0.08), y === 0 ? "i" : x % 3 ? "J" : "j")
      caballete(c, 19, 35)
      troncos(c, [[38, 32], [38, 29], [40, 26]])
      c.rect(8, 32, 4, 3, "J"); c.hline(8, 32, 4, "i"); c.line(10, 31, 12, 28, "h"); c.rect(12, 27, 2, 2, "E")
      persona(c, 35, 35, "3", "J")
      return
    }
    if (n === 2) {
      tablas(c, 17, 22, 18, 13)
      tejado(c, 14, 22, 24, 8, MADERA)
      puertaTablas(c, 23, 28, 6, 7)
      caballete(c, 3, 35)
      troncos(c, [[38, 32], [38, 29], [40, 26], [42, 23]])
      persona(c, 16, 37, "q")
      return
    }
    // De la 3 en adelante: nave de tablas con la sierra movida por la rueda de agua.
    const alto = n === 5 ? 22 : 18, y0 = 34 - alto
    tablas(c, 15, y0, 26, alto)
    c.rect(25, 23, 7, 11, "h"); c.vline(28, 23, 11, "H"); c.hline(24, 22, 9, "H")
    if (n === 5) { c.hline(15, y0 + 5, 26, "h"); c.rect(19, y0 + 1, 3, 3, "K"); c.rect(34, y0 + 1, 3, 3, "K"); c.px(19, y0 + 1, "I") }
    tejado(c, 12, y0, 32, 10, MADERA)
    c.rect(19, 19 + (n === 5 ? 3 : 0), 3, 3, "K"); c.px(19, 19 + (n === 5 ? 3 : 0), "I")
    rueda(c, 9, 26, n >= 4 ? 9 : 8)
    if (n >= 4) {
      // Tejadillo con tablas ya cortadas, apiladas por largos.
      for (const x of [42, 50]) c.vline(x, 22, 13, "h")
      for (let x = 40; x < 52; x++) c.px(x, 21 + Math.round((x - 40) * 0.15), "j"), c.px(x, 20 + Math.round((x - 40) * 0.15), "J")
      for (let i = 0; i < 4; i++) { c.hline(43, 33 - i * 2, 7, i % 2 ? "i" : "J"); c.hline(43, 34 - i * 2, 7, "j") }
      troncos(c, [[30, 35]])
    } else {
      troncos(c, [[41, 31], [41, 28], [43, 25]])
    }
    c.vline(38, 30, 4, "J"); c.rect(37, 29, 3, 2, "E")
    if (n === 5) { banderin(c, 46, 10); persona(c, 36, 37, "3", "J") }
  }]
}

// ---------------------------------------------------------------- cantera (52x34)
// Bancadas cortadas en la ladera: tantas como el nivel pide, cada una más estrecha.
function bancadas(c, cx, top, n, ancho, alto = 8) {
  for (let i = 0; i < n; i++) {
    const half = ancho / 2 - i * 6, y0 = top + i * alto
    for (let y = y0; y < y0 + alto; y++) for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const dx = (x - cx) / half
      if (i === 0 && y < y0 + Math.round(dx * dx * 5)) continue
      const repisa = y < y0 + 2
      let k = repisa ? (y === y0 ? "Y" : "V") : tono(ROCA, 0.28 + (y - y0) / alto * 0.1 + (rnd(x >> 1, y) - 0.5) * 0.2, x, y)
      if (!repisa && dx < -0.8) k = "s"
      if (!repisa && dx > 0.8) k = "V"
      if (!repisa && (x * 3 + i) % 5 === 0 && y > y0 + 3) k = "s"
      c.px(x, y, k)
    }
    if (i > 0) c.hline(Math.round(cx - half) + 1, y0 + 2, Math.round(half * 2) - 1, "s")
  }
}
function bloques(c, lista, claro = false) { for (const [bx, by, bw] of lista) { c.rect(bx, by, bw, 4, claro ? "F" : "E"); c.hline(bx, by, bw, "G"); c.vline(bx + bw - 1, by, 4, claro ? "D" : "C") } }
function pluma(c, x, top, largo) { c.vline(x, top, 30 - top - 5 + 3, "H"); c.vline(x + 1, top, 30 - top - 5 + 3, "h"); c.line(x, top, x - largo, top + 4, "j"); c.vline(x - largo + 1, top + 5, 7, "0"); c.rect(x - largo, top + 12, 3, 2, "E") }
function cantera(n) {
  const roca = { 1: [26, 18, 1, 30, 13], 2: [26, 11, 2, 40, 10], 3: [26, 5, 3, 48, 9], 4: [26, 3, 4, 50, 7], 5: [26, 3, 4, 50, 7] }[n]
  return [
    layer("roca", { outline: false }, (c) => {
      const [cx, top, k, ancho, alto] = roca
      bancadas(c, cx, top, k, ancho, alto)
      // Al pie, el cascajo claro de la piedra recién cortada.
      for (let y = top + k * alto; y < 34; y++) for (let x = Math.round(cx - ancho / 2 + 2); x <= Math.round(cx + ancho / 2 - 2); x++)
        if (rnd(x, y) > 0.15) c.px(x, y, tono(ROCA, 0.62 + (rnd(x >> 1, y) - 0.5) * 0.3, x, y))
    }),
    (c) => {
      if (n === 1) { bloques(c, [[30, 28, 5]]); c.line(22, 26, 24, 23, "h"); c.px(25, 23, "C"); persona(c, 21, 31, "q"); return }
      if (n === 2) { bloques(c, [[29, 28, 6], [36, 29, 5]]); c.rect(10, 29, 5, 3, "j"); c.hline(10, 29, 5, "J"); c.px(9, 32, "h"); c.line(15, 30, 18, 32, "h"); persona(c, 22, 31, "q"); persona(c, 40, 22, "Z"); return }
      bloques(c, [[29, 28, 6], [36, 29, 5], [32, 25, 5]], n === 5)
      for (const [bx, by, bw] of n === 3 ? [[6, 29, 6], [12, 29, 5], [8, 26, 6]] : []) { c.rect(bx, by, bw, 3, "E"); c.hline(bx, by, bw, "G"); c.vline(bx + bw - 1, by, 3, "C") }
      if (n === 3) { c.ellipse(17, 27, 4, 4, "j"); c.ellipse(17, 27, 3, 3, "H"); c.line(14, 27, 20, 27, "J"); c.line(17, 24, 17, 30, "J"); c.vline(17, 27, 5, "j") }
      else {
        // Grúa de rueda: dos hombres dentro la hacen girar.
        c.ellipse(15, 24, 6, 6, "j"); c.ellipse(15, 24, 5, 5, "H"); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; c.line(Math.round(15 - Math.cos(a) * 5), Math.round(24 - Math.sin(a) * 5), Math.round(15 + Math.cos(a) * 5), Math.round(24 + Math.sin(a) * 5), "J") }
        c.vline(15, 24, 9, "j"); c.line(15, 18, 30, 6, "J"); c.line(15, 19, 30, 7, "j"); c.vline(30, 8, 9, "0"); c.rect(29, 17, 3, 2, "F")
      }
      pluma(c, 44, 3, 14)
      if (n === 5) {
        // Caseta del cantero, de piedra labrada, y el banderín en la pluma.
        sillares(c, 41, 25, 10, 8); tejado(c, 40, 25, 12, 5); c.rect(44, 29, 3, 4, "h")
        banderin(c, 46, 11)
        bloques(c, [[20, 29, 5]], true)
      }
      persona(c, 22, 31, "q"); persona(c, 12, 22, "Z")
      if (n >= 4) persona(c, n === 5 ? 34 : 38, 33, "3", "0")
    },
  ]
}

// ---------------------------------------------------------------- mina (52x40)
function castillete(c) {
  c.line(4, 37, 12, 6, "j"); c.line(20, 37, 12, 6, "H"); c.hline(7, 27, 11, "H"); c.hline(9, 18, 7, "H"); c.line(6, 27, 15, 18, "h")
  c.ellipse(12, 6, 3, 3, "H", true); c.px(12, 6, "i"); c.vline(14, 8, 18, "0")
}
function vagoneta(c, x, oro = false) { c.rect(x, 31, 10, 5, "C"); c.hline(x, 31, 10, "D"); c.vline(x + 9, 31, 5, "B"); c.ellipse(x + 4, 30, 3, 1, "S"); c.px(x + 3, 29, oro ? "I" : "v"); c.px(x + 6, 29, "K"); if (oro) c.px(x + 5, 30, "K"); c.px(x + 1, 36, "A"); c.px(x + 8, 36, "A") }
function mina(n) {
  return [
    layer("ladera", { outline: false }, (c) => {
      for (let y = 10; y < 40; y++) for (let x = 18; x < 52; x++) if (y > 42 - (x - 18) * 1.25) c.px(x, y, tono(ROCA, 0.42 + (rnd(x >> 1, y >> 1) - 0.5) * 0.3, x, y))
      for (let x = 14; x < 50; x++) { c.px(x, 38, "f"); c.px(x, 39, "e") }
      if (n >= 2) for (let y = 0; y < 6; y++) for (let x = 2 + y; x < (n >= 4 ? 18 : 12) - y; x++) c.px(x, 37 - y, tono(ROCA, 0.3 + rnd(x, y) * 0.4, x, y))
    }),
    (c) => {
      if (n === 1) {
        // Un agujero en la ladera con dos palos y un dintel; cubo y pico a la puerta.
        c.rect(30, 27, 8, 10, "k"); c.rect(31, 28, 6, 2, "A")
        c.vline(29, 26, 11, "J"); c.vline(38, 26, 11, "j"); c.hline(28, 25, 12, "j")
        c.rect(24, 34, 3, 3, "C"); c.hline(24, 33, 3, "B"); c.line(19, 36, 22, 32, "h"); c.px(22, 31, "D")
        persona(c, 42, 37, "S", "K")
        return
      }
      c.rect(28, 21, 12, 16, "k"); c.rect(29, 22, 10, 3, "A")
      c.rect(26, 19, 2, 18, "J"); c.vline(27, 19, 18, "j"); c.rect(40, 19, 2, 18, "j"); c.rect(25, 17, 18, 3, "j"); c.hline(25, 17, 18, "J")
      c.px(34, 25, "K"); c.px(34, 24, "I")
      if (n >= 3) castillete(c)
      c.hline(16, 37, 26, "B"); for (let x = 17; x < 42; x += 3) c.px(x, 38, "H")
      vagoneta(c, 29, n === 5)
      if (n >= 4) {
        // Caseta de la máquina, con su chimenea, y una segunda vagoneta.
        tablas(c, 43, 27, 9, 10); tejado(c, 42, 27, 11, 5); c.rect(46, 31, 3, 6, "h")
        c.rect(49, 18, 2, 6, "C"); c.hline(49, 18, 2, "E")
        if (n === 5) humo(c, 49, 16)
        vagoneta(c, 17)
      }
      if (n === 5) banderin(c, 33, 8)
      persona(c, n >= 4 ? 24 : 46, 37, "S", "K")
    },
  ]
}

// ---------------------------------------------------------------- mercado (58x32)
function puesto(c, x, y, k1, k2, mercancia) {
  c.vline(x, y + 1, 11, "h"); c.vline(x + 13, y + 1, 11, "h")
  for (let i = 0; i < 16; i++) { const k = Math.floor(i / 2) % 2 ? k2 : k1; c.px(x - 1 + i, y, k); c.px(x - 1 + i, y + 1, k); c.px(x - 1 + i, y + 2, OSCURO[k] ?? k) }
  for (let i = 0; i < 16; i += 2) c.px(x - 1 + i, y + 3, Math.floor(i / 2) % 2 ? k2 : k1)
  c.rect(x, y + 7, 14, 5, "j"); c.hline(x, y + 7, 14, "J"); c.hline(x, y + 11, 14, "H"); c.vline(x + 7, y + 8, 3, "H")
  mercancia(c, x, y + 6)
}
const TRIGO = (c, x, y) => { for (let i = 0; i < 4; i++) { c.ellipse(x + 3 + i * 3, y, 1, 1, "x"); c.px(x + 3 + i * 3, y - 1, "y") } }
const ORO = (c, x, y) => { c.rect(x + 2, y, 9, 1, "K"); c.rect(x + 3, y - 1, 7, 1, "I") }
const PIEDRAS = (c, x, y) => { c.rect(x + 2, y - 1, 4, 2, "E"); c.rect(x + 7, y - 1, 4, 2, "C") }
function fuente(c, x, y) { c.ellipse(x, y, 5, 2, "D", true); c.ellipse(x, y, 4, 1, "Z", true); c.px(x - 1, y, "P"); c.vline(x, y - 5, 5, "E"); c.px(x, y - 6, "O"); c.px(x - 1, y - 5, "P"); c.px(x + 1, y - 5, "P") }
function mercado(n) {
  const plaza = { 1: [16, 6], 2: [22, 6], 3: [29, 7], 4: [29, 7], 5: [29, 8] }[n]
  return [
    layer("plaza", { outline: false }, (c) => {
      const [rx, ry] = plaza
      for (let y = 32 - ry * 2; y < 32; y++) for (let x = 0; x < 58; x++) {
        const dx = (x - 29) / rx, dy = (y - (32 - ry)) / ry
        if (dx * dx + dy * dy > 1) continue
        const fila = Math.floor(y / 2), junta = y % 2 === 0 || (x + fila) % 3 === 0
        c.px(x, y, junta ? "f" : tono(TIERRA, 0.55 + (rnd(x >> 1, fila) - 0.5) * 0.3, x, y))
      }
    }),
    (c) => {
      if (n === 1) {
        // Un carro con toldo y un vendedor que pregona el pan a quien pase.
        c.rect(20, 19, 16, 6, "j"); c.hline(20, 19, 16, "J"); c.hline(20, 24, 16, "H"); TRIGO(c, 21, 18)
        for (let i = 0; i < 18; i++) c.px(19 + i, 13 + Math.round(Math.abs(i - 8.5) * 0.2), i % 4 < 2 ? "R" : "W")
        c.vline(20, 14, 5, "h"); c.vline(35, 14, 5, "h")
        c.ellipse(23, 26, 2, 2, "h", true); c.ellipse(33, 26, 2, 2, "h", true); c.line(36, 23, 42, 25, "h")
        persona(c, 16, 28, "q"); persona(c, 40, 30, "3", "0")
        return
      }
      if (n === 5) {
        // Lonja de piedra con soportales y tejado de teja, y la bandera de la casa encima.
        sillares(c, 10, 5, 38, 11)
        for (let a = 0; a < 4; a++) { const ax = 13 + a * 9; c.rect(ax, 9, 5, 7, "A"); c.px(ax, 9, "C"); c.px(ax + 4, 9, "C"); c.rect(ax + 1, 13, 3, 3, a % 2 ? "K" : "q") }
        tejado(c, 8, 5, 42, 5)
        puesto(c, 1, 13, "7", "W", TRIGO); puesto(c, 43, 14, "7", "W", PIEDRAS)
        fuente(c, 29, 25)
        persona(c, 20, 29, "q"); persona(c, 38, 30, "Z", "J"); persona(c, 12, 30, "3", "0"); persona(c, 24, 26, "7", "h")
        c.ellipse(48, 29, 2, 2, "0"); c.px(47, 27, "h")
        return
      }
      if (n === 2) {
        puesto(c, 9, 7, "R", "W", TRIGO); puesto(c, 33, 9, "3", "W", PIEDRAS)
        persona(c, 27, 29, "q"); persona(c, 18, 30, "3", "0")
        return
      }
      puesto(c, 2, 9, "R", "W", TRIGO); puesto(c, 22, 4, "Z", "W", ORO); puesto(c, 42, 10, "3", "W", PIEDRAS)
      if (n === 4) { fuente(c, 29, 26); persona(c, 36, 28, "7", "h") }
      persona(c, 20, 29, "q"); persona(c, 38, 30, "Z", "J"); persona(c, 12, 30, "3", "0")
      c.ellipse(48, 28, 2, 2, "0"); c.px(47, 26, "h")
      if (n === 3) c.ellipse(29, 29, 2, 2, "W")
    },
  ]
}

const TAMANO = { granja: [64, 40], aserradero: [52, 38], cantera: [52, 34], mina: [52, 40], mercado: [58, 32] }
const DIBUJO = { granja, aserradero, cantera, mina, mercado }
for (const [nombre, [w, h]] of Object.entries(TAMANO))
  for (let n = 1; n <= 5; n++) sprite(`${nombre}_${n}`, { w, h, outline: "k", pivot: "bottom" }, ...DIBUJO[nombre](n))

// Lámina de revisión: cada edificio en sus 5 niveles, en filas.
scene("edificios", { w: 5 * 68 + 4, h: 5 * 46 + 4, bg: "4" },
  layer("piezas", ...Object.keys(TAMANO).flatMap((nombre, f) =>
    [1, 2, 3, 4, 5].map((n) => stamp(`${nombre}_${n}`, 2 + (n - 1) * 68 + 34, 2 + (f + 1) * 46 - 2)))),
)

// ================================================================ el fondo
// Nube cúmulo: montones redondos, la cara del sol cálida, la de abajo fría y plana.
function nube(c, x, y, w, alto) {
  const n = Math.max(3, Math.round(w / 6))
  for (let i = 0; i < n; i++) {
    const cx = x + (i + 0.5) * (w / n), r = alto * (0.55 + Math.sin(((i + 0.5) / n) * Math.PI) * 0.45) * (0.85 + rnd(i, x) * 0.3)
    for (let yy = -Math.ceil(r); yy <= 0; yy++) for (let xx = -Math.ceil(r * 1.2); xx <= Math.ceil(r * 1.2); xx++) {
      if ((xx / 1.2) ** 2 + yy * yy > r * r) continue
      const luz = (-xx * 0.6 - yy * 0.8) / r
      c.px(Math.round(cx + xx), y + yy, luz > 0.35 ? "N" : luz > -0.2 ? "n" : "d")
    }
  }
  for (let xx = x - 1; xx < x + w + 1; xx++) if (bayer(xx, y) < 0.6) c.px(xx, y + 1, "d")
}
function abeto(c, x, base, alto, oscuro = false) {
  for (let yy = 0; yy < alto; yy++) {
    const r = Math.round((yy / alto) * (alto / 3)) + (yy % 3 === 2 ? 1 : 0)
    for (let xx = -r; xx <= r; xx++) c.px(x + xx, base - alto + yy, oscuro ? (xx < 0 ? "2" : "1") : xx < -r / 3 ? "3" : xx > r / 3 ? "1" : "2")
  }
  c.px(x, base, "h")
}
// Árbol de copa redonda: masa oscura y montones con la cara del sol.
function arbol(c, x, y, r, tronco = 4) {
  c.vline(x, y + r - 2, tronco, "h"); c.vline(x + 1, y + r - 2, tronco, "H")
  c.ellipse(x, y, r, r - 1, "1")
  for (let i = 0; i < 9; i++) {
    const a = -2.4 + rnd(x + i, y) * 3.6, d = rnd(i, x) * (r - 2)
    const bx = Math.round(x + Math.cos(a) * d), by = Math.round(y - 1 + Math.sin(a) * d * 0.7)
    c.ellipse(bx, by, 2, 2, "2"); c.px(bx - 1, by - 1, "3"); c.px(bx - 1, by - 2, "4")
  }
  c.ellipse(x - 2, y - r + 2, 2, 1, "4"); c.px(x - 3, y - r + 2, "5")
}
// La montaña de la derecha: dos picos, la cara del sol cálida, la de sombra fría, nieve y grietas.
const PICOS = [[176, 12, 0.7], [140, 36, 0.95]]
const alturaPico = (x, p) => p[1] + Math.abs(x - p[0]) * p[2]
const picoDe = (x) => PICOS.reduce((a, p) => (alturaPico(x, p) < alturaPico(x, a) ? p : a))
sprite("fondo", { w: W, h: H }, (c) => {
  // cielo de media tarde: azul arriba, crema cálida junto al horizonte y alrededor del sol
  for (let y = 0; y < 82; y++) for (let x = 0; x < W; x++) {
    const sol = Math.hypot(x - 30, (y - 18) * 1.3)
    c.px(x, y, tonoSuave("abcdnN", y / 70 + Math.max(0, 1 - sol / 70) * 0.35, x, y))
  }
  for (let y = 8; y < 30; y++) for (let x = 18; x < 44; x++) { const d = Math.hypot(x - 30, y - 18); if (d < 5) c.px(x, y, "N"); else if (d < 7 && bayer(x, y) < 0.5) c.px(x, y, "N") }
  nube(c, 8, 34, 30, 6); nube(c, 70, 18, 22, 5); nube(c, 112, 30, 16, 4); nube(c, 150, 12, 14, 3)
  for (const [bx, by] of [[60, 30], [66, 27], [71, 31]]) { c.px(bx, by, "l"); c.px(bx + 1, by - 1, "l"); c.px(bx + 2, by, "l"); c.px(bx - 1, by - 1, "l") }
  // cordillera lejana, en la bruma, con nieve
  for (let x = 0; x < W; x++) {
    const v = Math.sin(x / 17 + 1) * 0.5 + Math.sin(x / 7.3) * 0.25 + Math.sin(x / 3.1) * 0.08
    const pico = Math.max(0, 1 - Math.abs((x % 58) - 29) / 18)
    const top = Math.round(56 - 13 * (0.45 + 0.4 * v + 0.6 * pico * pico))
    const sol = (x % 58) < 29
    for (let y = top; y < 82; y++) c.px(x, y, y < top + 4 && pico > 0.35 ? (sol ? "u" : "U") : y < top + 2 ? "M" : "m")
  }
  for (let x = 0; x < W; x++) {
    const top = Math.round(64 - 7 * (0.5 + Math.sin(x / 13 + 2) * 0.4 + Math.sin(x / 5) * 0.15))
    for (let y = top; y < 82; y++) c.px(x, y, y < top + 1 ? "L" : tono("lL", 0.6 - (y - top) / 20, x, y))
  }
  // colinas lejanas con campos en mosaico, setos y arbolillos
  for (let x = 0; x < W; x++) {
    const top = Math.round(72 + Math.sin(x / 24) * 3 + Math.sin(x / 9) * 1.3)
    for (let y = top; y < H; y++) {
      const parcela = Math.floor((x + y * 1.7) / 14) * 7 + Math.floor(y / 4)
      const tipo = rnd(parcela, 3)
      let k = tipo < 0.35 ? tono("345", 0.55, x, y) : tipo < 0.6 ? tono("xX", 0.6, x, y) : tipo < 0.75 ? "g" : tono("45", 0.4, x, y)
      if ((x + Math.round(y * 1.7)) % 14 === 0 || (y % 4 === 0 && rnd(parcela, 9) < 0.5)) k = "2"
      if (y === top) k = "5"
      c.px(x, y, k)
    }
  }
  for (let i = 0; i < 26; i++) { const x = Math.round(rnd(i, 31) * W), y = 75 + Math.round(rnd(i, 32) * 8); c.px(x, y, "1"); c.px(x, y - 1, "2"); c.px(x - 1, y, "2") }
  // la montaña de la derecha, que baja hasta el prado
  for (let x = 102; x < W; x++) {
    const p = picoDe(x), top = Math.round(alturaPico(x, p) + Math.sin(x / 3.1) * 0.8 + Math.sin(x / 1.7) * 0.4)
    const pie = 100 - Math.max(0, 126 - x) * 0.9
    for (let y = top; y < pie; y++) {
      const sol = x < p[0] - (y - top) * 0.12
      let v = sol ? 0.78 - (y - top) / 90 : 0.3 - (x - p[0]) / 160
      v += (rnd(x >> 2, y >> 1) - 0.5) * 0.18
      let k = tono(ROCA, v, x, y)
      if (p === PICOS[0] && y < 22 + Math.round(Math.sin(x / 2.3) * 1.5 + Math.sin(x / 5.1) * 2)) k = sol ? "u" : "U"
      if (y > pie - 6) k = tono("1234", (y - (pie - 6)) / 6 * 0.6 + 0.2, x, y)
      c.px(x, y, k)
    }
    if (x < p[0]) c.px(x, top, p === PICOS[0] && top < 24 ? "u" : "Y")
  }
  for (let i = 0; i < 80; i++) {
    const x = 106 + Math.round(rnd(i, 21) * 88), y0 = Math.round(alturaPico(x, picoDe(x))) + 4 + Math.round(rnd(i, 22) * 46), len = 3 + Math.round(rnd(i, 23) * 5)
    for (let j = 0; j < len; j++) { const xx = x + j, yy = y0 + Math.round(j * 0.45); const k = c.key(xx, yy); if (k && "sSvVY".includes(k)) { c.px(xx, yy, OSCURO[k] ?? k); if (c.key(xx, yy - 1) === "V") c.px(xx, yy - 1, "Y") } }
  }
  for (let i = 0; i < 16; i++) abeto(c, 108 + i * 5.5 + Math.round(rnd(i, 2) * 4), 88 + Math.round(rnd(i, 5) * 8), 8 + Math.round(rnd(i, 6) * 5), i % 3 === 0)
  // bruma baja al pie de los montes
  for (let y = 70; y < 80; y++) for (let x = 0; x < 110; x++) if (bayer(x, y) < 0.25 - Math.abs(y - 75) * 0.05) c.px(x, y, "M")
  // el bosque de la izquierda, detrás del aserradero
  for (let i = 0; i < 20; i++) arbol(c, Math.round(i * 3.8 - 4 + rnd(i, 3) * 3), 69 + Math.round(rnd(i, 4) * 6) + (i % 2) * 3, 6 + Math.round(rnd(i, 9) * 2))
  for (let i = 0; i < 7; i++) abeto(c, 4 + i * 10, 86, 11 + (i % 3) * 2)
  // prado cercano: más oscuro y verde cuanto más cerca
  for (let y = 86; y < H; y++) for (let x = 0; x < W; x++) {
    const k = c.key(x, y)
    if (k && "sSvVY".includes(k)) continue
    if (y < 94 && k && !"12345xXg".includes(k)) continue
    c.px(x, y, tono("2345", 0.62 - (y - 86) / 50 * 0.32 + Math.sin(x / 9 + y / 5) * 0.06, x, y))
  }
  // el arroyo del aserradero, con brillos y piedras en la orilla
  for (let y = 84; y < 108; y++) {
    const cx = 13 - (y - 84) * 0.5 + Math.sin(y / 3) * 1.2, half = 2 + (y - 84) * 0.08
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) c.px(x, y, (x + y * 2) % 7 === 0 ? "O" : (x + y) % 3 === 0 ? "P" : "Z")
    c.px(Math.round(cx - half) - 1, y, y % 3 ? "1" : "D"); c.px(Math.round(cx + half) + 1, y, y % 4 ? "5" : "E")
  }
  // la loma del castillo: un otero de roca con hierba arriba
  for (let y = 96; y < 118; y++) for (let x = 30; x < 166; x++) {
    const dx = (x - 98) / 66, dy = (y - 105) / 12
    if (dx * dx + dy * dy > 1) continue
    const arriba = dx * dx + ((y - 102) / 8) ** 2 < 1
    c.px(x, y, arriba ? tono("3456", 0.75 - (y - 96) / 30 - dx * 0.2, x, y) : tono("efg", 0.55 - dx * 0.3 + (rnd(x >> 1, y) - 0.5) * 0.3, x, y))
  }
  // matas de hierba y flores
  for (let i = 0; i < 300; i++) {
    const x = Math.round(rnd(i, 11) * W), y = 92 + Math.round(Math.pow(rnd(i, 12), 0.8) * 43)
    const k = c.key(x, y)
    if (k && "2345".includes(k)) { c.px(x, y - 1, k === "2" ? "3" : "5"); if (y > 112) { c.px(x + 1, y - 2, "5"); c.px(x - 1, y - 1, "4") } }
  }
  for (let i = 0; i < 70; i++) { const x = Math.round(rnd(i, 7) * W), y = 108 + Math.round(rnd(i, 8) * 27); const k = c.key(x, y); if (k && "2345".includes(k)) { c.px(x, y, ["q", "I", "W", "p"][i % 4]); if (i % 3 === 0) c.px(x, y + 1, "2") } }
  // el camino: tierra con piedras, rodadas y borde oscuro
  for (let y = 110; y < H; y++) {
    const t = (y - 110) / (H - 110), cx = 98 + Math.sin(t * 3) * 6 * t, half = 4 + t * 10
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const d = Math.abs(x - cx) / half
      c.px(x, y, d > 0.85 ? "f" : tono(TIERRA, 0.62 - d * 0.25 + (rnd(x, y) - 0.5) * 0.25, x, y))
    }
    if (y % 2 === 0) { c.px(Math.round(cx - half * 0.45), y, "f"); c.px(Math.round(cx + half * 0.45), y, "f") }
    if (rnd(y, 5) < 0.3) { const sx = Math.round(cx + (rnd(y, 6) - 0.5) * half * 1.4); c.px(sx, y, "E"); c.px(sx, y + 1, "C") }
  }
  // la rampa de la puerta sube por el otero
  for (let y = 102; y < 111; y++) for (let x = 93; x < 104; x++) c.px(x, y, tono(TIERRA, 0.6 - Math.abs(x - 98.5) / 12, x, y))
  // poste con cartel junto al camino
  c.vline(118, 120, 9, "h"); c.rect(114, 118, 9, 4, "J"); c.hline(114, 118, 9, "i"); c.hline(114, 121, 9, "H"); c.px(116, 120, "h"); c.px(119, 120, "h")
  // ovejas en el prado
  for (const [ox, oy] of [[64, 120], [70, 123], [76, 119]]) { oveja(c, ox, oy); c.hline(ox, oy + 3, 5, "2") }
  // matorral en la esquina de abajo a la derecha
  for (let i = 0; i < 6; i++) { const bx = 182 + i * 3, by = 128 + (i % 2) * 2; c.ellipse(bx, by, 4, 3, "1"); c.ellipse(bx - 1, by - 1, 2, 2, "2"); c.px(bx - 2, by - 2, "3") }
})

// ================================================================ la escena entera, para revisarla
// Sitios de cada pieza (pivote abajo en el centro): los mismos que SITES en castleScene.ts.
const SITIOS = {
  castillo: [98, 106],
  aserradero: [30, 92],
  cantera: [166, 70],
  mina: [171, 110],
  granja: [33, 133],
  mercado: [150, 131],
}
function escena(nombre, etapa, nv = { granja: 3, aserradero: 3, cantera: 3, mina: 3, mercado: 3 }) {
  const [sx, sy] = SITIOS.castillo
  const pieza = (b) => stamp(`${b}_${nv[b]}`, ...SITIOS[b])
  scene(nombre, { w: W, h: H, bg: "n" },
    layer("fondo", stamp("fondo", 0, 0)),
    layer("lejos", pieza("aserradero"), pieza("cantera")),
    layer("castillo", stamp(`castillo_${etapa}`, sx, sy),
      stamp("escudo_muestra", sx - (CW + 2) / 2 + 1 + CX - 8, sy - CH - 2 + 1 + CB - ESCUDO_EN[etapa] - (etapa === 2 ? 20 : 0))),
    layer("cerca", pieza("mina"), pieza("granja"), pieza("mercado")),
  )
}
escena("escena", 3)
for (let e = 1; e <= 5; e++) escena(`escena_${e}`, e)
// Cómo empieza una partida (granja y aserradero a 2, el resto a 1) y cómo puede acabar.
escena("escena_inicio", 1, { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 })
escena("escena_final", 5, { granja: 5, aserradero: 5, cantera: 5, mina: 5, mercado: 5 })

// Lámina de revisión: las 5 etapas en fila sobre la hierba, cada una con el color de otra casa.
const COLORES = [
  { 7: "#b3291d", 8: "#7a1a12", 9: "#e0533f" },  // gules
  { 7: "#1b3c80", 8: "#10264f", 9: "#3f68b8" },  // azur
  { 7: "#246b2a", 8: "#154119", 9: "#3f9446" },  // sinople
  { 7: "#a23c9e", 8: "#6a2367", 9: "#cc66c8" },  // púrpura
  { 7: "#a84e0f", 8: "#6e3108", 9: "#d87a34" },  // naranjado
]
const PASO = CW + 4
scene("lamina", { w: 5 * PASO + 4, h: CH + 8, bg: "d" },
  layer("suelo", rect(0, CH, 5 * PASO + 4, 8, "4"), rect(0, CH + 3, 5 * PASO + 4, 5, "3")),
  layer("castillos", ...[1, 2, 3, 4, 5].flatMap((e) => {
    const x = 2 + (e - 1) * PASO + (CW + 2) / 2
    return [stamp(`castillo_${e}`, x, CH + 3, { swap: COLORES[e - 1] }),
      stamp("escudo_muestra", x - (CW + 2) / 2 + 1 + CX - 8, CH + 3 - CH - 2 + 1 + CB - ESCUDO_EN[e] - (e === 2 ? 20 : 0), { swap: COLORES[e - 1] })]
  })),
)
