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
// Más Madera que Piedra: la Piedra también se usa para fortificar (simulación del 16-10-2026).
export const UPGRADE_COST: Record<2 | 3 | 4 | 5, Partial<Resources>> = {
  2: { madera: 15, piedra: 10 },
  3: { madera: 30, piedra: 20 },
  4: { madera: 50, piedra: 30, hierro: 25 },
  5: { madera: 60, piedra: 35, hierro: 30, oro: 30 },
};

/**
 * Tipos de tropa (diseño v3, fase 3). La Mesnada es la tropa de siempre.
 * - Jinetes: rápidos y fuertes al cargar en llano, flojos en el bosque.
 * - Catapultas: no luchan, pero rompen fortificaciones y fortalezas.
 * Es un objeto para que el simulador pueda apagarlos (`enabled`) y comparar.
 */
export const UNITS = {
  enabled: true,
  jinetes: {
    cost: { hierro: 3, pan: 2, oro: 1 } as Partial<Resources>,
    /** Fuerza de cada jinete al atacar una casilla llana sin murallas. */
    charge: 2,
    /** Fuerza de cada jinete en el bosque (atacando, defendiendo o apoyando). */
    forest: 0.5,
  },
  catapultas: {
    cost: { madera: 4, hierro: 2 } as Partial<Resources>,
    /** Cada catapulta que ataca quita esto al bono de fortificación o de fortaleza del defensor. */
    breach: 0.25,
    /** Una catapulta come como dos tropas. */
    upkeep: 2,
  },
  /** Terreno llano: donde cargan los jinetes y por donde avanzan dos casillas. */
  plains: ["campos", "paramo"] as TileType[],
};

/** Coste de reclutar una tropa. */
// Antes 2 Hierro + 1 Pan: el Hierro era el único recurso escaso y el Pan sobraba.
// Con 1 Hierro + 2 Pan pasaba lo contrario; 2 + 2 deja los dos justos (simulación del 16-10-2026).
export const TROOP_COST: Partial<Resources> = { hierro: 2, pan: 2 };

/** Coste de fortificar una casilla. Lo que dura va en RHYTHM. */
export const FORTIFY_COST: Partial<Resources> = { piedra: 8 };

/**
 * Forma de las casillas (diseño v3, propuesta del nuevo sistema de guerra).
 * - "square": cuadrícula con 4 vecinas (el juego de ahora).
 * - "hex": hexágonos con el pico arriba y las filas impares desplazadas media
 *   casilla a la derecha ("odd-r"): 6 vecinas. Las casillas guardan su (x, y)
 *   de columna y fila igual que ahora.
 * Es un objeto para que el simulador pueda comparar las dos.
 */
export const GRID: { kind: "square" | "hex" } = { kind: "hex" };

/**
 * Ritmo de la campaña.
 * - `days`: días de la semana con resolución (0 = lunes, 2 = miércoles, 6 = domingo).
 *   La Gran Subasta sigue el miércoles y el mantenimiento el domingo.
 * - `fortify`: resoluciones que dura una fortificación.
 * Diseño v3: una resolución al día y fortificar 4 resoluciones. Las partidas
 * empezadas antes guardan su ritmo (games.resolution_days en el servidor).
 */
export const RHYTHM: { days: number[]; fortify: number } = { days: [0, 1, 2, 3, 4, 5, 6], fortify: 4 };

/**
 * Ejecuta `fn` (síncrona) con otro ritmo y deja RHYTHM como estaba. El
 * servidor lo usa para las partidas empezadas con dos resoluciones por semana.
 */
export function withRhythm<T>(rhythm: { days: number[]; fortify: number }, fn: () => T): T {
  const saved = { days: RHYTHM.days, fortify: RHYTHM.fortify };
  RHYTHM.days = rhythm.days;
  RHYTHM.fortify = rhythm.fortify;
  try {
    return fn();
  } finally {
    RHYTHM.days = saved.days;
    RHYTHM.fortify = saved.fortify;
  }
}

/** Producción diaria que añade una casilla controlada. */
export const TILE_PRODUCTION: Record<TileType, Partial<Resources>> = {
  castillo: {},
  campos: { pan: 2 },
  bosque: { madera: 2 },
  cantera: { piedra: 2 },
  montana: { hierro: 2 },
  puerto: { oro: 2 },
  fortaleza: {},
  paramo: {},
};

/** Guarnición neutral inicial según el tipo de casilla. */
export const NEUTRAL_GARRISON: Record<Exclude<TileType, "castillo">, number> = {
  campos: 4,
  bosque: 4,
  cantera: 6,
  montana: 6,
  puerto: 8,
  fortaleza: 8,
  paramo: 2,
};

/**
 * Terreno (diseño v3, fase 2). Es un objeto para que el simulador pueda
 * apagar cada parte y comparar.
 * - `defense`: bonificación de defensa por tipo de casilla (se suma a las demás; el tope x2 sigue).
 * - `quarryFortify`: fortificar en una cantera cuesta esto (la piedra está a mano).
 * - `roads`: por los caminos entre castillos y fortalezas se avanzan 2 casillas
 *   por noche si la de en medio es tuya.
 * - `sea`: de un puerto tuyo a cualquier otro puerto en una noche (sin apoyos).
 * - `ambush`: desde fuera no se ve cuántas tropas hay en el bosque de otra casa.
 * - `watchtower`: desde una montaña tuya ves a esta distancia.
 */
export const TERRAIN: {
  defense: Partial<Record<TileType, number>>;
  quarryFortify: Partial<Resources>;
  roads: boolean;
  sea: boolean;
  ambush: boolean;
  watchtower: number;
} = {
  defense: { bosque: 0.25, montana: 0.5, cantera: 0.25 },
  quarryFortify: { piedra: 4 },
  roads: true,
  sea: true,
  ambush: true,
  watchtower: 2,
};

/** Terreno del diseño v2 (sin efectos), para comparar en el simulador. */
export const TERRAIN_OFF = {
  defense: {},
  quarryFortify: { piedra: 8 },
  roads: false,
  sea: false,
  ambush: false,
  watchtower: 1,
} as const;

/** Bonificaciones de defensa (se suman; máximo total x2). */
export const DEFENSE_BONUS = {
  base: 0.25,
  fortified: 0.25,
  fortress: 0.5,
  absent: 0.25,
  max: 1,
} as const;

/** Mantenimiento semanal: 1 Pan por cada TROOPS_PER_PAN tropas. */
export const TROOPS_PER_PAN = 3;
/** A partir de esta casilla, cada casilla extra cuesta STRETCH_PAN Pan a la semana. */
export const STRETCH_FREE_TILES = 4;
export const STRETCH_PAN = 2;

/** Ayuda al último: recursos diarios del tipo elegido. */
export const LAST_PLACE_HELP = 3;

/** Prestigio en vivo. */
export const PRESTIGE = {
  perTile: 3,
  perFortress: 5,
  /** Un páramo no produce y da menos Prestigio que una casilla normal. */
  perWasteland: 1,
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
  paramo: 0,
};

/**
 * Tamaño del mapa y páramos (casillas que no producen) según el número de
 * casas. Los páramos se restan de las neutrales y el resto se reparte con
 * TILE_MIX.
 */
export const MAP_LAYOUT: Record<4 | 5 | 6 | 7 | 8, { cols: number; rows: number; paramos: number }> = {
  4: { cols: 5, rows: 4, paramos: 1 },
  5: { cols: 6, rows: 4, paramos: 1 },
  6: { cols: 6, rows: 5, paramos: 2 },
  // Con 7 y 8 casas el mapa crece para que los castillos queden a 3 pasos como
  // con menos casas; los páramos compensan las casillas de más (simulaciones.md).
  7: { cols: 7, rows: 6, paramos: 5 },
  8: { cols: 7, rows: 7, paramos: 7 },
};

/**
 * Tamaños con hexágonos (GRID.kind = "hex"). Con 6 vecinas los castillos
 * quedan más cerca, así que hace falta en torno a un 50% más de casillas para
 * mantenerlos a 3 pasos. Elegidos con `HEX=1 npm run simular-mapa` (simulaciones.md).
 */
export const MAP_LAYOUT_HEX: Record<4 | 5 | 6 | 7 | 8, { cols: number; rows: number; paramos: number }> = {
  4: { cols: 6, rows: 5, paramos: 2 },
  5: { cols: 7, rows: 6, paramos: 5 },
  6: { cols: 8, rows: 6, paramos: 6 },
  7: { cols: 9, rows: 7, paramos: 10 },
  8: { cols: 10, rows: 8, paramos: 14 },
};

/** Tamaño y páramos del mapa según la forma de las casillas. */
export function mapLayout(houses: 4 | 5 | 6 | 7 | 8): { cols: number; rows: number; paramos: number } {
  return (GRID.kind === "hex" ? MAP_LAYOUT_HEX : MAP_LAYOUT)[houses];
}

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

/** Umbrales de los objetivos secretos (ver objectives.ts). */
export const OBJECTIVE_TARGETS = {
  gold: 150,
  troops: 40,
  tiles: 5,
  tilesTakenFromHouses: 3,
  tradePartners: 3,
  validTrades: 10,
  /** Niveles sumando los cinco edificios (se empieza con 7). */
  totalLevels: 17,
  auctionsWon: 3,
} as const;

/**
 * Gran Subasta (diseño, sección 9): tres lotes anunciados el martes; pujas
 * ciegas en Oro hasta el cierre del miércoles. El Oro de las pujas sale del juego.
 */
export const AUCTION = {
  lots: 3,
  /** Lote de un recurso, o de dos recursos. */
  singleResource: 30,
  doubleResource: 20,
  /** Probabilidad de que el tercer lote sea una carta (el primero es de recursos y el segundo, carta). */
  thirdIsCard: 0.5,
} as const;

/** Efectos de las cartas de la Corona (ver cards.ts). */
export const CARD_VALUES = {
  mercenaries: 5,
  cart: 20,
  tithePerTile: 3,
  drumsBonus: 0.25,
} as const;

/** Valores de los eventos de la semana (ver events.ts). */
export const EVENT_VALUES = {
  plague: 0.75,
  harvest: 1.25,
  goldFever: 2,
  feast: 2,
  mud: 0.25,
  fervor: 0.25,
  bandits: 6,
  tributeShare: 0.2,
  keysGold: 15,
  tournamentGold: 20,
  levies: 3,
  carnivalPan: 10,
  almsEach: 10,
  lateWages: 2,
} as const;
