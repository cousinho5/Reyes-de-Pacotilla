// Cartas de la Corona (diseño, sección 9): se ganan en la Gran Subasta y se
// usan una sola vez. Algunas actúan al momento y otras en la próxima resolución.
// Este módulo valida el uso y describe el efecto; el servidor lo aplica.

import { checkFortify } from "./actions";
import { upgradeCost } from "./economy";
import { CARD_VALUES } from "./rules";
import { BUILDINGS, RESOURCES, type BuildingKind, type HouseId, type Resource, type Resources, type Tile, type TileId } from "./types";

export const CARDS = {
  espia: {
    nombre: "Espía",
    texto: "Ves todas las casillas y tropas de una casa hasta la próxima resolución.",
    target: "casa",
  },
  muralla: {
    nombre: "Muralla",
    texto: "Fortifica gratis una casilla tuya hasta que la ataquen. El mantenimiento del domingo sí se paga.",
    target: "casilla_propia",
  },
  mercenarios: {
    nombre: "Mercenarios",
    texto: `${CARD_VALUES.mercenaries} tropas aparecen en tu castillo.`,
    target: null,
  },
  carreta: {
    nombre: "Carreta",
    texto: `Cambia ${CARD_VALUES.cart} de un recurso por ${CARD_VALUES.cart} de otro.`,
    target: "recursos",
  },
  maestro_obras: {
    nombre: "Maestro de obras",
    texto: "Sube gratis un nivel un edificio que esté en nivel 1, 2 o 3.",
    target: "edificio",
  },
  diezmo: {
    nombre: "Diezmo",
    texto: `Cobras ${CARD_VALUES.tithePerTile} de Oro por cada casilla que controles (sin contar el castillo).`,
    target: null,
  },
  tregua: {
    nombre: "Tregua",
    texto: "En la próxima resolución nadie puede atacar una casilla tuya: los ataques se repliegan.",
    target: "casilla_propia",
  },
  tambores: {
    nombre: "Tambores de guerra",
    texto: `En la próxima resolución tus ataques tienen +${CARD_VALUES.drumsBonus * 100}% de fuerza.`,
    target: null,
  },
} as const;

export type CardKey = keyof typeof CARDS;
export const CARD_KEYS = Object.keys(CARDS) as CardKey[];

export interface CardParams {
  casa?: HouseId;
  casilla?: TileId;
  edificio?: BuildingKind;
  da?: Resource;
  recibe?: Resource;
}

export interface CardContext {
  house: HouseId;
  tiles: Tile[];
  buildings: Record<BuildingKind, number>;
  resources: Resources;
  houses: HouseId[];
  /** Próxima resolución que se va a ejecutar. */
  nextResolution: number;
}

/** Lo que cambia al usar una carta. El servidor lo aplica en un lote atómico. */
export interface CardEffect {
  resources?: Partial<Resources>;
  /** Tropas que se suman al castillo. */
  castleTroops?: number;
  fortify?: { tile: TileId; until: number };
  upgrade?: BuildingKind;
  /** Ver una casa hasta la resolución indicada (incluida). */
  spy?: { house: HouseId; until: number };
  /** Casilla protegida en esa resolución. */
  truce?: { tile: TileId; resolution: number };
  /** Bonificación de ataque en esa resolución. */
  drums?: { resolution: number; bonus: number };
}

export type CardCheck = { ok: true; effect: CardEffect } | { ok: false; error: string };

export function checkCard(key: CardKey, params: CardParams, ctx: CardContext): CardCheck {
  const own = (id: TileId | undefined) => ctx.tiles.find((t) => t.id === id && t.owner === ctx.house);
  switch (key) {
    case "espia": {
      if (params.casa == null || params.casa === ctx.house || !ctx.houses.includes(params.casa)) {
        return { ok: false, error: "Elige otra casa a la que espiar." };
      }
      return { ok: true, effect: { spy: { house: params.casa, until: ctx.nextResolution } } };
    }
    case "muralla": {
      const tile = own(params.casilla);
      if (!tile) return { ok: false, error: "Elige una casilla tuya." };
      // Igual que fortificar, pero sin pagar.
      const rich = Object.fromEntries(RESOURCES.map((r) => [r, Number.MAX_SAFE_INTEGER])) as Resources;
      const check = checkFortify(tile, ctx.house, ctx.nextResolution, rich);
      if (!check.ok) return check;
      return { ok: true, effect: { fortify: { tile: tile.id, until: check.value.fortifiedUntil } } };
    }
    case "mercenarios":
      return { ok: true, effect: { castleTroops: CARD_VALUES.mercenaries } };
    case "carreta": {
      const { da, recibe } = params;
      if (!da || !recibe || !RESOURCES.includes(da) || !RESOURCES.includes(recibe) || da === recibe) {
        return { ok: false, error: "Elige qué recurso das y cuál recibes." };
      }
      if (ctx.resources[da] < CARD_VALUES.cart) return { ok: false, error: `Hacen falta ${CARD_VALUES.cart} del recurso que das.` };
      return { ok: true, effect: { resources: { [da]: -CARD_VALUES.cart, [recibe]: CARD_VALUES.cart } } };
    }
    case "maestro_obras": {
      const b = params.edificio;
      if (!b || !BUILDINGS.includes(b)) return { ok: false, error: "Elige un edificio." };
      if (ctx.buildings[b] > 3 || !upgradeCost(ctx.buildings[b])) {
        return { ok: false, error: "El maestro de obras solo sube edificios de nivel 1, 2 o 3." };
      }
      return { ok: true, effect: { upgrade: b } };
    }
    case "diezmo": {
      const n = ctx.tiles.filter((t) => t.owner === ctx.house && t.type !== "castillo").length;
      return { ok: true, effect: { resources: { oro: n * CARD_VALUES.tithePerTile } } };
    }
    case "tregua": {
      const tile = own(params.casilla);
      if (!tile || tile.type === "castillo") return { ok: false, error: "Elige una casilla tuya (los castillos ya son inexpugnables)." };
      return { ok: true, effect: { truce: { tile: tile.id, resolution: ctx.nextResolution } } };
    }
    case "tambores":
      return { ok: true, effect: { drums: { resolution: ctx.nextResolution, bonus: CARD_VALUES.drumsBonus } } };
  }
}
