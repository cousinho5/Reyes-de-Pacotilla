// Bloque 12: el destino propone el verbo de la orden.
import { describe, expect, it } from "vitest";
import { ANY_ORIGIN } from "@reyes/engine";
import type { OrderView, TileView } from "../src/api";
import { orderOf, share, verbOf, verbsFor, type VerbContext } from "../src/verbs";

const tile = (id: number, x: number, y: number, type: TileView["type"], owner: number | null, extra: Partial<TileView> = {}) =>
  ({ id, x, y, type, owner, troops: 3, nombre: `C${id}`, visible: true, ...extra }) as TileView;

const from = tile(1, 1, 1, "campos", 1);
const ctx = (target: TileView, over: Partial<VerbContext> = {}): VerbContext => ({
  from,
  target,
  me: 1,
  allies: [2],
  bound: [2, 3],
  canMarch: true,
  attackGoing: false,
  ...over,
});

describe("Verbo según el destino", () => {
  it("a una casilla tuya propone Mover y deja Defender", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "bosque", 1)))).toEqual(["mover", "defender"]);
  });

  it("a una casilla aliada propone Entrar y deja Defender", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "bosque", 2)))).toEqual(["entrar", "defender"]);
  });

  it("a una enemiga propone Atacar; también se puede apoyar el ataque o defenderla", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "campos", 4)))).toEqual(["atacar", "apoyar", "defender"]);
  });

  it("a una vacía no ofrece Defender", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "campos", null)))).toEqual(["atacar", "apoyar"]);
  });

  it("si ya va un ataque tuyo allí, propone Apoyar", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "campos", 4), { attackGoing: true }))[0]).toBe("apoyar");
  });

  it("una fortaleza enemiga: Atacar o Sitiar", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "fortaleza", 4)))).toEqual(["atacar", "apoyar", "sitiar", "defender"]);
  });

  it("un castillo ajeno solo se sitia", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "castillo", 4, { castleOf: 4 }), { canMarch: false }))).toEqual(["sitiar"]);
  });

  it("lejos (por camino o a la carga) solo se marcha", () => {
    expect(verbsFor(ctx(tile(2, 3, 1, "campos", 4)))).toEqual(["atacar"]);
  });

  it("las tropas de paso en una alianza en aviso solo pueden salir", () => {
    expect(verbsFor(ctx(tile(2, 2, 1, "campos", 3), { marchOnly: true }))).toEqual(["mover"]);
  });
});

describe("Orden de cada verbo y al revés", () => {
  it("Apoyar es el primer ataque y Defender, la defensa", () => {
    expect(orderOf("apoyar")).toEqual({ tipo: "apoyar", apoyaDesde: ANY_ORIGIN });
    expect(orderOf("defender")).toEqual({ tipo: "apoyar", apoyaDesde: null });
    expect(orderOf("entrar").tipo).toBe("mover");
  });

  it("una orden dada se abre con su verbo", () => {
    const o = (x: Partial<OrderView>) => ({ tipo: "mover", desde: 1, hacia: 2, apoyaDesde: null, tropas: 2, ...x }) as OrderView;
    expect(verbOf(o({}), tile(2, 2, 1, "campos", 4), 1, [2], [2])).toBe("atacar");
    expect(verbOf(o({}), tile(2, 2, 1, "campos", 2), 1, [2], [2])).toBe("entrar");
    expect(verbOf(o({ tipo: "apoyar" }), undefined, 1, [], [])).toBe("defender");
    expect(verbOf(o({ tipo: "apoyar", apoyaDesde: ANY_ORIGIN }), undefined, 1, [], [])).toBe("apoyar");
  });

  it("la mitad redondea hacia arriba", () => {
    expect([share(5, "mitad"), share(1, "mitad"), share(4, "todas"), share(4, "ninguna")]).toEqual([3, 1, 4, 0]);
  });
});
