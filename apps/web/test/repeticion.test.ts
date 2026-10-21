// Repetición de la noche: el cruce por el camino (bloque 4) se dibuja en la casilla de en medio.
import { describe, expect, it } from "vitest";
import { resolveCampaign, type Tile } from "@reyes/engine";
import type { EventView, HouseInfo, TileView } from "../src/api";
import { replaySteps } from "../src/components/NightReplay";
import { describeEvent } from "../src/ui";

const tiles: Tile[] = [
  { id: 1, x: 0, y: 0, type: "campos", owner: 1, troops: 3 },
  { id: 2, x: 1, y: 0, type: "campos", owner: 2, troops: 0 },
  { id: 3, x: 2, y: 0, type: "campos", owner: 2, troops: 4, jinetes: 4 },
];
const names = ["Molino", "Prado Pisoteado", "Trigal"];
const view: TileView[] = tiles.map((t, i) => ({ ...t, nombre: names[i], visible: true }) as TileView);
const houses = [
  { id: 1, nombre: "Casa del Nabo", color: "#a33", lema: null },
  { id: 2, nombre: "Casa del Puerro", color: "#3a3", lema: null },
] as HouseInfo[];

describe("Repetición de un cruce por el camino", () => {
  const r = resolveCampaign({
    resolution: 1,
    tiles,
    orders: [
      { kind: "move", house: 1, from: 1, to: 2, troops: 3 },
      { kind: "move", house: 2, from: 3, to: 1, troops: 4, jinetes: 4 },
    ],
  });
  const events: EventView[] = r.events.map((e, i) => ({ id: i, tipo: e.type, resolucion: 1, datos: e as never }));

  it("los dos grupos marchan hasta la casilla de en medio y chocan allí", () => {
    const { steps } = replaySteps(events, view);
    const choque = steps.find((s) => s.kind === "choque");
    expect(choque).toMatchObject({ via: 2 });
    const marcha = steps.find((s) => s.kind === "marcha");
    expect(marcha && "tokens" in marcha ? marcha.tokens.filter((t) => t.to === 2 && !t.half) : []).toHaveLength(2);
  });

  it("el texto dice que chocan por el camino", () => {
    const e = events.find((x) => x.tipo === "choque_frontal")!;
    expect(describeEvent(e, houses, view)).toBe(
      "Casa del Nabo y Casa del Puerro chocan por el camino en Prado Pisoteado: gana Casa del Puerro y sigue su marcha.",
    );
  });
});
