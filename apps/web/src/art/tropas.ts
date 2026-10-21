// Generado con scripts/pxl-a-juego.mjs desde apps/web/src/art/pxl/tropas.px.js ("soldado", "jinete", "catapulta"). No editar a mano: cambiar el .px.js y volver a generar.

/** soldado (12x18), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function soldado(m: string, d: string): string[] {
  return [
    "....uTT....n",
    "...uTTTS...T",
    "..uTTTTTS..J",
    ".tTTTTTTSSsj",
    "..ttaaAtt..J",
    "..tasAsAt..j",
    "..ttAAAtt..J",
    `.t${m}${m}${m}${m}${m}${m}${d}t.j`,
    `t${m}y${m}t${m}${m}${d}${d}${d}aj`,
    `tyyyt${m}${m}${d}${d}${d}.J`,
    `t${m}y${m}thhhyh.j`,
    `.t${m}t.${m}${m}${d}${d}${d}.J`,
    `..t..${m}${m}${d}${d}${d}.j`,
    `.....${m}${d}${d}${d}${d}.J`,
    "...St..tS..j",
    "...SS..SS..j",
    "...Sh..Sh...",
    "..hhh..hhh..",
  ];
}

/** jinete (17x18), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export function jinete(m: string, d: string): string[] {
  return [
    ".......uTT.....n.",
    "......uTTTS....T.",
    ".....tTTTTSS...J.",
    "......ttaAtt...j.",
    "......tsasAt...J.",
    `......t${m}${m}${m}${d}t..aj.`,
    `..h..t${m}${m}y${m}${m}${d}${d}.jJ.`,
    `.hjh.t${m}yyy${m}${d}${d}..j.`,
    `hjJjhj${m}${m}y${m}${d}${d}jj.Jh`,
    "JJjjjjhhyhhhjjjHh",
    `J..jjjj${m}${m}${d}${d}jjjjH.`,
    "....VjjjjjjjjjJH.",
    ".....jjjjjjjjjHh.",
    ".....jHjjjjjjH..h",
    ".....H.H...H.H...",
    ".....H.H...H.H...",
    ".....J.H...J.H...",
    "....hh.hh.hh.hh..",
  ];
}

/** catapulta (18x14), dibujado en apps/web/src/art/pxl/tropas.px.js. */
export const catapulta: readonly string[] = [
  "..............tTt.",
  ".............StuTs",
  "............hJjjJh",
  "...........jJ.....",
  "..........jJ......",
  ".........jJ.......",
  "........jJ........",
  "..H....VjJV.....H.",
  "..H...vVjJvV....H.",
  ".HJjjjjjjJjjjjjjHj",
  "JJjjjJjjjjjjjJjjjJ",
  "hHHHHhHHHHHHhHHHHh",
  ".tSSt........tSSt.",
  ".StSt........StSt.",
];
