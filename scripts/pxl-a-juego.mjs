// Pasa dibujos de pxl (.px.js) al formato del juego.
//
// Uso (Node 22.18 o posterior, que es lo que pide pxl):
//   node scripts/pxl-a-juego.mjs <dibujo.px.js> <nombre> [<nombre>…] [--fotograma N] [--salida ruta.ts] [--export identificador] [--mapa]
//
// Sin --mapa, cada dibujo sale como `Sprite` ({ grid, palette }, de apps/web/src/art/sprites.ts) con su
// propia paleta; una animación sale como lista de fotogramas (Sprite[]) salvo que se pida uno con
// --fotograma. Los colores que no están en la paleta del dibujo reciben una letra libre y se avisa.
//
// Con --mapa, cada dibujo sale como rejilla para world.ts, con las letras de la paleta común WORLD
// (apps/web/src/art/tiles.ts): todas las letras del dibujo tienen que existir en WORLD con el mismo
// color, o el script falla. Las letras "m" y "d" son el color de la casa (claro y oscuro): si el
// dibujo las usa, sale una función `(m, d) => string[]` que recibe las letras de la bandera.
//
// Sin --salida escribe el módulo por la salida estándar. --export solo vale con un único dibujo.

import { readFileSync, writeFileSync } from "node:fs";
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
    else if (a === "--mapa") o.mapa = true;
    else o.rest.push(a);
  }
  return o;
}

function fallo(msg) {
  console.error(msg);
  process.exit(1);
}

const LIBRES = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*+=?@^~";
/** Letras del color de la casa en los dibujos del mapa. */
const CASA = ["m", "d"];

/** La paleta WORLD de tiles.ts: letra -> color en minúsculas. */
function paletaMapa() {
  const src = readFileSync(resolve(raiz, "apps/web/src/art/tiles.ts"), "utf8");
  const bloque = /export const WORLD[^{]*\{([\s\S]*?)\n\};/.exec(src);
  if (!bloque) fallo("no encuentro `export const WORLD` en apps/web/src/art/tiles.ts");
  const pal = new Map();
  for (const m of bloque[1].matchAll(/^\s*(?:"(.)"|(\w))\s*:\s*"(#[0-9a-fA-F]{6})"/gm)) pal.set(m[1] ?? m[2], m[3].toLowerCase());
  return pal;
}

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
        if (!k) fallo("no quedan letras libres para los colores fuera de la paleta");
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
const [archivo, ...nombres] = a.rest;
if (!archivo || !nombres.length) {
  console.error("uso: node scripts/pxl-a-juego.mjs <dibujo.px.js> <nombre> [<nombre>…] [--fotograma N] [--salida ruta.ts] [--export identificador] [--mapa]");
  process.exit(2);
}
if (a.export && nombres.length > 1) fallo("--export solo vale con un único dibujo");

let p;
try {
  p = pxl.loadProject(resolve(archivo));
} catch (e) {
  fallo(`no se puede cargar ${archivo}: ${e.message}`);
}
const origen = relative(raiz, resolve(archivo));
const ident = (n) => a.export ?? n.replace(/[^A-Za-z0-9_]+(.)?/g, (_, ch) => (ch ? ch.toUpperCase() : "")).replace(/^[0-9]/, "_$&");
const rej = (r, sangria) => "[\n" + r.map((f) => `${sangria}  ${f},`).join("\n") + `\n${sangria}]`;

/** Las imágenes de un dibujo: una, o los fotogramas de una animación. */
function imagenesDe(nombre) {
  const asset = p.assets.get(nombre);
  if (!asset) fallo(`no hay ningún dibujo llamado "${nombre}" en ${archivo}`);
  if (asset.kind === "anim" || p.drawn(nombre).length > 1) {
    let fotogramas;
    try {
      fotogramas = p.drawn(nombre);
    } catch (e) {
      fallo(`no se puede dibujar "${nombre}": ${e.message}`);
    }
    if (a.fotograma === undefined) return { asset, imgs: fotogramas.map((f) => f.img) };
    const f = fotogramas[a.fotograma];
    if (!f) fallo(`"${nombre}" no tiene el fotograma ${a.fotograma}`);
    return { asset, imgs: [f.img] };
  }
  try {
    return { asset, imgs: [p.image(nombre)] };
  } catch (e) {
    fallo(`no se puede dibujar "${nombre}": ${e.message}`);
  }
}

let ts = `// Generado con scripts/pxl-a-juego.mjs desde ${origen} (${nombres.map((n) => `"${n}"`).join(", ")}). No editar a mano: cambiar el .px.js y volver a generar.\n`;
const resumen = [];

if (a.mapa) {
  const world = paletaMapa();
  ts += "\n";
  for (const nombre of nombres) {
    const { asset, imgs } = imagenesDe(nombre);
    if (imgs.length > 1) fallo(`"${nombre}" es una animación: con --mapa, elige un fotograma con --fotograma`);
    const img = imgs[0];
    const rev = (asset.pal ?? p.pal).reverse();
    const malos = new Map();
    let casa = false;
    const filas = [];
    for (let y = 0; y < img.h; y++) {
      let fila = "", usaCasa = false;
      for (let x = 0; x < img.w; x++) {
        const c = img.data[y * img.w + x];
        if (c === pxl.TRANSPARENT) { fila += "."; continue; }
        const k = rev.get(c);
        if (k && CASA.includes(k)) { fila += "${" + k + "}"; usaCasa = casa = true; continue; }
        if (!k || world.get(k) !== pxl.toHex(c).toLowerCase()) { malos.set(k ?? pxl.toHex(c), pxl.toHex(c)); fila += "?"; continue; }
        fila += k;
      }
      filas.push(usaCasa ? "`" + fila + "`" : JSON.stringify(fila));
    }
    if (malos.size) fallo(`"${nombre}" usa colores que no están en WORLD (tiles.ts) con esa letra: ${[...malos].map(([k, c]) => (k === c ? c : `${k}=${c}`)).join(" ")}`);
    const doc = `/** ${nombre} (${img.w}x${img.h}), dibujado en ${origen}. */\n`;
    ts += casa
      ? `${doc}export function ${ident(nombre)}(m: string, d: string): string[] {\n  return ${rej(filas, "  ")};\n}\n\n`
      : `${doc}export const ${ident(nombre)}: readonly string[] = ${rej(filas, "")};\n\n`;
    resumen.push(`${nombre} ${img.w}x${img.h}${casa ? " (con color de casa)" : ""}`);
  }
  ts = ts.replace(/\n\n$/, "\n");
} else {
  ts += `import type { Sprite } from "./sprites";\n`;
  for (const nombre of nombres) {
    const { asset, imgs } = imagenesDe(nombre);
    const rev = (asset.pal ?? p.pal).reverse();
    const extra = new Map(), paleta = {};
    const rejillas = imgs.map((img) => aRejilla(img, rev, paleta, extra).map((f) => JSON.stringify(f)));
    if (extra.size) console.error(`aviso: "${nombre}" tiene ${extra.size} colores fuera de la paleta de pxl, con letra nueva: ${[...extra].map(([c, k]) => `${k}=${pxl.toHex(c)}`).join(" ")}`);
    const pal = "{ " + Object.keys(paleta).sort().map((k) => `${JSON.stringify(k)}: "${paleta[k]}"`).join(", ") + " }";
    const id = ident(nombre);
    ts += `\nconst ${id}Palette = ${pal};\n\n`;
    ts += rejillas.length === 1
      ? `export const ${id}: Sprite = {\n  grid: ${rej(rejillas[0], "  ")},\n  palette: ${id}Palette,\n};\n`
      : `export const ${id}: Sprite[] = [\n${rejillas.map((r) => `  {\n    grid: ${rej(r, "    ")},\n    palette: ${id}Palette,\n  },`).join("\n")}\n];\n`;
    resumen.push(`${nombre} ${imgs[0].w}x${imgs[0].h}${rejillas.length > 1 ? `, ${rejillas.length} fotogramas` : ""}`);
  }
}

if (a.salida) {
  writeFileSync(a.salida, ts);
  console.error(`-> ${a.salida}: ${resumen.join("; ")}`);
} else process.stdout.write(ts);
