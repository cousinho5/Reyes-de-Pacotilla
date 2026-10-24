// Marca de las casas bot (docs/bots.md): un espantapájaros de 16x16, «casa
// gobernada por su mayordomo». Va junto al escudo en la sala de espera, la
// clasificación y la ficha de casa.
// Al juego: node scripts/pxl-a-juego.mjs docs/maquetas/bots/pxl/espantapajaros.px.js espantapajaros --salida apps/web/src/art/espantapajaros.ts
pal({
  k: "#1c1410", // contorno
  h: "#5a3a22", // sombrero
  H: "#7a5232", // ala del sombrero, luz
  p: "#e8c56a", // paja
  P: "#b8913e", // paja en sombra
  c: "#e9d9b4", // cara de saco
  e: "#3a2a1c", // ojos y boca cosidos
  r: "#a8322a", // camisa remendada
  R: "#6e1f1a", // camisa en sombra
  t: "#4f7a3a", // remiendo
  w: "#8a6a44", // palo
})

sprite("espantapajaros", `
  ......kkkk......
  .....khhhhk.....
  ...kkHhhhhHkk...
  ..kHHHHHHHHHHk..
  ..kpkcccccckpk..
  ....kcecceck....
  ...pkcccccckp...
  ....kceeeeck....
  .kkkkkcccckkkkk.
  kpPrrrrrrrrrrPpk
  kpkrrtrrrRRrrkpk
  .k.krrrrrRRrk.k.
  ...kRrrrrRRRk...
  ...kpPkwwkPpk...
  ....k.kwwk.k....
  ......kwwk......`)
