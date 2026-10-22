// Vibración corta (bloque 6): al guardar una orden y al acabar la repetición de la
// noche. Se apaga en Castillo > Avisos; el ajuste vive en este aparato.

const KEY = "vibrar";

/** Patrones, en milisegundos. */
export const VIBRATION = { orden: 25, repeticion: [30, 60, 30] } as const;

export const canVibrate = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export function vibrationOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "no";
  } catch {
    return true;
  }
}

export function setVibrationOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "no");
  } catch {
    // Sin almacenamiento, vale lo de siempre.
  }
}

export function vibrate(kind: keyof typeof VIBRATION) {
  if (canVibrate() && vibrationOn()) navigator.vibrate(VIBRATION[kind] as number | number[]);
}
