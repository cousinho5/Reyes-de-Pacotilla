// Bloque 3, PR 1: frases nuevas de Fray Abundio y lo que cuenta el boletín con ellas.
import { describe, expect, it } from "vitest";
import { PHRASES, checkProclamation, proclamationMentions, resolveCampaign, writeBulletin, type BulletinInput, type PhraseKey, type Tile, type TileType } from "../src";

const houses = [
  { id: 1, name: "Casa del Nabo", motto: null, color: "azur", symbol: "nabo", prestige: 20 },
  { id: 2, name: "Los Pocapena", motto: null, color: "gules", symbol: "lobo", prestige: 12 },
  { id: 3, name: "Gallina Bélica", motto: null, color: "sinople", symbol: "torre", prestige: 8 },
];
const base: BulletinInput = {
  seed: "s",
  week: 2,
  totalWeeks: 6,
  houses,
  previousLeader: 1,
  facts: [],
  tileNames: new Map([
    [10, "Villa Mediocre"],
    [11, "Peñasco Triste"],
    [12, "Bosque Hondo"],
  ]),
  tileTypes: new Map<number, TileType>([
    [10, "campos"],
    [11, "castillo"],
    [12, "bosque"],
  ]),
  tileOwners: new Map([
    [10, 2],
    [11, 1],
    [12, 2],
  ]),
  trades: [],
  bribes: [],
  used: [],
};
const text = (b: ReturnType<typeof writeBulletin>) => [b.headline, ...b.sections.flatMap((s) => s.lines)].join("\n");
const fight = (tile: number, winner: number, previousOwner: number, conquered: boolean, atk: Record<string, unknown> = {}) => ({
  type: "combate",
  data: {
    tile,
    winner,
    previousOwner,
    conquered,
    survivors: 3,
    sides: [
      { house: previousOwner, role: "defensa", strength: 4, troops: 4, supporters: [] },
      { house: previousOwner === 1 ? 2 : 1, role: "ataque", strength: 9, troops: 7, supporters: [], ...atk },
    ],
  },
});

// Variables que puede usar cada tipo nuevo (si una frase pide otra, el boletín la dejaría sin rellenar).
const ALLOWED: Partial<Record<PhraseKey, string[]>> = {
  "combate.choque": ["a", "b", "ganador"],
  "combate.cruce": ["a", "b", "ganador", "casilla"],
  "combate.carga": ["ganador", "perdedor", "casilla", "n", "m"],
  "combate.brecha": ["ganador", "perdedor", "casilla", "n", "m"],
  "combate.castillo": ["ganador", "perdedor", "casilla", "n", "m"],
  "combate.emboscada": ["defensor", "atacante", "casilla", "n", "m"],
  "combate.rio": ["ganador", "perdedor", "defensor", "atacante", "casilla", "n", "m"],
  "combate.repliegue_perdido": ["jugador", "casilla", "destino", "n"],
  "reino.ruinas": ["jugador", "casilla", "premio"],
  "asedio.empieza": ["sitiador", "sitiado", "casilla"],
  "asedio.sigue": ["sitiador", "sitiado", "casilla", "noches"],
  "asedio.cortado": ["sitiador", "sitiado", "casilla", "jugador", "noches"],
  "asedio.levantado": ["sitiador", "sitiado", "casilla", "noches"],
  "capitan.preso": ["jugador", "captor", "casilla"],
  "capitan.fuga": ["jugador", "captor", "noches"],
  "capitan.rescate": ["jugador", "captor", "oro"],
  "capitan.liberado": ["jugador", "captor"],
  "gloria.semana": ["jugador", "gloria"],
  "gloria.honor": ["jugador", "ganador", "casilla"],
  "corona.ayuda": ["jugador"],
  "corona.tregua": ["jugador", "casilla"],
  "corona.paz": ["casilla"],
};

describe("banco de frases del bloque 3", () => {
  it("cada tipo nuevo tiene al menos dos variantes, sin repetir, y solo con sus variables", () => {
    const keys = Object.keys(PHRASES).filter((k) =>
      /^(asedio|capitan|gloria|corona|hambre|memoria|noche|proclamas|volandera|cronica)\.|^combate\.(choque|cruce|carga|emboscada|brecha|rio|repliegue|castillo)|^reino\.ruinas/.test(k),
    ) as PhraseKey[];
    expect(keys.length).toBeGreaterThanOrEqual(50);
    for (const key of keys) {
      const all = PHRASES[key] as readonly string[];
      expect(all.length, key).toBeGreaterThanOrEqual(2);
      expect(new Set(all).size, key).toBe(all.length);
      const allowed = ALLOWED[key];
      if (!allowed) continue;
      for (const p of all) for (const v of p.match(/\{([^}]+)\}/g) ?? []) expect(allowed, `${key}: ${p}`).toContain(v.slice(1, -1));
    }
  });
});

describe("el combate apunta cargas y brechas para el cronista", () => {
  const make = (mid: TileType, extra: Partial<Tile> = {}): Tile[] => [
    { id: 1, x: 0, y: 0, type: "castillo", owner: 1, castleOf: 1, troops: 0 },
    { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 14, jinetes: 4, catapultas: 2 },
    { id: 3, x: 2, y: 0, type: mid, owner: 2, troops: 6, ...extra },
  ];
  const attacker = (tiles: Tile[], order: Record<string, number>) => {
    const r = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 4, ...order }] });
    const e = r.events.find((x) => x.type === "combate");
    return e?.type === "combate" ? e.sides.find((s) => s.role === "ataque") : undefined;
  };

  it("carga si hay jinetes contra lo llano sin murallas, y no con murallas", () => {
    expect(attacker(make("campos"), { jinetes: 4 })?.charge).toBe(true);
    expect(attacker(make("campos"), {})?.charge).toBeUndefined();
    expect(attacker(make("campos", { fortifiedUntil: 3 }), { jinetes: 4 })?.charge).toBeUndefined();
  });

  it("brecha si llevan catapultas contra unas murallas", () => {
    expect(attacker(make("fortaleza"), { troops: 10, catapultas: 2 })?.breach).toBe(true);
    expect(attacker(make("campos"), { troops: 10, catapultas: 2 })?.breach).toBeUndefined();
  });
});

describe("el boletín cuenta lo que antes callaba", () => {
  it("un castillo que cae va al titular y a la crónica, con las cifras", () => {
    const b = writeBulletin({ ...base, facts: [fight(11, 2, 1, true)] });
    expect(b.headline).toBe("CAE EL CASTILLO DE LA CASA DEL NABO");
    expect(b.mood).toBe("escandalizado");
    const line = b.sections.find((s) => s.title === "Crónica de las armas")!.lines[0]!;
    expect(PHRASES["combate.castillo"].some((p) => p.slice(-15) === line.slice(-15))).toBe(true);
    expect(line).toMatch(/Pocapena/);
  });

  it("cargas, brechas, ríos y emboscadas usan su frase propia muchas veces, no siempre", () => {
    const count = (key: PhraseKey, f: ReturnType<typeof fight>) => {
      let n = 0;
      for (let i = 0; i < 60; i++) {
        const line = writeBulletin({ ...base, seed: `s${i}`, facts: [f] }).sections.find((s) => s.title === "Crónica de las armas")!.lines[0]!;
        if ((PHRASES[key] as readonly string[]).some((p) => p.slice(-12) === line.slice(-12))) n++;
      }
      return n;
    };
    for (const [key, f] of [
      ["combate.carga", fight(10, 1, 2, true, { charge: true })],
      ["combate.brecha", fight(10, 1, 2, true, { breach: true })],
      ["combate.rio", fight(10, 1, 2, true, { river: true })],
      ["combate.emboscada", fight(12, 2, 2, false)],
    ] as const) {
      const n = count(key, f);
      expect(n, key).toBeGreaterThan(15);
      expect(n, key).toBeLessThan(55);
    }
  });

  it("asedios, Capitanes, Corona, ruinas, choques y Gloria tienen su sitio", () => {
    const b = writeBulletin({
      ...base,
      facts: [
        { type: "asedio", data: { house: 1, tile: 10, nights: 1, castle: false, from: [] } },
        { type: "asedio", data: { house: 1, tile: 10, nights: 2, castle: false, from: [] } },
        { type: "asedio", data: { house: 1, tile: 10, nights: 3, castle: false, from: [] } },
        { type: "capitan_preso", data: { house: 3, by: 2, tile: 10, freeAt: 9 } },
        { type: "capitan_libre", data: { house: 3, reason: "rescate", by: 2, oro: 17 } },
        { type: "ayuda_ultimo", data: { house: 3, until: 9 } },
        { type: "paz", data: { tile: 12, houses: [1] } },
        { type: "ruinas", data: { house: 2, tile: 12, prize: { kind: "recursos", resource: "oro", amount: 12 } } },
        { type: "choque_frontal", data: { tiles: [10, 12], winner: 2, sides: [{ house: 1, strength: 3 }, { house: 2, strength: 5 }] } },
        fight(12, 2, 2, false),
        fight(10, 2, 2, false),
      ],
    });
    const titles = b.sections.map((s) => s.title);
    expect(titles).toContain("Sitios y cautivos");
    expect(titles).toContain("Por orden de la Corona");
    const all = text(b);
    expect(all).toContain("Villa Mediocre");
    expect(all).toMatch(/\b3 noches|noche 3|\(3 noches\)|3\.ª|Tras 3/);
    expect(all).toContain("17 de Oro");
    expect(all).toContain("12 de Oro");
    // Tres victorias de los Pocapena (dos defensas y el choque): 3 de Gloria.
    expect(all).toMatch(/3\b.*Gloria|Gloria.*\(3\)|\(3\)/);
    expect(all).not.toMatch(/\{[a-zíáéóú]+\}/);
  });

  it("las deserciones por hambre no salen en el boletín (los recursos son secretos)", () => {
    const b = writeBulletin({ ...base, facts: [{ type: "mantenimiento", data: { house: 2, deserted: 4 } }] });
    expect(text(b)).not.toMatch(/desert/i);
  });

  it("misma entrada, mismo boletín", () => {
    const input = { ...base, facts: [fight(10, 1, 2, true, { charge: true }), fight(11, 2, 1, true)] };
    expect(writeBulletin(input)).toEqual(writeBulletin(input));
  });
});

describe("asedios a guarniciones neutrales", () => {
  it("no salen en el boletín: solo es noticia sitiar a otra casa", () => {
    const owners = new Map([[10, null]]);
    const b = writeBulletin({ ...base, tileOwners: owners, facts: [{ type: "asedio", data: { house: 1, tile: 10, nights: 1, castle: false, from: [] } }] });
    expect(b.sections.map((s) => s.title)).not.toContain("Sitios y cautivos");
  });
});

describe("hoja volandera del miércoles (bloque 3, PR 2)", () => {
  const facts = [
    fight(10, 1, 2, true),
    { type: "alianza", data: { a: 1, b: 3, name: "Liga del Nabo Sereno" } },
    { type: "evento", data: { nombre: "Feria de otoño", linea: "Se vende de todo." } },
  ];

  it("solo lleva entradilla, armas, sitios y pactos, sin favorito, mercados ni sobornos", () => {
    const b = writeBulletin({ ...base, edition: "miercoles", facts, bribes: [{ house: 1, template: 0, amount: 10 }] });
    expect(b.edition).toBe("miercoles");
    const titles = b.sections.map((s) => s.title);
    expect(titles[0]).toBe("Hoja volandera");
    expect(titles).toContain("Crónica de las armas");
    expect(titles).toContain("Pactos y traiciones");
    expect(titles).not.toContain("El favorito del cronista");
    expect(titles).not.toContain("Mercados y augurios");
    expect(titles).not.toContain("Comunicados de la corte");
    expect(b.sponsors).toEqual([]);
    expect(b.margin).toHaveLength(1);
  });

  it("sin nada que contar, su propia frase de calma y su titular", () => {
    const b = writeBulletin({ ...base, edition: "miercoles", previousLeader: 2 });
    expect(b.headline).toBe("MITAD DE SEMANA TRANQUILA");
    const line = b.sections.find((s) => s.title === "La paz del reino")!.lines[0]!;
    expect(PHRASES["volandera.tranquila"]).toContain(line);
  });

  it("el domingo no repite lo que ya contó el miércoles, pero sí el resto de la semana", () => {
    const told = facts.map((f) => ({ ...f, told: f.type !== "evento" }));
    const b = writeBulletin({ ...base, facts: told });
    const titles = b.sections.map((s) => s.title);
    expect(titles).toContain("La paz del reino");
    expect(titles).not.toContain("Pactos y traiciones");
    expect(text(b)).toContain("Feria de otoño");
    expect(b.headline).toBe("SEMANA TRANQUILA EN ALDRICIA");
  });

  it("cada edición tiene su propio azar: misma semana, frases distintas", () => {
    const sun = writeBulletin({ ...base, facts: [fight(10, 1, 2, true)] });
    const wed = writeBulletin({ ...base, edition: "miercoles", facts: [fight(10, 1, 2, true)], used: sun.used });
    expect(wed.used.filter((k) => sun.used.includes(k))).toEqual([]);
  });
});

describe("proclamas (bloque 3, PR 2)", () => {
  it("salen firmadas y sin tocar en el domingo; el cronista se desmarca si nombran a otra casa", () => {
    const b = writeBulletin({
      ...base,
      proclamations: [
        { house: 1, text: "que tiemblen @los pocapena" },
        { house: 2, text: "Los Pocapena no temen a nadie." },
        { house: 3, text: "Cacareamos fuerte." },
      ],
    });
    const s = b.sections.find((x) => x.title === "Proclamas")!;
    expect(s.verbatim).toBe(true);
    expect(PHRASES["proclamas.entrada"]).toContain(s.lines[0]);
    expect(s.lines[1]).toBe("«que tiemblen @los pocapena» (firma la Casa del Nabo)");
    expect(PHRASES["proclamas.nota"]).toContain(s.lines[2]);
    // Sin «@» no cuenta como mención (ni nombrarse a sí misma).
    expect(s.lines[3]).toBe("«Los Pocapena no temen a nadie.» (firma los Pocapena)");
    expect(s.lines[4]).toBe("«Cacareamos fuerte.» (firma Gallina Bélica)");
  });

  it("las menciones van con «@» y el nombre, sin importar mayúsculas ni tildes", () => {
    const hs = [{ name: "Gallina Bélica" }, { name: "Casa del Nabo" }];
    expect(proclamationMentions("Ojo, @gallina belica y @Casa del Nabo", hs)).toEqual(hs);
    expect(proclamationMentions("La gallina bélica no está nombrada", hs)).toEqual([]);
  });

  it("no salen en la hoja volandera", () => {
    const b = writeBulletin({ ...base, edition: "miercoles", proclamations: [{ house: 1, text: "Hola" }] });
    expect(b.sections.map((s) => s.title)).not.toContain("Proclamas");
  });

  it("hasta 140 letras, sin enlaces; vacía es retirarla", () => {
    expect(checkProclamation("  Viva   el\nNabo  ")).toEqual({ ok: true, text: "Viva el Nabo" });
    expect(checkProclamation("ñ".repeat(140)).ok).toBe(true);
    expect(checkProclamation("ñ".repeat(141)).ok).toBe(false);
    expect(checkProclamation("mirad https://x.y").ok).toBe(false);
    expect(checkProclamation("entrad en nabo.com").ok).toBe(false);
    expect(checkProclamation("   ")).toEqual({ ok: true, text: "" });
  });
});
