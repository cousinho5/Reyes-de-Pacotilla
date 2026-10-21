// Generado con scripts/pxl-a-juego.mjs desde apps/web/src/art/pxl/tropas.px.js ("soldado", "jinete", "catapulta"). No editar a mano: cambiar el .px.js y volver a generar.

/** soldado (9x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function soldado(m: string, d: string): string[] {
  return [
    "...uT...n",
    "..uTTS..T",
    ".tTTTTSsJ",
    "..tasA..j",
    "..tAAt..J",
    `.t${m}${m}${m}${d}t.j`,
    `t${m}${m}y${m}${d}${d}aj`,
    `t${m}yyy${d}${d}.J`,
    `.${m}${m}y${m}${d}${d}.j`,
    ".hhhyhh.J",
    `.${m}${m}${m}${d}${d}${d}.j`,
    "..St.tS.J",
    "..SS.SS.j",
    ".hh...hh.",
  ];
}

/** jinete (13x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function jinete(m: string, d: string): string[] {
  return [
    ".....uT..n...",
    "....uTTS.T...",
    "...tTTTTSJ...",
    ".....tasAj...",
    ".h...tAAaJ...",
    `hjh.t${m}${m}${m}${d}j...`,
    `jJjh${m}${m}y${m}${d}J...`,
    `JJ.j${m}yyy${d}jjh.`,
    "J..jjhhyhjjHh",
    "...VjjjjjjJH.",
    "....jHjjjjH.h",
    "....H.H.J.H..",
    "....H.H.H.H..",
    "...hh.h.h.hh.",
  ];
}

/** catapulta (14x11), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export const catapulta: readonly string[] = [
  "..........tT..",
  ".........StuS.",
  "........hJjJh.",
  ".......jJ.....",
  "......jJ......",
  ".H..VjJV...H..",
  ".HjjvJvjjjjHj.",
  "JJjjjJjjjjJjjJ",
  "hHHHhHHHHhHHHh",
  ".tSt......tSt.",
  ".StS......StS.",
];
