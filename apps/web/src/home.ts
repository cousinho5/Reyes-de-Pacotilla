// Bloque 7: las cuentas de la portada que no dibujan nada (la hora del cielo,
// el saludo y las frases de Fray Abundio, de la sección 23 del banco) y el orden
// de las partidas con lo que dice cada una.

import { CLOSE_WARNING_MINUTES } from "@reyes/engine";
import type { MyGame } from "./api";

export type HomeHour = "amanecer" | "dia" | "atardecer" | "noche";
export const HOME_HOURS: HomeHour[] = ["amanecer", "dia", "atardecer", "noche"];

/** La franja del día según el reloj del móvil: amanecer 6-9, día 9-18, atardecer 18-21, noche 21-6. */
export function hourAt(d: Date): HomeHour {
  const h = d.getHours();
  return h < 6 || h >= 21 ? "noche" : h < 9 ? "amanecer" : h < 18 ? "dia" : "atardecer";
}

/** Para las capturas y la mesa de pruebas: `?hora=noche` fija el cielo. */
export function hourFromUrl(search: string): HomeHour | null {
  const h = new URLSearchParams(search).get("hora");
  return HOME_HOURS.includes(h as HomeHour) ? (h as HomeHour) : null;
}

export const greeting = (hour: HomeHour) => (hour === "atardecer" ? "Buenas tardes" : hour === "noche" ? "Buenas noches" : "Buenos días");

/** 23.1: la bienvenida a quien no ha entrado. */
export const WELCOME = [
  "El trono de Aldricia sigue vacío. Se buscan candidatos con ambición y sin alergia al pollo.",
  "Seis semanas, un trono y ninguna llave. El cronista ya ha afilado la pluma.",
  "Aquí se forjan reyes de verdad. Bueno, de pacotilla, pero reyes.",
  "El difunto Aldric insiste en que con él el reino iba mejor. El cronista no lo recuerda así.",
];
/** 23.1, de noche: se añaden a las de siempre. */
export const WELCOME_NIGHT = [
  "A estas horas solo velan los fantasmas y los que no han dado sus órdenes.",
  "El cronista duerme con un ojo abierto. El otro también, por si acaso.",
];

/** 23.4: el pie de la hoja para entrar con el código. */
export const CODE_NOTE = "Fray Abundio no lo apunta, por discreción y porque se le olvidaría.";

/** Las frases de la bienvenida a esta hora. */
export const welcomeLines = (hour: HomeHour) => (hour === "noche" ? [...WELCOME_NIGHT, ...WELCOME] : WELCOME);

/** El código de acceso tal como se escribe: seis letras o números, en mayúsculas. */
export const cleanCode = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

// ------------------------------------------------------------------ con partidas

/** Una partida acabada hace menos de esto sube arriba con «Ver la coronación». */
const RECENT_END_DAYS = 7;

/**
 * Lo urgente primero: en juego y te faltan órdenes (la que cierra antes), recién
 * acabada, en juego con órdenes dadas, en la sala de espera y, al final, las acabadas.
 */
export function urgency(g: MyGame, now: Date): number {
  const r = g.resumen;
  if (g.estado === "active") return r?.faltanOrdenes ? 0 : 2;
  if (g.estado === "lobby") return 3;
  const end = r?.final?.fecha ? new Date(r.final.fecha).getTime() : 0;
  return now.getTime() - end < RECENT_END_DAYS * 864e5 ? 1 : 4;
}

export function sortGames(games: MyGame[], now: Date): MyGame[] {
  const close = (g: MyGame) => (g.resumen?.cierre ? new Date(g.resumen.cierre).getTime() : Infinity);
  return [...games].sort((a, b) => urgency(a, now) - urgency(b, now) || close(a) - close(b) || b.id - a.id);
}

/**
 * Las pruebas llevan su propio reloj: su cierre se pasa a la hora del móvil
 * para que la cuenta atrás diga lo que falta de verdad en esa partida.
 */
export function toDeviceClock(g: MyGame, now: Date): MyGame {
  const r = g.resumen;
  if (!r?.ahora || !r.cierre) return g;
  const cierre = new Date(Date.parse(r.cierre) - Date.parse(r.ahora) + now.getTime()).toISOString();
  return { ...g, resumen: { ...r, cierre, ahora: undefined } };
}

/** La partida de la tarjeta grande: la más urgente, pero una de prueba solo si no hay otra. */
export function mainGame(sorted: MyGame[]): MyGame | null {
  return sorted.find((g) => !g.prueba) ?? sorted[0] ?? null;
}

/** «3 h 12 min», «12 min», «2 días y 4 h»: lo que falta hasta `at`. */
export function timeLeft(at: string, now: Date): string {
  const min = Math.max(0, Math.ceil((new Date(at).getTime() - now.getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${String(min % 60).padStart(2, "0")} min`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "día" : "días"}${h % 24 ? ` y ${h % 24} h` : ""}`;
}

/** Si el cierre cae dentro de la última hora (el mismo aviso del bloque 12). */
export const closingSoon = (at: string | null | undefined, now: Date) =>
  !!at && new Date(at).getTime() - now.getTime() < CLOSE_WARNING_MINUTES * 60_000;

/** La hora local del cierre: «A las 21:00» si es hoy, «El sábado a las 21:00» si no. */
export function closeLine(at: string, now: Date): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `A las ${time}.`;
  const day = d.toLocaleDateString("es-ES", { weekday: "long" });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString() === d.toDateString();
  return tomorrow ? `Mañana a las ${time}.` : `El ${day} a las ${time}.`;
}

const RESULT: Record<string, (c: string) => string> = {
  resistio: (c) => `Te atacaron en ${c}: resististe`,
  perdida: (c) => `Perdiste ${c}`,
  conquista: (c) => `Conquistaste ${c}`,
  fallo: (c) => `Tu ataque en ${c} no pasó`,
};
/** Los combates de anoche en una línea cada uno (hasta dos y «y N más»). */
export function attackLines(ataques: { casilla: string; resultado: string }[]): string[] {
  const lines = ataques.slice(0, 2).map((a) => (RESULT[a.resultado] ?? RESULT.fallo!)(a.casilla));
  const more = ataques.length - lines.length;
  if (more > 0) lines.push(`Y ${more} ${more === 1 ? "combate" : "combates"} más anoche`);
  return lines;
}

/** Ganadas (primero en una partida de verdad acabada), jugadas y el título de la última. */
export function showcase(games: MyGame[]) {
  const done = games.filter((g) => g.estado === "finished" && !g.prueba);
  return {
    coronas: done.filter((g) => g.resumen?.final?.ganador != null && g.resumen.final.ganador === g.casaId).length,
    jugadas: done.length,
    titulo: done.find((g) => g.titulo)?.titulo ?? null,
  };
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** 23.2: lo que dice Fray Abundio a quien ya juega, según la partida de arriba. */
export const INSIDE = {
  faltan: [
    "Las órdenes de esta noche siguen en blanco. El cronista no sabe escribir sobre nada, aunque lo intenta.",
    "Quedan {tiempo} para el cierre y vuestras tropas miran al cielo esperando instrucciones.",
  ],
  primero: ["{casa} va en cabeza con {n} de Prestigio. El cronista ya ensaya la reverencia, por si acaso."],
  persigue: ["{casa} va {puesto}.º, a {n} de Prestigio del primero. El cronista lo considera un triunfo moral."],
  ultimo: ["{casa} cierra la clasificación. Desde abajo, dicen, se ve mejor el cielo."],
  resistio: ["Anoche atacaron vuestras tierras y no pasaron. El cronista lo apunta como hazaña."],
  perdida: ["Anoche perdisteis {casilla}. El cronista no dirá que lo vio venir, pero lo vio venir."],
  conquista: ["Anoche conquistasteis {casilla}. El cronista ya busca adjetivos a la altura."],
  sala: ["La corte de «{partida}» aún se está reuniendo. El cronista guarda sitio, y pan."],
  corona: ["{casa} lleva la corona de «{partida}». El cronista lo dijo desde el principio, en voz muy baja."],
  acabada: ["«{partida}» ya tiene rey. El cronista recomienda ver la coronación, aunque duela."],
  tranquila: ["Noche tranquila en Aldricia. Sospechosamente tranquila."],
  vacio: ["Aún no estás en ninguna partida. Pide un enlace de invitación: el cronista no se presenta solo."],
};

/** Las frases de Fray Abundio para la tarjeta de arriba (de la más importante a la menos). */
export function insideLines(g: MyGame | null, now: Date): string[] {
  if (!g) return INSIDE.vacio;
  const v = { casa: g.casa, partida: g.nombre };
  if (g.estado === "lobby") return INSIDE.sala.map((s) => fill(s, v));
  const r = g.resumen;
  if (!r) return INSIDE.tranquila;
  if (g.estado === "finished")
    return (r.final?.ganador != null && r.final.ganador === g.casaId ? INSIDE.corona : INSIDE.acabada).map((s) => fill(s, v));
  const out: string[] = [];
  if (r.faltanOrdenes && r.cierre) out.push(...INSIDE.faltan.map((s) => fill(s, { ...v, tiempo: timeLeft(r.cierre!, now) })));
  const fight = r.ataques.find((a) => a.resultado === "perdida") ?? r.ataques.find((a) => a.resultado === "conquista") ?? r.ataques.find((a) => a.resultado === "resistio");
  if (fight) out.push(...INSIDE[fight.resultado as "perdida" | "conquista" | "resistio"].map((s) => fill(s, { ...v, casilla: fight.casilla })));
  const list = r.clasificacion;
  const mine = list.find((x) => x.casa === g.casaId);
  if (r.puesto && mine && list.length > 1) {
    if (r.puesto === 1) out.push(fill(INSIDE.primero[0]!, { ...v, n: mine.total }));
    else if (r.puesto === list.length) out.push(fill(INSIDE.ultimo[0]!, v));
    else out.push(fill(INSIDE.persigue[0]!, { ...v, puesto: r.puesto, n: list[0]!.total - mine.total }));
  }
  return out.length ? out : INSIDE.tranquila;
}
