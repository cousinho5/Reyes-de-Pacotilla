// Pasa un dibujo de pxl (.px.js) al formato del juego: rejilla de texto + paleta
// ({ grid, palette }, el `Sprite` de apps/web/src/art/sprites.ts).
//
// Uso (Node 22.18 o posterior, que es lo que pide pxl):
//   node scripts/pxl-a-juego.mjs <dibujo.px.js> <nombre> [--fotograma N] [--salida ruta.ts] [--export identificador]
//
// Sin --salida escribe el módulo por la salida estándar. Una animación sale como lista de
// fotogramas (Sprite[]) salvo que se pida uno con --fotograma. Los colores que no están en la
// paleta del dibujo (mezclas por opacidad, por ejemplo) reciben una letra libre y se avisa.

import { writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(fileURLToPath(import.meta.url), "../..");
process.removeAllListeners("warning");
const pxl = await import(resolve(raiz, ".claude/skills/pxl-pixel-art/src/index.ts"));

function args(argv) {
  const o = { rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--fotograma") o.fotograma = Number(argv[++i]);
    else if (a === "--salida") o.salida = argv[++i];
    else if (a === "--export") o.export = argv[++i];
    else o.rest.push(a);
  }
  return o;
}

const LIBRES = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*+=?@^~";

/** Una imagen de pxl como rejilla de claves; añade a `paleta` las claves que usa. */
function aRejilla(img, rev, paleta, extra) {
  const filas = [];
  for (let y = 0; y < img.h; y++) {
    let fila = "";
    for (let x = 0; x < img.w; x++) {
      const c = img.data[y * img.w + x];
      if (c === pxl.TRANSPARENT) { fila += "."; continue; }
      let k = rev.get(c) ?? extra.get(c);
      if (k === undefined || k === ".") {
        k = [...LIBRES].find((ch) => !(ch in paleta) && ![...rev.values()].includes(ch) && ![...extra.values()].includes(ch));
        if (!k) throw new Error("no quedan letras libres para los colores fuera de la paleta");
        extra.set(c, k);
      }
      paleta[k] = pxl.toHex(c);
      fila += k;
    }
    filas.push(fila);
  }
  return filas;
}

const a = args(process.argv.slice(2));
const [archivo, nombre] = a.rest;
if (!archivo || !nombre) {
  console.error("uso: node scripts/pxl-a-juego.mjs <dibujo.px.js> <nombre> [--fotograma N] [--salida ruta.ts] [--export identificador]");
  process.exit(2);
}

const p = pxl.loadProject(resolve(archivo));
const asset = p.assets.get(nombre);
if (!asset) {
  console.error(`no hay ningún dibujo llamado "${nombre}" en ${archivo}`);
  process.exit(1);
}
const rev = (asset.pal ?? p.pal).reverse();
const extra = new Map();
const paleta = {};

let imagenes;
if (asset.kind === "anim" || p.drawn(nombre).length > 1) {
  const fotogramas = p.drawn(nombre);
  imagenes = a.fotograma === undefined ? fotogramas.map((f) => f.img) : [fotogramas[a.fotograma]?.img];
  if (!imagenes[0]) { console.error(`"${nombre}" no tiene el fotograma ${a.fotograma}`); process.exit(1); }
} else imagenes = [p.image(nombre)];

const rejillas = imagenes.map((img) => aRejilla(img, rev, paleta, extra));
if (extra.size) console.error(`aviso: ${extra.size} colores fuera de la paleta de pxl, con letra nueva: ${[...extra].map(([c, k]) => `${k}=${pxl.toHex(c)}`).join(" ")}`);

const id = a.export ?? nombre.replace(/[^A-Za-z0-9_]+(.)?/g, (_, ch) => (ch ? ch.toUpperCase() : "")).replace(/^[0-9]/, "_$&");
const pal = "{ " + Object.keys(paleta).sort().map((k) => `${JSON.stringify(k)}: "${paleta[k]}"`).join(", ") + " }";
const rej = (r) => "[\n" + r.map((f) => `    ${JSON.stringify(f)},`).join("\n") + "\n  ]";
const origen = relative(raiz, resolve(archivo));
let ts = `// Generado con scripts/pxl-a-juego.mjs desde ${origen} ("${nombre}"). No editar a mano: cambiar el .px.js y volver a generar.\n`;
ts += `import type { Sprite } from "./sprites";\n\nconst palette = ${pal};\n\n`;
ts += rejillas.length === 1
  ? `export const ${id}: Sprite = {\n  grid: ${rej(rejillas[0])},\n  palette,\n};\n`
  : `export const ${id}: Sprite[] = [\n${rejillas.map((r) => `  {\n    grid: ${rej(r).replace(/\n/g, "\n  ")},\n    palette,\n  },`).join("\n")}\n];\n`;

if (a.salida) { writeFileSync(a.salida, ts); console.error(`-> ${a.salida} (${rejillas.length} ${rejillas.length === 1 ? "imagen" : "fotogramas"}, ${imagenes[0].w}x${imagenes[0].h})`); }
else process.stdout.write(ts);
