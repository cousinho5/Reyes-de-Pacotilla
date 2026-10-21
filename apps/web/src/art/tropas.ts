// Generado con scripts/pxl-a-juego.mjs desde apps/web/src/art/pxl/tropas.px.js ("soldado", "jinete", "catapulta"). No editar a mano: cambiar el .px.js y volver a generar.

/** soldado (9x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function soldado(m: string, d: string): string[] {
  return [
    "...TT...u",
    "..TuTT..T",
    "..TTTT..j",
    "..ssSs..j",
    "..sssS..j",
    `.TT${m}${m}TT.j`,
    `T${m}${m}${d}${m}${m}Tsj`,
    `T${m}${d}${m}${d}${m}T.j`,
    `.${m}${m}${d}${m}${m}..j`,
    `.${d}${m}${m}${d}${d}..j`,
    `..${d}${d}${d}${d}..j`,
    "..hh.hh..",
    "..h...h..",
    ".hh...hh.",
  ];
}

/** jinete (13x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function jinete(m: string, d: string): string[] {
  return [
    ".....TT..u...",
    "....TuTT.T...",
    "....TTTT.j...",
    "....ssSs.j...",
    ".h..sssS.j...",
    `hjh.T${m}${m}TTj...`,
    `jJjhT${m}${d}${m}Tj...`,
    `JJ.j${m}${m}${d}${m}${m}jjh.`,
    `J..jj${d}${m}${d}${d}jjHh`,
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
