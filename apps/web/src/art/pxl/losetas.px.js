// Piezas del mapa del bloque 1 (world.ts): la Aldea y las Ruinas.
// Paleta: las letras y colores de WORLD (tiles.ts). Sin contorno: world.ts lo pone al pintar.
// Luz desde arriba a la izquierda, como el resto del mapa (tejados claros a la izquierda).
// Al juego:  node scripts/pxl-a-juego.mjs apps/web/src/art/pxl/losetas.px.js aldea ruinas --mapa --salida apps/web/src/art/losetas.ts
pal({
  k: "#1c1410",
  "1": "#22401f", "2": "#365f2b", "3": "#4f8035", "4": "#73a443", "5": "#9fc558", "6": "#c9df7e",
  e: "#45291a", E: "#694328", f: "#8f633b", F: "#b98c58",
  w: "#71500f", W: "#ad8126", y: "#dcb446", Y: "#f3da82",
  s: "#36333d", S: "#57535e", t: "#827d8a", T: "#aaa5b1", u: "#d4d0d9", n: "#ffffff",
  b: "#143a5e", B: "#1f5384", c: "#3477ae", C: "#6eb0df",
  h: "#3a2213", H: "#663c1f", j: "#956132", J: "#c18849",
  r: "#5f1f15", R: "#9c3626", q: "#cf5639",
  v: "#efe6cf", V: "#c2b597",
})

// ----------------------------------------------------------------- casitas
// Tejado a dos aguas visto de frente: claro a la izquierda, oscuro a la derecha.
function roof(x, y, w, lit, mid, dark) {
  const items = []
  const rh = Math.ceil(w / 2)
  for (let i = 0; i < rh; i++) {
    const x0 = x + rh - 1 - i
    const x1 = x + w - rh + i
    items.push(hline(x0, y + i, Math.floor((x0 + x1) / 2) - x0, lit))
    items.push(hline(Math.floor((x0 + x1) / 2), y + i, 1, mid))
    items.push(hline(Math.floor((x0 + x1) / 2) + 1, y + i, x1 - Math.floor((x0 + x1) / 2), dark))
  }
  return items
}
// Casa de adobe con vigas, puerta y ventana.
function house(x, y, w, tejado) {
  const [lit, mid, dark] = tejado
  const rh = Math.ceil(w / 2)
  const wy = y + rh
  return [
    ...roof(x, y, w, lit, mid, dark),
    rect(x, wy, w, 6, "v"),
    vline(x + w - 1, wy, 6, "V"),
    hline(x, wy + 5, w, "V"),
    hline(x, wy, w, "j"),
    rect(x + Math.floor(w / 2), wy + 3, 1, 3, "h"),
    px(x + 2, wy + 2, "C"),
    px(x + w - 3, wy + 2, "C"),
  ]
}
const ROJO = ["q", "R", "r"]
const PIZARRA = ["t", "S", "s"]
const PAJA = ["Y", "y", "W"]

sprite("aldea", { w: 46, h: 34 },
  // Ermita al fondo: muros de piedra, tejado de pizarra y espadaña con campana.
  rect(17, 9, 14, 9, "T"),
  vline(30, 9, 9, "t"),
  hline(17, 17, 14, "t"),
  ...roof(16, 4, 16, "t", "S", "s"),
  rect(21, 0, 5, 6, "T"),
  vline(25, 0, 6, "t"),
  px(22, 0, "u"), px(24, 0, "u"),
  px(23, 2, "y"), px(23, 3, "W"),
  rect(23, 13, 2, 5, "h"),
  px(19, 11, "C"), px(28, 11, "C"),
  // Casas alrededor, cada una con su tejado.
  ...house(0, 12, 13, ROJO),
  ...house(34, 11, 12, PAJA),
  ...house(4, 23, 12, PIZARRA),
  ...house(30, 22, 14, ROJO),
  // Pozo en la plaza, con su tejadillo.
  hline(20, 22, 7, "h"),
  hline(21, 21, 5, "j"),
  vline(21, 23, 4, "h"), vline(25, 23, 4, "h"),
  px(23, 24, "j"), px(23, 25, "j"),
  rect(20, 27, 7, 4, "T"),
  hline(20, 30, 7, "t"),
  vline(26, 27, 4, "t"),
  hline(21, 27, 5, "s"),
  // Camino de tierra de la plaza y un huerto con cerca.
  grid(17, 31, `
    .FfF.fF..fF
    fFfFfFFfFfF`),
  hline(17, 22, 3, "j"), px(17, 21, "h"), px(19, 21, "h"),
  px(18, 20, "4"), px(17, 19, "5"),
)

// ----------------------------------------------------------------- ruinas
// Dibujadas a mano: torre partida, arco caído con su pilar, muro mordido, hiedra y cascotes.
sprite("ruinas", `
  ..........................uT..T.........
  .........................TTTT.TT.T......
  .........................TuTTTTTTt......
  .........................TTtTTtTTt......
  ..........Tt.............tttttttts......
  .........TTt.............TTTtTTTTt......
  ........TTt..............TTTTsTTTt......
  .......TTt...............TuTTsTtTt......
  .......Tt................ttttsttts......
  .......TT...........3....TTtTTTTTt......
  .......TTTt.........43...TTTTTtTTt......
  .......TuTt.........T3...TTTTTTTTs......
  .......TTTt.......TTTt...tttttttts......
  ......tTTTt.......TuTt..3TTTtTTTTt......
  ......TTtTt.......TTTt..4TTTTTTtTt......
  .T..TTTTTTt.......TTtt..43TTTTTTTt......
  TTT.TTuTTTs.......tTTt...ttttttts.......
  TTTTTTTTTts.......TTTt...TTTTtTTTt......
  ttttttttTts.......TTts...TTtTTTTTt......
  TTtTTTTTTTs.......TTTt..TTTTTTTTTts.....
  TTTTtTTTTts..34...TtTt..TTTTTTtTTts.....
  ttttttttTts.453...TTTt.4TTTTTTTTTts.4...
  SSSSSSSSSSs.......SSSs..SSSSSSSSSSs.43..
  ...tT.......StT.tS........tT.St..tS.....
  ..tSSs.....tSSS.SSs......tSS.SSs.SSs....`)

// ----------------------------------------------------------------- prueba a x1,5
// La misma aldea dibujada con 1,5 veces más píxeles (69x51) para ver, a igual tamaño en
// pantalla, cuánto detalle se gana (bloque 1, fase 4). No va al juego.
function house15(x, y, w, tejado, chimenea) {
  const [lit, mid, dark] = tejado
  const rh = Math.ceil(w / 2)
  const wy = y + rh
  return [
    ...(chimenea ? [rect(x + w - 6, y + 1, 3, 5, "S"), vline(x + w - 4, y + 1, 5, "s"), px(x + w - 6, y, "t"), px(x + w - 5, y, "t")] : []),
    ...roof(x, y, w, lit, mid, dark),
    // Hilera de tejas más oscura cada dos filas.
    ...Array.from({ length: Math.floor(rh / 2) }, (_, i) => hline(x + rh - 1 - (2 * i + 1) + 1, y + 2 * i + 1, 1, dark)),
    rect(x, wy, w, 9, "v"),
    vline(x + w - 1, wy, 9, "V"), vline(x + w - 2, wy + 1, 8, "V"),
    hline(x, wy + 8, w, "V"),
    hline(x, wy, w, "j"), hline(x, wy + 1, w, "H"),
    // Entramado de madera.
    vline(x, wy, 9, "j"), vline(x + Math.floor(w / 2) - 3, wy, 9, "j"),
    // Puerta con dintel y ventanas con contraventanas.
    rect(x + Math.floor(w / 2), wy + 4, 3, 5, "h"), hline(x + Math.floor(w / 2) - 1, wy + 3, 5, "j"), px(x + Math.floor(w / 2) + 2, wy + 6, "J"),
    rect(x + 2, wy + 3, 2, 2, "C"), px(x + 1, wy + 3, "R"), px(x + 4, wy + 3, "R"), hline(x + 1, wy + 5, 4, "3"),
    rect(x + w - 5, wy + 3, 2, 2, "C"), px(x + w - 6, wy + 3, "R"), px(x + w - 3, wy + 3, "R"),
  ]
}
sprite("aldea_x15", { w: 69, h: 51 },
  // Ermita con espadaña, campana y rosetón.
  rect(25, 14, 21, 13, "T"), rect(43, 14, 3, 13, "t"), hline(25, 26, 21, "t"),
  hline(25, 18, 18, "t"), hline(25, 22, 18, "t"),
  ...roof(23, 6, 25, "t", "S", "s"),
  rect(31, 0, 8, 9, "T"), vline(37, 0, 9, "t"), vline(38, 0, 9, "t"),
  px(32, 0, "u"), px(34, 0, "u"), px(36, 0, "u"),
  rect(33, 2, 3, 4, "s"), px(34, 3, "y"), px(34, 4, "W"), px(33, 5, "W"), px(35, 5, "W"),
  rect(34, 20, 3, 7, "h"), hline(33, 19, 5, "t"), px(35, 22, "j"),
  ring(35, 15, 1, "s"), px(35, 15, "C"),
  // Casas alrededor de la plaza.
  ...house15(0, 17, 19, ROJO, true),
  ...house15(50, 15, 18, PAJA, false),
  ...house15(6, 33, 18, PIZARRA, true),
  ...house15(45, 32, 21, ROJO, true),
  // Pozo con tejadillo, cubo y cuerda.
  ...roof(29, 30, 11, "j", "H", "h"),
  vline(30, 35, 6, "h"), vline(38, 35, 6, "h"),
  vline(34, 35, 3, "V"), rect(33, 38, 3, 2, "j"),
  rect(29, 41, 11, 5, "T"), hline(29, 45, 11, "t"), vline(38, 41, 5, "t"), vline(39, 41, 5, "S"),
  hline(30, 41, 8, "s"),
  // Una vecina con su cántaro y unas gallinas.
  px(42, 41, "R"), rect(41, 42, 3, 3, "R"), px(42, 40, "F"), px(42, 39, "h"), px(44, 42, "W"), px(41, 45, "h"), px(43, 45, "h"),
  grid(20, 44, `
    .v..v.
    vvV.vV
    .j..j.`),
  // Plaza de tierra y huerto con cerca.
  grid(25, 47, `
    .FfF.fFfF.fFf.
    fFfFfFFfFfFfFfF
    .fF.FfF.fFf.F..`),
  hline(0, 48, 14, "j"), px(0, 47, "h"), px(4, 47, "h"), px(9, 47, "h"), px(13, 47, "h"),
  px(2, 46, "4"), px(6, 45, "5"), px(10, 46, "4"), px(11, 45, "3"),
)

// ----------------------------------------------------------------- vista previa sobre hierba
sprite("_aldea_k", { w: 48, h: 36, outline: "k" }, stamp("aldea", 1, 1))
sprite("_ruinas_k", { w: 42, h: 28, outline: "k" }, stamp("ruinas", 1, 1))
sprite("_aldea15_k", { w: 71, h: 53, outline: "k" }, stamp("aldea_x15", 1, 1))
scene("_vista", { w: 104, h: 44, bg: "3" },
  noise(0, 0, 104, 44, "45", 0.18, 3),
  stamp("_aldea_k", 3, 4),
  stamp("_ruinas_k", 58, 10),
)
