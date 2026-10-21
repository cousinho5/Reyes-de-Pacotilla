// Monta la maqueta de la portada en un solo archivo: docs/maquetas/bloque7-portada.html.
// Uso, desde esta carpeta (Node 22.18 o posterior):
//   npx esbuild arte.ts --bundle --platform=node --format=esm --outfile=arte.mjs && node arte.mjs   (escudos, Fray y mapa del juego)
//   node pixeles.mjs                                                                                (dibujos de pxl/portada.px.js)
//   node construir.mjs            (o `node construir.mjs local` para usar las letras instaladas, sin internet;
//                                  `node construir.mjs artefacto <archivo>` escribe la versión sin <html> para publicarla como Artifact)
import fs from "node:fs";
const modo = process.argv[2];
const local = modo === "local";
const F = "../../../node_modules/@fontsource";
const fonts = local
  ? `<style>${[["Alegreya Sans", 400, "normal", "alegreya-sans/files/alegreya-sans-latin-400-normal"], ["Alegreya Sans", 700, "normal", "alegreya-sans/files/alegreya-sans-latin-700-normal"], ["Alegreya Sans", 800, "normal", "alegreya-sans/files/alegreya-sans-latin-800-normal"], ["Alegreya", 400, "normal", "alegreya/files/alegreya-latin-400-normal"], ["Alegreya", 400, "italic", "alegreya/files/alegreya-latin-400-italic"], ["Alegreya", 800, "normal", "alegreya/files/alegreya-latin-800-normal"], ["Pixelify Sans", 600, "normal", "pixelify-sans/files/pixelify-sans-latin-600-normal"], ["Pixelify Sans", 700, "normal", "pixelify-sans/files/pixelify-sans-latin-700-normal"]].map(([f, w, s, p]) => `@font-face{font-family:"${f}";font-weight:${w};font-style:${s};src:url(${F}/${p}.woff2)}`).join("")}</style>`
  : `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,800;1,400&family=Alegreya+Sans:wght@400;700;800&family=Pixelify+Sans:wght@600;700&display=swap">`;
const data = JSON.stringify({ arte: JSON.parse(fs.readFileSync("arte.json", "utf8")), px: JSON.parse(fs.readFileSync("pixeles.json", "utf8")) });
let s = fs.readFileSync("shell.html", "utf8");
s = s.replace("/*FONTS*/", fonts).replace("/*DATA*/", () => data).replace("/*JS*/", () => fs.readFileSync("portada.js", "utf8"));
if (modo === "artefacto") { fs.writeFileSync(process.argv[3], s); console.log(process.argv[3], (s.length / 1024).toFixed(0) + " KB"); process.exit(0); }
s = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` + s.replace("<title>", "<title>").replace(/<\/style>\n<header/, "</style></head><body>\n<header") + `</body></html>`;
fs.writeFileSync(local ? "local.html" : "../bloque7-portada.html", s);
console.log(local ? "local.html" : "../bloque7-portada.html", (s.length / 1024).toFixed(0) + " KB");
