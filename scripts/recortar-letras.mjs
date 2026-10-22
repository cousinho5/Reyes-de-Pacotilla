// Letras recortadas (bloque 6): de cada tipo de letra que usa el juego, solo los
// grosores que usa y los caracteres que aparecen en el código (el del cliente, el
// del motor y el del servidor, que manda frases y avisos) más todo el ASCII.
// Las letras salen de @fontsource y se guardan en apps/web/src/fonts con su CSS.
//
// Uso: node scripts/recortar-letras.mjs
// Volver a ejecutarlo si se añaden textos con caracteres nuevos (otro símbolo,
// una letra de otro idioma): `npm test` lo comprueba (apps/web/test/letras.test.ts).

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "apps/web/src/fonts");

/** Familia, carpeta de @fontsource, grosor y estilo. */
export const LETRAS = [
  ["Alegreya Sans", "alegreya-sans", 400, "normal"],
  ["Alegreya Sans", "alegreya-sans", 400, "italic"],
  ["Alegreya Sans", "alegreya-sans", 500, "normal"],
  ["Alegreya Sans", "alegreya-sans", 700, "normal"],
  ["Alegreya Sans", "alegreya-sans", 800, "normal"],
  ["Alegreya", "alegreya", 400, "normal"],
  ["Alegreya", "alegreya", 400, "italic"],
  ["Alegreya", "alegreya", 700, "normal"],
  ["Pixelify Sans", "pixelify-sans", 500, "normal"],
  ["Pixelify Sans", "pixelify-sans", 600, "normal"],
];

/** Carpetas cuyo texto puede llegar a la pantalla. */
const FUENTES = ["apps/web/src", "packages/engine/src", "apps/server/src"];

function* archivos(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* archivos(p);
    else if (/\.(ts|tsx|css|html)$/.test(name)) yield p;
  }
}

/** Todos los caracteres que hacen falta, ordenados. */
export function caracteres() {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c));
  // Letras que pueden escribir los jugadores en nombres y lemas, aunque no salgan en el código.
  for (const c of "áéíóúÁÉÍÓÚñÑüÜ¿¡«»ºª€çÇàèìòùÀÈÌÒÙâêîôûäëïöÄËÏÖ·…—–“”‘’") set.add(c);
  for (const dir of FUENTES) {
    for (const f of archivos(join(ROOT, dir))) {
      for (const c of readFileSync(f, "utf8")) {
        const n = c.codePointAt(0);
        // Fuera: controles, los dibujos de pixel art (letras griegas de las paletas) y los emojis.
        if (n >= 0xa0 && n < 0x370) set.add(c);
        else if (n >= 0x2000 && n < 0x2c00) set.add(c);
      }
    }
  }
  return [...set].sort().join("");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  const text = caracteres();
  const css = [
    "/* Generado por scripts/recortar-letras.mjs: no editar a mano. */",
    `/* Caracteres: ${text.length}. */`,
  ];
  for (const [family, pkg, weight, style] of LETRAS) {
    const name = `${pkg}-${weight}-${style}.woff2`;
    const src = readFileSync(join(ROOT, `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`));
    const out = await subsetFont(src, text, { targetFormat: "woff2" });
    writeFileSync(join(OUT, name), out);
    console.log(`${name}: ${Math.round(src.length / 1024)} KB → ${Math.round(out.length / 1024)} KB`);
    css.push(
      `@font-face {\n  font-family: "${family}";\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(./${name}) format("woff2");\n}`,
    );
  }
  writeFileSync(join(OUT, "letras.css"), css.join("\n") + "\n");
  writeFileSync(join(OUT, "caracteres.txt"), text + "\n");
}
