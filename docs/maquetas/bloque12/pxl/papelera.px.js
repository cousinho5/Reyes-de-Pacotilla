// Papelera de las órdenes (bloque 12), icono de 12x12 como los de icons.ts.
// Paleta de los iconos: k contorno, m color, l claro, d oscuro (Icon los tiñe con su color).
// Aquí se ve en el rojo del sello; en el juego va con el color que pida el botón.
// Al juego: node scripts/pxl-a-juego.mjs docs/maquetas/bloque12/pxl/papelera.px.js papelera --salida /tmp/papelera.ts
pal({ k: "#1c1410", l: "#e08a7c", m: "#b3291d", d: "#7a1c13" })

sprite("papelera", `
  ....kkkk....
  ...kk..kk...
  .kkkkkkkkkk.
  .kllllmmmdk.
  .kkkkkkkkkk.
  ..kmlmlmdk..
  ..kmlmlmdk..
  ..kmlmlmdk..
  ..kmlmlmdk..
  ..kmlmlmdk..
  ..kddddddk..
  ...kkkkkk...`)
