// Tropas del mapa (world.ts): soldado, jinete y catapulta.
// Paleta: las letras y colores de WORLD (tiles.ts). "m" y "d" son el tabardo de la casa
// (claro y oscuro): aquí se ven en rojo y en el juego se tiñen con el color de cada casa.
// Sin contorno: world.ts lo pone al pintar la capa de tropas.
// Al juego:  node scripts/pxl-a-juego.mjs apps/web/src/art/pxl/tropas.px.js soldado jinete catapulta --mapa --salida apps/web/src/art/tropas.ts
pal({
  k: "#1c1410",
  "1": "#22401f", "2": "#365f2b", "3": "#4f8035", "4": "#73a443",
  y: "#dcb446", Y: "#f3da82",
  s: "#36333d", S: "#57535e", t: "#827d8a", T: "#aaa5b1", u: "#d4d0d9", n: "#ffffff",
  h: "#3a2213", H: "#663c1f", j: "#956132", J: "#c18849",
  a: "#e0c88e", A: "#bb9c64",
  v: "#efe6cf", V: "#c2b597",
  m: "#b3291d", d: "#7a1c13",
})

// ----------------------------------------------------------------- piezas (9x14, 13x14, 14x11)
// Soldado: capacete con brillo y sombra, cofia de malla, ojos, tabardo con cruz de oro,
// cinturón con hebilla, rodillas y botas; lanza con brillo en el asta.
sprite("soldado", `
  ...uT...n
  ..uTTS..T
  .tTTTTSsJ
  ..tasA..j
  ..tAAt..J
  .tmmmdt.j
  tmmymddaj
  tmyyydd.J
  .mmymdd.j
  .hhhyhh.J
  .mmmddd.j
  ..St.tS.J
  ..SS.SS.j
  .hh...hh.`)

// Jinete: caballo pardo de perfil hacia la izquierda, crin y cola oscuras, silla, lanza en alto.
sprite("jinete", `
  .....uT..n...
  ....uTTS.T...
  ...tTTTTSJ...
  .....tasAj...
  .h...tAAaJ...
  hjh.tmmmdj...
  jJjhmmymdJ...
  JJ.jmyyydjjh.
  J..jjhhyhjjHh
  ...VjjjjjjJH.
  ....jHjjjjH.h
  ....H.H.J.H..
  ....H.H.H.H..
  ...hh.h.h.hh.`)

// Catapulta: cuchara cargada con una piedra, cuerdas de torsión y ruedas con cubo.
sprite("catapulta", `
  ..........tT..
  .........StuS.
  ........hJjJh.
  .......jJ.....
  ......jJ......
  .H..VjJV...H..
  .HjjvJvjjjjHj.
  JJjjjJjjjjJjjJ
  hHHHhHHHHhHHHh
  .tSt......tSt.
  .StS......StS.`)

// ----------------------------------------------------------------- las de antes, para comparar
sprite("soldado_old", `
  ...TT...u
  ..TuTT..T
  ..TTTT..j
  ..ssSs..j
  ..sssS..j
  .TTmmTT.j
  TmmdmmTsj
  TmdmdmT.j
  .mmdmm..j
  .dmmdd..j
  ..dddd..j
  ..hh.hh..
  ..h...h..
  .hh...hh.`)
sprite("jinete_old", `
  ....TT.......
  ...TuTT......
  ...TTTT......
  ...sSs.......
  ..TmmT.....u
  ..TmdmT...j.
  ...mmjj.jj..
  .jJddJJjJj..
  JJjjjjJjjJ...
  .jJjjjjjjj...
  ..j.h..j.h...
  ..h.h..h.h...
  ..h.h..h.h...
  .hh.hh.hh.hh.`)
sprite("catapulta_old", `
  ..........ss..
  .........sSSs.
  ........jJss..
  .......jJ.....
  ......jJ......
  .h...jJ.......
  .hjjjJjjjjjh..
  JjjjJjjjjJjjJ.
  hhhhhhhhhhhhh.
  .hSh.....hSh..
  .hhh.....hhh..`)

// ----------------------------------------------------------------- vista previa sobre hierba
function formacion(sufijo) {
  return [
    stamp("soldado" + sufijo, 2, 4), stamp("soldado" + sufijo, 13, 6), stamp("soldado" + sufijo, 24, 4),
    stamp("jinete" + sufijo, 4, 22), stamp("catapulta" + sufijo, 22, 25),
  ]
}
sprite("_formacion_old", { w: 40, h: 38, outline: "k" }, ...formacion("_old"))
sprite("_formacion", { w: 40, h: 38, outline: "k" }, ...formacion(""))
scene("comparacion", { w: 88, h: 40 },
  layer("hierba", (c) => {
    for (let y = 0; y < 40; y++) for (let x = 0; x < 88; x++) c.px(x, y, hash(x, y, 4) > 0.8 ? "4" : hash(x, y, 9) > 0.85 ? "2" : "3")
    c.rect(43, 0, 2, 40, "1")
  }),
  layer("tropas", stamp("_formacion_old", 1, 1), stamp("_formacion", 46, 1)))

// La misma formación con otros colores de casa (azur, sable, naranjado).
sprite("_formacion_azur", { base: "_formacion", swap: { m: "#1b3c80", d: "#10264f" } })
sprite("_formacion_sable", { base: "_formacion", swap: { m: "#1e1e24", d: "#0e0e12" } })
sprite("_formacion_naranja", { base: "_formacion", swap: { m: "#a84e0f", d: "#6e3309" } })
scene("casas", { w: 130, h: 40 },
  layer("hierba", (c) => { for (let y = 0; y < 40; y++) for (let x = 0; x < 130; x++) c.px(x, y, hash(x, y, 4) > 0.8 ? "4" : hash(x, y, 9) > 0.85 ? "2" : "3") }),
  layer("tropas", stamp("_formacion_azur", 1, 1), stamp("_formacion_sable", 44, 1), stamp("_formacion_naranja", 87, 1)))
