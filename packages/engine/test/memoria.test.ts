// Bloque 3, PR 3: memoria del cronista y Crónica Definitiva.
import { describe, expect, it } from "vitest";
import { PHRASES, findMemories, writeBulletin, writeChronicle, type BulletinInput, type LoggedFact } from "../src";

const houses = [
  { id: 1, name: "Casa del Nabo", motto: null, color: "azur", symbol: "nabo", prestige: 20 },
  { id: 2, name: "Los Pocapena", motto: null, color: "gules", symbol: "lobo", prestige: 12 },
  { id: 3, name: "Gallina Bélica", motto: null, color: "sinople", symbol: "torre", prestige: 8 },
  { id: 4, name: "Duques del Queso", motto: null, color: "sable", symbol: "queso", prestige: 5 },
];
const tileNames = new Map([
  [10, "Villa Mediocre"],
  [11, "Peñasco Triste"],
]);
const fight = (tile: number, winner: number | null, previousOwner: number | null, conquered: boolean, resolution: number, troops = [4, 6]): LoggedFact => ({
  type: "combate",
  resolution,
  data: {
    tile,
    winner,
    previousOwner,
    conquered,
    sides: [
      { house: previousOwner, role: "defensa", strength: troops[0], troops: troops[0], supporters: [] },
      { house: conquered ? winner : previousOwner === 1 ? 2 : 1, role: "ataque", strength: troops[1], troops: troops[1], supporters: [] },
    ],
  },
});

describe("memoria del cronista", () => {
  it("venganza: recupera la casilla que le quitó esa misma casa, con las noches que la tuvo", () => {
    const m = findMemories({ past: [fight(10, 2, 1, true, 3)], now: [fight(10, 1, 2, true, 7)] });
    expect(m[0]).toEqual({ key: "memoria.venganza", houses: { jugador: 1, rival: 2 }, tiles: { casilla: 10 }, numbers: { noches: 4 } });
  });

  it("récord de batalla solo si supera a todas las anteriores y es grande", () => {
    expect(findMemories({ past: [], now: [fight(10, 1, 2, true, 1, [5, 6])] }).some((m) => m.key === "memoria.record_batalla")).toBe(false);
    expect(findMemories({ past: [fight(11, 1, 2, true, 1, [9, 9])], now: [fight(10, 1, 2, true, 2, [6, 8])] }).some((m) => m.key === "memoria.record_batalla")).toBe(false);
    const rec = findMemories({ past: [fight(11, 1, 2, true, 1, [5, 6])], now: [fight(10, 1, 2, true, 2, [7, 9])] }).find((m) => m.key === "memoria.record_batalla");
    expect(rec?.numbers.n).toBe(16);
  });

  it("rivalidad al llegar a 3 combates entre dos casas", () => {
    const past = [fight(10, 1, 2, true, 1), fight(10, 2, 1, true, 2)];
    const m = findMemories({ past, now: [fight(10, 1, 2, true, 3)] }).find((x) => x.key === "memoria.rivalidad");
    expect(m).toEqual({ key: "memoria.rivalidad", houses: { jugador: 1, rival: 2 }, tiles: {}, numbers: { veces: 3 } });
    // Al cuarto no se repite (hasta el quinto).
    expect(findMemories({ past: [...past, fight(10, 1, 2, true, 3)], now: [fight(10, 2, 1, true, 4)] }).some((x) => x.key === "memoria.rivalidad")).toBe(false);
  });

  it("racha de noches seguidas conquistando", () => {
    const past = [fight(10, 3, null, true, 4), fight(11, 3, null, true, 5)];
    const m = findMemories({ past, now: [fight(12, 3, null, true, 6)] }).find((x) => x.key === "memoria.racha");
    expect(m?.numbers.veces).toBe(3);
    expect(m?.houses.jugador).toBe(3);
  });

  it("remontada de tres puestos y caída del líder", () => {
    const m = findMemories({ past: [], now: [], previousRanking: [1, 2, 3, 4], ranking: [4, 2, 3, 1] });
    expect(m.find((x) => x.key === "memoria.remontada")).toMatchObject({ houses: { jugador: 4 }, numbers: { antes: 4, ahora: 1 } });
    expect(m.find((x) => x.key === "memoria.caida")).toMatchObject({ houses: { jugador: 1 }, numbers: { ahora: 4 } });
  });

  it("el boletín cuenta dos recuerdos como mucho, con las cifras y sin variables sin rellenar", () => {
    const input: BulletinInput = {
      seed: "s",
      week: 3,
      totalWeeks: 6,
      houses,
      previousLeader: 1,
      facts: [fight(10, 1, 2, true, 15, [8, 9])],
      tileNames,
      trades: [],
      bribes: [],
      used: [],
      memory: { past: [fight(10, 2, 1, true, 10), fight(11, 1, 2, false, 11)], previousRanking: [2, 3, 4, 1] },
    };
    const b = writeBulletin(input);
    const s = b.sections.find((x) => x.title === "La memoria del cronista")!;
    expect(s.lines).toHaveLength(2);
    const all = s.lines.join(" ");
    expect(all).not.toMatch(/\{[a-zíáéóú]+\}/);
    expect(all).toContain("Villa Mediocre");
    // La hoja volandera no habla de la clasificación.
    const mid = writeBulletin({ ...input, edition: "miercoles" });
    const ms = mid.sections.find((x) => x.title === "La memoria del cronista")!;
    expect(ms.lines.some((l) => PHRASES["memoria.remontada"].some((p) => p.slice(-10) === l.slice(-10)))).toBe(false);
  });
});

describe("Crónica Definitiva", () => {
  const facts = [
    { ...fight(10, 2, 1, true, 2, [5, 7]), week: 1 },
    { ...fight(10, 1, 2, true, 9, [3, 9]), week: 2 },
    { ...fight(11, 3, 1, false, 10, [6, 4]), week: 2 },
    { type: "alianza_rota", data: { by: 1, name: "Liga del Nabo Sereno" }, resolution: null, week: 3 },
  ];
  const input = { seed: "s", houses, winner: 1, facts, weeklyRanking: [[2, 3, 4, 1], [2, 1, 3, 4], [1, 2, 3, 4]], tileNames };

  it("cuenta los momentos del ganador a su favor, por semanas, con prólogo y epílogo", () => {
    const c = writeChronicle(input);
    expect(c.week).toBe(0);
    expect(c.chronicle).toBe(true);
    const titles = c.sections.map((s) => s.title);
    expect(titles[0]).toBe("Prólogo");
    expect(titles.at(-1)).toBe("Epílogo");
    expect(titles).toEqual(expect.arrayContaining(["Semana 1", "Semana 2", "Semana 3"]));
    const text = c.sections.flatMap((s) => s.lines).join("\n");
    expect(text).toContain("Liga del Nabo Sereno");
    expect(text).not.toMatch(/\{[a-zíáéóú]+\}/);
    // Fue último la semana 1: la frase de «último en Prestigio» solo vale entonces.
    const week1 = c.sections.find((s) => s.title === "Semana 1")!.lines.join(" ");
    expect(week1).toMatch(/último|Casa del Nabo/);
  });

  it("es siempre la misma para la misma partida", () => {
    expect(writeChronicle(input)).toEqual(writeChronicle(input));
  });

  it("no pasa de 8 momentos aunque la partida sea larga", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...fight(10 + (i % 2), 1, 2, true, i + 1), week: 1 + Math.floor(i / 3) }));
    const c = writeChronicle({ ...input, facts: many, weeklyRanking: [] });
    const moments = c.sections.filter((s) => s.title.startsWith("Semana")).flatMap((s) => s.lines);
    expect(moments.length).toBeLessThanOrEqual(8);
    expect(moments.length).toBeGreaterThanOrEqual(6);
  });
});
