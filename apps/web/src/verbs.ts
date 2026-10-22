// Bloque 12: el destino propone el verbo de la orden, y debajo van los otros posibles.

import { ANY_ORIGIN, areAdjacent } from "@reyes/engine";
import type { OrderView, TileView } from "./api";

/**
 * Mover, Atacar y Entrar son la misma orden de marcha (a una casilla tuya, a una
 * vacía o enemiga y a una aliada). Apoyar suma al primer ataque que llegue
 * (bloque 4) y Defender suma a la defensa de la casilla, sea de quien sea.
 */
export type Verb = "mover" | "atacar" | "entrar" | "apoyar" | "defender" | "sitiar";

export const VERB_LABEL: Record<Verb, string> = {
  mover: "Mover",
  atacar: "Atacar",
  entrar: "Entrar",
  apoyar: "Apoyar el ataque",
  defender: "Defender",
  sitiar: "Sitiar",
};

/** Título de la orden: «Atacar El Llano», «Mover a El Llano», «Apoyar el ataque a El Llano». */
export function verbTitle(verb: Verb, target: string): string {
  const to = { mover: "a ", entrar: "en ", apoyar: "a ", atacar: "", defender: "", sitiar: "" }[verb];
  return `${VERB_LABEL[verb]} ${to}${target}`;
}

/** Se puede sitiar: fortalezas y castillos que no son tuyos ni de una casa con la que tienes alianza. */
export const siegeable = (t: TileView, me: number | null | undefined, bound: number[] = []) =>
  t.owner !== me && (t.owner == null || !bound.includes(t.owner)) && (t.type === "fortaleza" || (t.type === "castillo" && t.castleOf != null));

export interface VerbContext {
  from: TileView;
  target: TileView;
  me: number;
  /** Aliados en vigor y casas con la alianza en vigor o en aviso. */
  allies: number[];
  bound: number[];
  /** El grupo puede marchar hasta allí esta noche (vecina, camino, mar o carga). */
  canMarch: boolean;
  /** Ya va esta noche un ataque tuyo a esa casilla desde otra. */
  attackGoing: boolean;
  /** Tropas de paso en una alianza en aviso: solo pueden salir. */
  marchOnly?: boolean;
}

/** Los verbos posibles hacia `target`, el propuesto primero. Vacío si no se puede ir. */
export function verbsFor(c: VerbContext): Verb[] {
  const { from, target, me } = c;
  const near = areAdjacent(from, target) && target.type !== "castillo";
  const out: (Verb | false)[] = [];
  const support = !c.marchOnly && near;
  if (target.owner === me) out.push(c.canMarch && "mover", support && "defender");
  else if (target.owner != null && c.allies.includes(target.owner)) out.push(c.canMarch && "entrar", support && "defender");
  else if (target.owner != null && c.bound.includes(target.owner)) out.push(c.canMarch && "mover", support && "defender");
  else {
    const siege = !c.marchOnly && areAdjacent(from, target) && siegeable(target, me, c.bound);
    const attack = [c.canMarch && "atacar", support && "apoyar"] as (Verb | false)[];
    out.push(...(c.attackGoing ? attack.reverse() : attack), siege && "sitiar");
    // Defender una casilla de otra casa también puede convenir (revisión 5).
    if (target.owner != null) out.push(support && "defender");
  }
  return out.filter((v): v is Verb => !!v);
}

/** El verbo de una orden ya dada, para abrirla y cambiarla. */
export function verbOf(o: OrderView, target: TileView | undefined, me: number, allies: number[], bound: number[]): Verb {
  if (o.tipo === "sitiar") return "sitiar";
  if (o.tipo === "apoyar") return o.apoyaDesde === null ? "defender" : "apoyar";
  const owner = target?.owner;
  if (owner === me) return "mover";
  if (owner != null && allies.includes(owner)) return "entrar";
  if (owner != null && bound.includes(owner)) return "mover";
  return "atacar";
}

/** La orden que sale de un verbo. */
export function orderOf(verb: Verb): Pick<OrderView, "tipo" | "apoyaDesde"> {
  if (verb === "apoyar") return { tipo: "apoyar", apoyaDesde: ANY_ORIGIN };
  if (verb === "defender") return { tipo: "apoyar", apoyaDesde: null };
  if (verb === "sitiar") return { tipo: "sitiar", apoyaDesde: null };
  return { tipo: "mover", apoyaDesde: null };
}

/** Atajos de tropas: ninguna, la mitad (redondeando hacia arriba) o todas. */
export function share(available: number, part: "ninguna" | "mitad" | "todas"): number {
  return part === "ninguna" ? 0 : part === "todas" ? available : Math.ceil(available / 2);
}
