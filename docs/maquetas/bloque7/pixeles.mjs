// Pasa los dibujos de pxl/portada.px.js a rejillas con paleta (el formato del juego) para la maqueta.
// Uso, desde esta carpeta: node pixeles.mjs  (escribe pixeles.json)
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
process.removeAllListeners("warning");
const pxl = await import(resolve("../../../.claude/skills/pxl-pixel-art/src/index.ts"));
const p = pxl.loadProject(resolve("pxl/portada.px.js"));
const NOMBRES = ["lejos", "colinas", "capital", "pueblo", "aspas", "bandera", "humo", "pajaro", "carreta", "aldeano", "rata", "fantasma", "corona"];
const out = {};
for (const n of NOMBRES) {
  const asset = p.assets.get(n);
  const imgs = asset.kind === "anim" ? p.drawn(n).map((f) => f.img) : [p.image(n)];
  const rev = p.pal.reverse(), pal = {};
  const frames = imgs.map((img) => {
    const rows = [];
    for (let y = 0; y < img.h; y++) {
      let r = "";
      for (let x = 0; x < img.w; x++) {
        const c = img.data[y * img.w + x];
        if (c === pxl.TRANSPARENT) { r += "."; continue; }
        const k = rev.get(c);
        if (!k) throw new Error(`${n}: color fuera de la paleta ${pxl.toHex(c)}`);
        pal[k] = pxl.toHex(c); r += k;
      }
      rows.push(r);
    }
    return rows;
  });
  out[n] = { w: imgs[0].w, h: imgs[0].h, frames, pal };
}
writeFileSync("pixeles.json", JSON.stringify(out));
console.log(Object.entries(out).map(([n, v]) => `${n} ${v.w}x${v.h}x${v.frames.length}`).join(", "));
