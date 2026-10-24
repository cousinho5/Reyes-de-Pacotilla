// La voz de los bots (docs/bots.md, PR 4): su proclama de la semana, la
// respuesta cuando otra casa les nombra con «@», el soborno al cronista con
// motivo y la fe de erratas al acabar. Las frases son del banco (sección 24,
// claves `bot.*`; el soborno usa las de siempre, sección 7) y se eligen con
// la semilla, como todo en el motor.

import { noticeText } from "../notices";
import { seededRandom } from "../random";
import { BRIBE_COST, VOICE } from "../rules";
import type { PhraseKey } from "../texts/cronista";
import type { HouseId } from "../types";
import type { Situation } from "./view";

export interface VoiceContext {
  /** Semilla de la partida y semana del boletín. */
  seed: string;
  week: number;
  /** Nombre de cada casa, para nombrarla con «@». */
  names: Map<HouseId, string>;
  /** Puesto ahora y tras el domingo anterior (1 = primero; null en la primera semana). */
  rank: number;
  rankBefore: number | null;
  /** Aliados con los que firmó esta semana. */
  newAllies: HouseId[];
}

const mention = (ctx: VoiceContext, h: HouseId) => `@${ctx.names.get(h) ?? "?"}`;
const pick = (ctx: VoiceContext, house: HouseId, what: string) =>
  Math.floor(seededRandom(`${ctx.seed}:${what}:${house}:${ctx.week}`)() * 1e6);

function say(key: PhraseKey, ctx: VoiceContext, house: HouseId, casa?: HouseId): string {
  return noticeText(key, pick(ctx, house, key), casa != null ? { casa: mention(ctx, casa) } : {});
}

/**
 * Proclama de la semana, o null si esta semana calla. Siempre habla si le han
 * atacado (el rencor con memoria); si no, la mayoría de las semanas.
 */
export function planProclamation(s: Situation, ctx: VoiceContext): string | null {
  const me = s.view.house;
  const attacker = (s.view.attackedBy ?? []).find((h) => ctx.names.has(h));
  if (attacker != null) return say("bot.proclama.rencor", ctx, me, attacker);
  if (seededRandom(`${ctx.seed}:proclama:${me}:${ctx.week}`)() >= VOICE.proclamationChance) return null;
  const ally = ctx.newAllies.find((h) => ctx.names.has(h));
  if (ally != null) return say("bot.proclama.alianza", ctx, me, ally);
  if (ctx.rank === 1) return say("bot.proclama.lider", ctx, me);
  if (ctx.rankBefore != null && ctx.rank > ctx.rankBefore && s.leader != null) return say("bot.proclama.caida", ctx, me, s.leader);
  if (s.leader != null && s.p.leaderHatred >= VOICE.leaderHatred) return say("bot.proclama.contra_lider", ctx, me, s.leader);
  if (s.p.trade >= VOICE.trader) return say("bot.proclama.mercado", ctx, me);
  return say("bot.proclama.tranquila", ctx, me);
}

/** Respuesta a una proclama de `from` que le nombra: amable con un aliado, dura con quien le atacó. */
export function answerMention(s: Situation, ctx: VoiceContext, from: HouseId): string {
  const key: PhraseKey = s.allies.includes(from)
    ? "bot.respuesta.aliado"
    : (s.view.attackedBy ?? []).includes(from)
      ? "bot.respuesta.amenaza"
      : "bot.respuesta.neutral";
  return say(key, ctx, s.view.house, from);
}

/**
 * Soborno al cronista con motivo: tras una mala semana (ha bajado puestos),
 * para lavar la imagen, o yendo primero, por vanidad. Devuelve la frase del
 * catálogo (sección 7) que encaja con el motivo, o null si no soborna.
 */
export function planBribe(s: Situation, ctx: VoiceContext): number | null {
  const fell = ctx.rankBefore != null && ctx.rank > ctx.rankBefore;
  const first = ctx.rank === 1;
  if (!fell && !first) return null;
  if (s.view.resources.oro < BRIBE_COST + VOICE.bribeReserve) return null;
  if (seededRandom(`${ctx.seed}:soborno:${s.view.house}:${ctx.week}`)() >= VOICE.bribeChance) return null;
  const options = fell ? VOICE.bribeAfterFall : VOICE.bribeAsLeader;
  return options[pick(ctx, s.view.house, "soborno-frase") % options.length]!;
}

/** Fe de erratas de una casa que no ganó, al pie de la Crónica Definitiva (null si calla). */
export function planErrata(house: HouseId, winner: HouseId | null, ctx: VoiceContext): string | null {
  if (winner == null || house === winner) return null;
  if (seededRandom(`${ctx.seed}:erratas:${house}`)() >= VOICE.errataChance) return null;
  return say("bot.erratas", ctx, house, winner);
}
