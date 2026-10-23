// Bloque 11: corona de 16x16 que brilla un momento y podio de madera para la
// clasificación de Reino. Colores del juego: latón (--brass), madera (--wood-*), gules.
// Al juego:
//   node scripts/pxl-a-juego.mjs docs/maquetas/bloque11/pxl/podio.px.js corona corona_brilla podio --salida apps/web/src/art/podio.ts
pal({
  k: "#1c1410", // contorno
  Y: "#f1cf7d", // latón claro
  y: "#d6a64b", // latón
  o: "#8c6420", // latón oscuro
  r: "#b3291d", // gules
  R: "#e0705f", // brillo del rubí
  b: "#2e5aa8", // lapislázuli
  w: "#fff8e0", // destello
  W: "#4b3424", // madera
  M: "#33231a", // madera oscura
  L: "#6e4f22", // canto de la madera
  N: "#22160e", // sombra
})

const CORONA = `
  ................
  .......kk.......
  ......kYyk......
  .k....kyyk....k.
  kYk..kkrrkk..kYk
  kyyk.kYyyok.kyyk
  kyyykYyyyyykyyok
  kyYyyyyyyyyyyyok
  kyYyyyyyyyyyyyok
  kkkkkkkkkkkkkkkk
  kYyyRryybbyRryok
  kyyyrryybbyrryok
  kooooooooooooook
  .kkkkkkkkkkkkkk.
  ................
  ................`

sprite("corona", CORONA)

// Un destello que cruza la corona en diagonal y una chispa en la punta.
anim("corona_brilla", { fps: 12, loop: false }, CORONA,
  frame(),
  frame(grid(2, 6, "w\n.w")),
  frame(grid(4, 5, "w.\n.w\n..w")),
  frame(grid(7, 4, "w.\n.w\n..w"), grid(7, 0, ".w.\nw.w")),
  frame(grid(10, 5, "w.\n.w\n..w"), grid(7, 0, ".w.")),
  frame(grid(12, 7, "w\n.w")),
  frame())

// Podio: segundo, primero y tercero, 24 de ancho cada uno, con el número en latón.
sprite("podio", { w: 72, h: 26 }, (c) => {
  const step = (x, top, w) => {
    c.rect(x, top, w, 26 - top, "W")
    c.rect(x, top, w, 1, "k")
    c.rect(x, top + 1, w, 1, "L")
    c.rect(x, 25, w, 1, "N")
    c.rect(x, 24, w, 1, "M")
    // Vetas.
    for (let yy = top + 4; yy < 23; yy += 4) c.rect(x + 2 + ((yy * 3) % 7), yy, 5, 1, "M")
    c.rect(x, top, 1, 26 - top, "k")
    c.rect(x + w - 1, top, 1, 26 - top, "k")
  }
  step(0, 8, 24)
  step(48, 13, 24)
  step(23, 2, 26)
  // Números de 3x5 en latón.
  const NUM = {
    1: ".y.\nyy.\n.y.\n.y.\nyyy",
    2: "yyy\n..y\nyyy\ny..\nyyy",
    3: "yyy\n..y\n.yy\n..y\nyyy",
  }
  c.grid(10, 12, NUM[2])
  c.grid(35, 6, NUM[1])
  c.grid(59, 17, NUM[3])
})
