// Valores de partida del diseño v2. Todos son ajustables: el script de
// simulación y la partida piloto dirán si hay que tocarlos.

import type { BuildingKind, Resources, TileType } from "./types";

/** Producción diaria de un edificio según su nivel (1-5). */
export const BUILDING_PRODUCTION = [0, 2, 4, 6, 8, 10] as const;

/** Qué produce cada edificio. */
export const BUILDING_RESOURCE: Record<BuildingKind, keyof Resources> = {
  granja: "pan",
  aserradero: "madera",
  cantera: "piedra",
  mina: "hierro",
  mercado: "oro",
};

/** Coste de subir AL nivel indicado (índice = nivel destino). */
export const UPGRADE_COST: Record<2 | 3 | 4 | 5, Partial<Resources>> = {
  2: { madera: 12, piedra: 12 },
  3: { madera: 25, piedra: 25 },
  4: { madera: 40, piedra: 40, hierro: 25 },
  5: { madera: 60, piedra: 60, hierro: 40, oro: 40 },
};

/** Coste de reclutar una tropa. */
export const TROOP_COST: Partial<Resources> = { hierro: 2, pan: 1 };

/** Coste de fortificar una casilla y cuántas resoluciones dura. */
export const FORTIFY_COST: Partial<Resources> = { piedra: 10 };
export const FORTIFY_RESOLUTIONS = 2;

/** Producción diaria que añade una casilla controlada. */
export const TILE_PRODUCTION: Record<TileType, Partial<Resources>> = {
  castillo: {},
  campos: { pan: 2 },
  bosque: { madera: 2 },
  cantera: { piedra: 2 },
  montana: { hierro: 2 },
  puerto: { oro: 2 },
  fortaleza: {},
};

/** Guarnición neutral inicial según el tipo de casilla. */
export const NEUTRAL_GARRISON: Record<Exclude<TileType, "castillo">, number> = {
  campos: 4,
  bosque: 4,
  cantera: 6,
  montana: 6,
  puerto: 8,
  fortaleza: 10,
};

/** Bonificaciones de defensa (se suman; máximo total x2). */
export const DEFENSE_BONUS = {
  base: 0.25,
  fortified: 0.25,
  fortress: 0.5,
  absent: 0.25,
  max: 1,
} as const;

/** Mantenimiento semanal: 1 Pan por cada TROOPS_PER_PAN tropas. */
export const TROOPS_PER_PAN = 4;
/** A partir de esta casilla, cada casilla extra cuesta STRETCH_PAN Pan a la semana. */
export const STRETCH_FREE_TILES = 4;
export const STRETCH_PAN = 2;

/** Ayuda al último: recursos diarios del tipo elegido. */
export const LAST_PLACE_HELP = 3;

/** Prestigio en vivo. */
export const PRESTIGE = {
  perTile: 3,
  perFortress: 5,
  perLevelAboveOne: 1,
  perLevelFiveBuilding: 1,
  goldPerPoint: 25,
  goldMax: 10,
  perTradePartner: 2,
  tradeMax: 6,
  tradeMinPerSide: 10,
  tradeWindowDays: 7,
  achievement: { primera_fortaleza: 3, obra_maestra: 3, ganador_subasta: 2 },
  auctionAchievementMax: 3,
  secretObjective: 6,
} as const;

/** Soborno al cronista. */
export const BRIBE_COST = 10;

/** Inicio de partida: tropas en el castillo y recursos de cada tipo. */
export const STARTING_TROOPS = 6;
export const STARTING_RESOURCES = 10;

/**
 * Especialidades iniciales (dos edificios a nivel 2). Se reparten en este orden
 * para que cada edificio sea especialidad del mismo número de casas y todas
 * dependan del comercio.
 */
export const SPECIALTY_PAIRS: [BuildingKind, BuildingKind][] = [
  ["granja", "aserradero"],
  ["cantera", "mina"],
  ["mercado", "granja"],
  ["aserradero", "cantera"],
  ["mina", "mercado"],
];

/** Proporción de cada tipo entre las casillas neutrales del mapa. */
export const TILE_MIX: Record<Exclude<TileType, "castillo">, number> = {
  campos: 0.2,
  bosque: 0.2,
  cantera: 0.2,
  montana: 0.2,
  puerto: 0.1,
  fortaleza: 0.1,
};

/** Días sin entrar a partir de los que se activa el piloto automático. */
export const ABSENT_AFTER_DAYS = 3;

/**
 * Bots de las partidas de prueba. No existen en las partidas reales: solo
 * sirven para probar el juego sin reunir a 4 personas.
 */
export const BOT = {
  /** Atacan una casilla neutral si su fuerza supera la defensa por este factor. */
  marginNeutral: 1.2,
  /** Contra otra casa son más prudentes (puede recibir apoyos). */
  marginHouse: 1.5,
  /** Tropas que nunca salen del castillo. */
  castleGarrison: 2,
  /** Aceptan un trato si lo que reciben vale al menos esto por lo que dan. */
  tradeRatio: 1,
} as const;
