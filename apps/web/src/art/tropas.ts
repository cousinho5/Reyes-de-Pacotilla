// Generado con scripts/pxl-a-juego.mjs desde apps/web/src/art/pxl/tropas.px.js ("soldado", "jinete", "catapulta"). No editar a mano: cambiar el .px.js y volver a generar.

/** soldado (9x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function soldado(m: string, d: string): string[] {
  return [
    "...tT...u",
    "..tTuT..T",
    ".sTTTTS.j",
    "..AaaA..j",
    "..sAAs..j",
    `.t${m}${m}${m}${m}t.j`,
    `t${m}${m}y${m}${m}${d}aj`,
    `t${m}yyy${d}${d}.j`,
    `.${m}${m}y${m}${d}${d}.j`,
    `.${m}${m}${m}${m}${d}${d}.j`,
    `..${d}${d}${d}${d}..j`,
    "..SS.SS.j",
    "..S...S.j",
    ".hh...hh.",
  ];
}

/** jinete (13x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function jinete(m: string, d: string): string[] {
  return [
    ".....tT..u...",
    "....tTuT.T...",
    "...sTTTTSj...",
    ".....AaA.j...",
    ".h...sAsaj...",
    `hjh.t${m}${m}${m}${d}j...`,
    `jJjh${m}${m}y${m}${d}j...`,
    `JJ.j${m}yyy${d}jjh.`,
    `J..jj${d}${m}${d}${d}jjHh`,
    "....jjjjjjjH.",
    "....jHjjjjH.h",
    "....H.H.H.H..",
    "....H.H.H.H..",
    "...hh.h.h.hh.",
  ];
}

/** catapulta (14x11), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export const catapulta: readonly string[] = [
  "..........St..",
  ".........StTs.",
  "........hJjJh.",
  ".......jJ.....",
  "......jJ......",
  ".H...jJ....H..",
  ".HjjjJjjjjjHj.",
  "JjjjjjjjjjjjjJ",
  "hHHHHHHHHHHHHh",
  ".hSh......hSh.",
  ".hth......hth.",
];
