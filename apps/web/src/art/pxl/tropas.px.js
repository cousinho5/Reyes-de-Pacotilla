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

// ----------------------------------------------------------------- piezas (12x18, 17x18, 18x14)
// Soldado: capacete con brillo, cofia de malla, escudo de cometa con la cruz de oro,
// tabardo con cinturón y hebilla, lanza a su izquierda.
sprite("soldado", `
  ....uTT....n
  ...uTTTS...T
  ..uTTTTTS..J
  .tTTTTTTSSsj
  ..ttaaAtt..J
  ..tasAsAt..j
  ..ttAAAtt..J
  .tmmmmmmdt.j
  tmymtmmdddaj
  tyyytmmddd.J
  tmymthhhyh.j
  .tmt.mmddd.J
  ..t..mmddd.j
  .....mdddd.J
  ...St..tS..j
  ...SS..SS..j
  ...Sh..Sh...
  ..hhh..hhh..`)

// Jinete: caballo pardo de perfil hacia la izquierda, crin y cola oscuras, silla, lanza en alto.
sprite("jinete", `
  .......uTT.....n.
  ......uTTTS....T.
  .....tTTTTSS...J.
  ......ttaAtt...j.
  ......tsasAt...J.
  ......tmmmdt..aj.
  ..h..tmmymmdd.jJ.
  .hjh.tmyyymdd..j.
  hjJjhjmmymddjj.Jh
  JJjjjjhhyhhhjjjHh
  J..jjjjmmddjjjjH.
  ....VjjjjjjjjjJH.
  .....jjjjjjjjjHh.
  .....jHjjjjjjH..h
  .....H.H...H.H...
  .....H.H...H.H...
  .....J.H...J.H...
  ....hh.hh.hh.hh..`)

// Catapulta: cuchara cargada con una piedra, cuerdas de torsión y ruedas con cubo.
sprite("catapulta", `
  ..............tTt.
  .............StuTs
  ............hJjjJh
  ...........jJ.....
  ..........jJ......
  .........jJ.......
  ........jJ........
  ..H....VjJV.....H.
  ..H...vVjJvV....H.
  .HJjjjjjjJjjjjjjHj
  JJjjjJjjjjjjjJjjjJ
  hHHHHhHHHHHHhHHHHh
  .tSSt........tSSt.
  .StSt........StSt.`)

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
    stamp("soldado" + sufijo, 2, 2), stamp("soldado" + sufijo, 16, 4), stamp("soldado" + sufijo, 30, 2),
    stamp("jinete" + sufijo, 2, 24), stamp("catapulta" + sufijo, 24, 28),
  ]
}
sprite("_formacion_old", { w: 46, h: 44, outline: "k" }, ...formacion("_old"))
sprite("_formacion", { w: 46, h: 44, outline: "k" }, ...formacion(""))
scene("comparacion", { w: 100, h: 48 },
  layer("hierba", (c) => {
    for (let y = 0; y < 48; y++) for (let x = 0; x < 100; x++) c.px(x, y, hash(x, y, 4) > 0.8 ? "4" : hash(x, y, 9) > 0.85 ? "2" : "3")
    c.rect(49, 0, 2, 48, "1")
  }),
  layer("tropas", stamp("_formacion_old", 1, 1), stamp("_formacion", 53, 1)))

// La misma formación con otros colores de casa (azur, sable, naranjado).
sprite("_formacion_azur", { base: "_formacion", swap: { m: "#1b3c80", d: "#10264f" } })
sprite("_formacion_sable", { base: "_formacion", swap: { m: "#1e1e24", d: "#0e0e12" } })
sprite("_formacion_naranja", { base: "_formacion", swap: { m: "#a84e0f", d: "#6e3309" } })
scene("casas", { w: 150, h: 48 },
  layer("hierba", (c) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 150; x++) c.px(x, y, hash(x, y, 4) > 0.8 ? "4" : hash(x, y, 9) > 0.85 ? "2" : "3") }),
  layer("tropas", stamp("_formacion_azur", 1, 1), stamp("_formacion_sable", 51, 1), stamp("_formacion_naranja", 101, 1)))
