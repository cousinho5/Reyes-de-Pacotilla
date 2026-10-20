// Monta la maqueta en un solo archivo: docs/maquetas/bloque13-cinematicas.html.
// Uso, desde esta carpeta:
//   npx esbuild datos.ts --bundle --platform=node --format=esm --outfile=datos.mjs && node datos.mjs
//   node construir.mjs
import fs from "fs";
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,800;1,400;1,800&family=Alegreya+Sans:wght@400;800&family=Pixelify+Sans:wght@600&display=swap">`;
const js = ["engine.js", "scenes.js", "player.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
let s = fs.readFileSync("shell.html", "utf8");
s = s.replace("/*FONTS*/", fonts).replace("/*DATA*/", () => fs.readFileSync("data.json", "utf8")).replace("/*JS*/", () => js);
s = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>` + s + `</body></html>`;
fs.writeFileSync("../bloque13-cinematicas.html", s);
