// Escena "pregonero" de la maqueta del bloque 13, rehecha con pxl para probar la herramienta.
// La original está en ../scenes.js (S.pregonero, plazaLay, crierLay, villagerLay).
// Uso, desde la raíz del repositorio:
//   node .claude/skills/pxl-pixel-art/bin/pxl.js build docs/maquetas/bloque13/pxl/pregonero.px.js --out <carpeta>
pal({
  k: "#1a1410",                                   // tinta (el contorno de la maqueta)
  s: "#8ec8f0", S: "#b4dcf6", Q: "#d8eefa",       // cielo
  c: "#f2e8d0", C: "#e8d4a8", e: "#c8b08a",       // revoque
  b: "#5a3a1c", B: "#3a2414",                     // vigas, zapatos
  r: "#a8321f", R: "#7a2418", q: "#c8503a",       // tejas
  w: "#2a3a5a", W: "#4a6a9a",                     // cristal
  g: "#a09484", G: "#8e8274", j: "#6a6058",       // adoquines
  p: "#7a46b0", P: "#5b2a86", v: "#3e1a5c",       // capa del pregonero
  y: "#fbe39a", Y: "#e8b83a", o: "#a97e14",       // oro
  f: "#f8d4b0", F: "#ebb48a", n: "#c4855a",       // piel
  h: "#3a8a4a", H: "#2a6a3a", i: "#1e4a2a",       // sombrero
  x: "#e8e0d0", m: "#7a2a20", l: "#e2585e",       // pluma, boca, flores
  L: "#4c8a44",                                   // hojas
  a: "#6f9a4e", A: "#4f7a2e", u: "#4e7ac8", U: "#2e5aa8", // aldeanos
  t: "#6b4220", T: "#c8a060",                     // pelo
  d: "#f2e6cc", D: "#c8b48a",                     // papel del bando
})
ramps("kBbeCc", "kRrq", "kwW", "jGg", "kvPp", "oYy", "nFf", "iHh", "AaL", "Uu")

// ------------------------------------------------------------- piezas pequeñas
sprite("_ventana", { w: 8, h: 11 },
  rect(0, 0, 8, 9, "b"), rect(1, 1, 6, 7, "w"), px(2, 2, "W"), px(5, 2, "W"),
  vline(4, 1, 7, "b"), hline(1, 4, 6, "b"), rect(0, 9, 8, 2, "r"), hline(0, 10, 8, "R"))
sprite("_jardinera", `
  .l.L.l.L
  LlLlLLlL
  bbbbbbbb`)
sprite("_cartel_pan", { w: 14, h: 12, outline: "k" },      // la tahona: el recurso se llama Pan
  vline(3, 0, 3, "B"), vline(10, 0, 3, "B"), rect(0, 3, 14, 9, "b"), rect(1, 4, 12, 7, "C"),
  ellipse(7, 7.5, 4, 2.5, "Y"), hline(4, 7, 7, "y"), px(5, 6, "o"), px(8, 6, "o"))

// Casa con entramado: revoque, vigas cada 12 px, tejado a dos aguas, ventanas.
function casa(c, hx, hw, top, revoque, conCartel) {
  c.rect(hx, top, hw, 140 - top, revoque)
  for (let x = hx; x < hx + hw; x += 12) c.vline(x, top, 140 - top, "b")
  c.vline(hx + hw - 1, top, 140 - top, "b")
  for (let y = top; y < 140; y += 18) c.hline(hx, y, hw, "b")
  // tejado: hiladas de tejas con juntas desplazadas, el alero hace sombra
  for (let y = top - 14; y < top; y++) {
    const r = (y - top + 14) * (hw / 28), x0 = Math.round(hx + hw / 2 - r), x1 = Math.round(hx + hw / 2 + r)
    for (let x = x0; x < x1; x++) c.px(x, y, (y - top) % 3 === 0 ? "R" : (x + (y % 6 < 3 ? 0 : 2)) % 4 === 0 ? "R" : x < hx + hw / 2 ? "q" : "r")
  }
  c.hline(hx - 1, top, hw + 2, "R")
  for (let wy = top + 4; wy < 120; wy += 18) for (let wx = hx + 3; wx < hx + hw - 6; wx += 12) {
    c.stamp("_ventana", wx - 1, wy)
    if ((wx + wy) % 3 === 0) c.stamp("_jardinera", wx - 1, wy + 8)
  }
  if (conCartel) c.stamp("_cartel_pan", hx + 5, 100)
}

// ------------------------------------------------------------- pregonero
// Brazo derecho con la campana: arriba (tañe) o a media altura; la mano izquierda sostiene el bando.
function pregonero(c, arriba) {
  const by = arriba ? 4 : 10
  c.rect(11, 50, 5, 6, "B"); c.rect(20, 50, 5, 6, "B")
  c.poly([10, 24, 26, 24, 33, 51, 3, 51], "P")
  c.poly([10, 24, 12, 24, 6, 51, 3, 51], "p")               // lado iluminado
  c.poly([24, 24, 26, 24, 33, 51, 29, 51], "v")             // lado en sombra
  c.hline(4, 49, 29, "v")                                    // dobladillo
  c.rect(16, 24, 4, 27, "Y"); c.vline(19, 24, 27, "o"); c.ellipse(18, 33, 3, 3, "y")
  c.ellipse(18, 15, 6, 6.5, "f"); c.clip((x, y) => ((x + 0.5 - 18) / 6) ** 2 + ((y + 0.5 - 15) / 6.5) ** 2 <= 1, () => c.ellipse(20, 17, 6, 6.5, "F")); c.ellipse(17, 14, 5, 5.5, "f")
  c.px(15, 13, "F"); c.px(16, 13, "F"); c.px(20, 13, "F"); c.px(21, 13, "F")   // cejas
  c.px(16, 14, "k"); c.px(20, 14, "k"); c.px(18, 16, "F"); c.hline(17, 18, 3, "m")
  c.px(14, 16, "n"); c.px(22, 16, "n")
  c.rect(9, 6, 18, 3, "H"); c.hline(9, 8, 18, "i"); c.rect(12, 1, 12, 6, "H"); c.hline(12, 1, 12, "h")
  c.line(24, 6, 31, -1, "x"); c.line(25, 6, 31, 0, "x")
  // brazo y campana
  c.line(26, 27, 30, by + 8, "P"); c.line(27, 27, 31, by + 8, "v"); c.ellipse(30, by + 6, 2.2, 2.2, "f")
  for (let yy = by - 4; yy < by + 4; yy++) {
    const hw = 1.5 + (yy - by + 4) * 0.45
    for (let xx = Math.round(31 - hw); xx < Math.round(31 + hw); xx++) c.px(xx, yy, xx < 31 ? "y" : "Y")
  }
  c.px(31, by + 4, "o")
  // brazo izquierdo con el bando enrollado
  c.line(10, 27, 6, 35, "P"); c.line(9, 27, 5, 35, "p")
  c.rect(0, 33, 9, 12, "d"); c.hline(0, 33, 9, "D"); c.hline(0, 44, 9, "D")
  for (let ly = 36; ly < 43; ly += 2) c.hline(1, ly, ly === 42 ? 4 : 7, "D")
  c.ellipse(5, 43, 1.6, 1.6, "l"); c.ellipse(7, 34, 2.2, 2.2, "f")
}
anim("pregonero", { w: 36, h: 56, fps: 4, outline: "k", pivot: "bottom", facing: "front", height: 1.8 },
  frame((c) => pregonero(c, true)), frame((c) => pregonero(c, false)))

// ------------------------------------------------------------- aldeanos
sprite("aldeano", { w: 18, h: 34, outline: "k", pivot: "bottom", facing: "front", height: 1.6 },
  poly([4, 14, 14, 14, 17, 32, 1, 32], "A"), poly([4, 14, 6, 14, 3, 32, 1, 32], "a"),
  rect(5, 31, 3, 3, "B"), rect(10, 31, 3, 3, "B"),
  ellipse(9, 8, 4.6, 5, "F"), ellipse(8.5, 7.5, 4, 4.4, "f"),
  rect(4, 3, 10, 3, "T"), grid(7, 8, "k..k"), px(9, 11, "F"))
sprite("aldeana", { base: "aldeano", swap: { A: "U", a: "u", T: "t" } })
anim("aldeano_asiente", { w: 20, h: 37, fps: 2, pivot: "bottom" }, frame(stamp("aldeano", 10, 36)), frame(stamp("aldeano", 10, 37)))

// ------------------------------------------------------------- escena
// El fondo (cielo, casas y adoquines) es un dibujo aparte, "plaza", para que el
// juego lo pinte una vez y ponga encima al pregonero y a los aldeanos.
function casas(c) {
  casa(c, -4, 52, 30, "c", false)
  casa(c, 48, 64, 44, "C", true)
  casa(c, 112, 52, 24, "c", false)
  // puerta en arco de la casa del medio
  c.rect(54, 118, 14, 22, "b"); c.ellipse(61, 118, 7, 5, "b"); c.rect(55, 119, 12, 21, "B"); c.vline(61, 115, 25, "b"); c.px(64, 129, "Y")
}
function adoquines(c) {
  for (let y = 140; y < 176; y++) for (let x = 0; x < 160; x++) {
    const r = Math.floor((y - 140) / 5), o = (r % 2) * 4
    const junta = (y - 140) % 5 === 4 || (x + o) % 8 === 7
    c.px(x, y, junta ? "j" : hash(Math.floor((x + o) / 8), r, 3) > 0.5 ? "g" : "G")
  }
}
sprite("plaza", { w: 160, h: 176 }, grad(0, 0, 160, 40, "sSQ"), casas, adoquines)

scene("pregonero_plaza", { w: 160, h: 176, world: { scale: 22, ground: 160, light: [-0.6, -1] } },
  layer("cielo", grad(0, 0, 160, 40, "sSQ")),
  layer("casas", casas),
  layer("suelo", adoquines),
  layer("sombras", { shade: true },
    ellipse(80, 160, 15, 2, "k"), ellipse(25, 158, 8, 1.5, "k"), ellipse(135, 160, 8, 1.5, "k")),
  layer("gente", { sort: "y" },
    stamp("aldeano_asiente", 25, 160), stamp("aldeana", 135, 160), stamp("pregonero", 80, 160)),
  layer("tañido", (c) => {
    if (c.frame % 2 !== 0) return
    for (let i = 0; i < 2; i++) c.arc(93, 107, 6 + i * 4, -60, 0, "Q")
  }))
