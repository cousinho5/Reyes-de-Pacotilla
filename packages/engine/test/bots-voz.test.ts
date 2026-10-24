import { describe, expect, it } from "vitest";
import {
  BRIBE_COST,
  OBJECTIVE_TARGETS,
  PERSONALITIES,
  PHRASES,
  PROCLAMATION,
  VOICE,
  answerMention,
  objectiveMet,
  objectiveTargets,
  objectiveText,
  offerGain,
  planBribe,
  planErrata,
  planProclamation,
  proclamationMentions,
  situation,
  type AiView,
  type VoiceContext,
} from "../src";

// La voz de los bots y sus ambiciones (docs/bots.md, PR 4).

const view = (extra: Partial<AiView> = {}): AiView => ({
  house: 1,
  tiles: [{ id: 1, x: 0, y: 0, type: "castillo", owner: 1, troops: 6, fortifiedUntil: null, castleOf: 1 }],
  buildings: { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 },
  resources: { pan: 30, madera: 30, piedra: 30, hierro: 30, oro: 80 },
  nextResolution: 6,
  day: 5,
  totalDays: 14,
  objective: null,
  prestige: [
    { house: 1, total: 5 },
    { house: 2, total: 9 },
    { house: 3, total: 3 },
  ],
  recentPartners: [],
  ...extra,
});
const names = new Map([
  [1, "Casa del Nabo"],
  [2, "Vizcondes del Bache"],
  [3, "Gallina Bélica"],
]);
const ctx = (extra: Partial<VoiceContext> = {}): VoiceContext => ({ seed: "voz", week: 1, names, rank: 2, rankBefore: null, newAllies: [], ...extra });
const houses = [...names].map(([id, name]) => ({ id, name }));

describe("Bots: proclamas", () => {
  it("si les han atacado, siempre lo recuerdan nombrando a quien fue", () => {
    for (let week = 1; week <= 6; week++) {
      const text = planProclamation(situation(view({ attackedBy: [3] }), PERSONALITIES.mercader), ctx({ week }))!;
      expect(proclamationMentions(text, houses).map((h) => h.id)).toEqual([3]);
    }
  });

  it("como mucho una por semana, y casi todas las semanas dicen algo", () => {
    const weeks = Array.from({ length: 40 }, (_, w) => planProclamation(situation(view(), PERSONALITIES.estratega), ctx({ week: w + 1 })));
    const spoke = weeks.filter(Boolean).length;
    expect(spoke).toBeGreaterThan(40 * VOICE.proclamationChance * 0.6);
    expect(spoke).toBeLessThan(40);
  });

  it("todas las frases caben en una proclama con el nombre más largo", () => {
    const long = "@" + "X".repeat(20);
    for (const [key, list] of Object.entries(PHRASES)) {
      if (!key.startsWith("bot.proclama") && !key.startsWith("bot.respuesta") && key !== "bot.erratas") continue;
      for (const t of list as readonly string[]) expect([...t.replace(/\{casa\}/g, long)].length).toBeLessThanOrEqual(PROCLAMATION.maxLetters);
    }
  });

  it("contestan a quien les nombra: amables con un aliado, duros con quien les atacó", () => {
    const allied = situation(view({ alliances: [{ a: 1, b: 2, status: "active", endsAt: null, since: 1 }] }), PERSONALITIES.estratega);
    expect((PHRASES["bot.respuesta.aliado"] as readonly string[]).map((t) => t.replace(/\{casa\}/g, "@Vizcondes del Bache"))).toContain(
      answerMention(allied, ctx(), 2),
    );
    const angry = situation(view({ attackedBy: [3] }), PERSONALITIES.estratega);
    expect((PHRASES["bot.respuesta.amenaza"] as readonly string[]).map((t) => t.replace(/\{casa\}/g, "@Gallina Bélica"))).toContain(
      answerMention(angry, ctx(), 3),
    );
  });
});

describe("Bots: soborno con motivo y fe de erratas", () => {
  it("solo sobornan tras bajar puestos o yendo primeros, con una frase de su motivo", () => {
    const s = situation(view(), PERSONALITIES.estratega);
    const weeks = (c: Partial<VoiceContext>) => Array.from({ length: 30 }, (_, w) => planBribe(s, ctx({ ...c, week: w + 1 })));
    expect(weeks({ rank: 2, rankBefore: 2 }).every((x) => x == null)).toBe(true);
    const fell = weeks({ rank: 3, rankBefore: 1 }).filter((x) => x != null);
    expect(fell.length).toBeGreaterThan(0);
    for (const t of fell) expect(VOICE.bribeAfterFall).toContain(t);
    for (const t of weeks({ rank: 1, rankBefore: 1 }).filter((x) => x != null)) expect(VOICE.bribeAsLeader).toContain(t);
  });

  it("no sobornan si se quedan sin Oro", () => {
    const poor = situation(view({ resources: { pan: 30, madera: 30, piedra: 30, hierro: 30, oro: BRIBE_COST + VOICE.bribeReserve - 1 } }), PERSONALITIES.estratega);
    for (let w = 1; w <= 20; w++) expect(planBribe(poor, ctx({ week: w, rank: 1 }))).toBeNull();
  });

  it("la fe de erratas es de quien no ganó y nombra al ganador", () => {
    expect(planErrata(2, 2, ctx())).toBeNull();
    const texts = [1, 3].map((h) => planErrata(h, 2, ctx())).filter(Boolean) as string[];
    for (const t of texts) expect(t).not.toMatch(/[{}]/);
  });
});

describe("Ambiciones a escala de la partida", () => {
  it("en 2 semanas piden menos y el texto lo dice; en 6, lo de siempre", () => {
    expect(objectiveTargets(6)).toEqual({ ...OBJECTIVE_TARGETS });
    expect(objectiveTargets(2).troops).toBeLessThan(OBJECTIVE_TARGETS.troops);
    expect(objectiveText("tropas_40", 2)).toContain(String(objectiveTargets(2).troops));
    expect(objectiveText("obra_maestra", 2)).toBe(`Tener un edificio a nivel ${objectiveTargets(2).masterpieceLevel}.`);
    const base = { house: 1, tiles: [], gold: 0, partnersAllGame: 0, otherHouses: 3, validTradesAllGame: 0, tilesTakenFromHouses: 0, auctionsWon: 0 };
    const four = { granja: 4, aserradero: 2, cantera: 1, mina: 1, mercado: 1 };
    expect(objectiveMet("obra_maestra", { ...base, buildings: four, weeks: 2 })).toBe(true);
    expect(objectiveMet("obra_maestra", { ...base, buildings: four, weeks: 6 })).toBe(false);
  });

  it("los bots persiguen el tesoro y los tratos de su ambición", () => {
    const plain = situation(view({ resources: { pan: 30, madera: 30, piedra: 30, hierro: 30, oro: 10 } }), PERSONALITIES.estratega);
    const saver = situation(view({ objective: "tesoro", resources: { pan: 30, madera: 30, piedra: 30, hierro: 30, oro: 10 } }), PERSONALITIES.estratega);
    expect(saver.values.oro).toBeGreaterThan(plain.values.oro);
    const totals = { valid: 2, partners: [2] };
    const trader = situation(view({ objective: "diez_tratos", tradeTotals: totals, recentPartners: [3] }), PERSONALITIES.estratega);
    const other = situation(view({ tradeTotals: totals, recentPartners: [3] }), PERSONALITIES.estratega);
    expect(offerGain(trader, { piedra: 10 }, { madera: 10 }, 3)).toBeGreaterThan(offerGain(other, { piedra: 10 }, { madera: 10 }, 3));
  });
});
