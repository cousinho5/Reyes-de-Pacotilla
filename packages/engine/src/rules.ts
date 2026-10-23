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
// Bloque 5: Oro en todos los niveles (sobraba) y un 15% más de Madera y Piedra (también sobraban).
export const UPGRADE_COST: Record<2 | 3 | 4 | 5, Partial<Resources>> = {
  2: { madera: 17, piedra: 12, oro: 5 },
  3: { madera: 35, piedra: 23, oro: 10 },
  4: { madera: 58, piedra: 35, hierro: 25, oro: 20 },
  5: { madera: 69, piedra: 40, hierro: 30, oro: 30 },
};

/**
 * Bloque 2: etapas del castillo, solo de adorno. La etapa sale de la suma de los
 * niveles de los cinco edificios: se empieza con 7 y el máximo es 25, pero con
 * bots se acaba con 15 de mediana en 6 semanas (13 en 4), así que las etapas
 * altas piden menos de lo que daría repartir 7-25 a partes iguales.
 * Etapa 1 con 7-8, 2 con 9-10, 3 con 11-13, 4 con 14-16 y 5 con 17 o más.
 */
export const CASTLE_STAGES = { from: [9, 11, 14, 17] as readonly number[] };

/**
 * Tipos de tropa (diseño v3, fase 3). La Mesnada es la tropa de siempre.
 * - Jinetes: rápidos y fuertes al cargar en llano, flojos en el bosque.
 * - Catapultas: no luchan, pero rompen fortificaciones y fortalezas.
 * Es un objeto para que el simulador pueda apagarlos (`enabled`) y comparar.
 */
export const UNITS = {
  enabled: true,
  jinetes: {
    // Bloque 4: 3 de Oro (antes 1). El Oro sobraba y el jinete costaba en la práctica 1 Hierro más que la Mesnada.
    cost: { hierro: 3, pan: 2, oro: 3 } as Partial<Resources>,
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
  plains: ["campos", "paramo", "prado", "ruinas"] as TileType[],
};

/**
 * Asedios (diseño v3, fase 3).
 * - `wallsPerNight`: cada noche de asedio quita esto al bono de fortificación o de fortaleza.
 * - `minTroops`: tropas mínimas de cada grupo que sitia.
 * - `castleSides`: casillas propias desde las que hay que rodear un castillo.
 * - `castleProduction`: lo que producen los edificios de un castillo rodeado.
 * - `prestigePerNight`, `prestigeMax`: Prestigio por noche de asedio a un castillo, con tope.
 */
export const SIEGE = {
  enabled: true,
  wallsPerNight: 0.25,
  minTroops: 3,
  castleSides: 2,
  castleProduction: 0.5,
  /** Se pueden sitiar también las casillas fortificadas. No: solo fortalezas y castillos (la simulación del 18-10-2026 mostró que si no, fortificar dejaba de servir). */
  fortifiedTargets: false,
  /** Una casilla sitiada (que no sea un castillo) deja de producir. */
  stopsProduction: true,
  prestigePerNight: 1,
  prestigeMax: 10,
};

/**
 * Capitán y Gloria (diseño v3, fase 4).
 * - El Capitán suma `strength` a la fuerza del grupo con el que va (antes de bonificaciones).
 *   Si su grupo pierde contra otra casa, cae preso; se escapa a las `escapeAfter`
 *   resoluciones (o antes, si quien lo tiene lo suelta, por ejemplo tras un rescate).
 * - Gloria: cada batalla ganada contra otra casa (atacando o defendiendo) da
 *   `perVictory` de Prestigio; perder defendiendo contra el doble de fuerza o más
 *   da `honor` ("cayó con honor"). Con tope `max`.
 */
export const CAPTAIN = {
  enabled: true,
  strength: 2,
  escapeAfter: 7,
};
/**
 * Rescate del Capitán (bloque 4). Quien lo tiene preso pide un precio en Oro,
 * sin límite, y la otra casa paga o no. Esto es solo cómo lo hacen los bots:
 * piden `botAsk` (menos cuanto más cerca está la fuga, nunca menos de `botMin`)
 * y pagan si el precio no pasa de `botPayShare` de su Oro y faltan al menos
 * `botPayMinNights` noches para la fuga.
 */
export const RANSOM = {
  botAsk: 30,
  botMin: 5,
  botPayShare: 0.4,
  botPayMinNights: 2,
};
/**
 * Órdenes en cola (diseño v3, fase 5): se pueden dejar órdenes para `nights`
 * resoluciones seguidas (esta noche y las siguientes). Al llegar su noche, cada
 * orden se ajusta a las tropas que queden en su casilla.
 */
export const QUEUE = {
  nights: 3,
};

/** Bloque 12: el aviso de cierre sale esta cantidad de minutos antes, solo a quien no ha dado órdenes. */
export const CLOSE_WARNING_MINUTES = 60;

/**
 * Retoques del sistema de batalla (hoja de ruta, bloque 4, `docs/bloque4.md`).
 * Se encienden uno a uno, cada uno con su simulación. El simulador puede
 * cambiarlos para comparar (`npm run simular -- --cruces no`, `--apoyo-libre no`,
 * `--fortificar-hasta-ataque no`, `--capitan-modo ataques`).
 * - `supportAnyOrigin` (encendido): un apoyo al ataque con origen `ANY_ORIGIN`
 *   suma al primer ataque que llegue a esa casilla esa noche: el de la casa que
 *   apoya si ataca ella; si no, el de la orden que se dio antes (`MoveOrder.at`).
 * - `crossingClash` (encendido): también chocan de frente dos grupos que se
 *   cruzan por el camino (una marcha de dos casillas que recorre al revés la de otra casa).
 * - `captainAlone` (encendido): el Capitán se mueve solo, sin tropas, a una
 *   casilla propia. Si atacan la casilla donde está solo, cae preso. Rescate: RANSOM.
 * - `fortifyUntilAttacked` (encendido): la fortificación dura hasta que atacan
 *   la casilla (`FORTIFY_FOREVER`); el primer ataque se la quita aunque fracase.
 *   Cada domingo se paga `FORTIFY_UPKEEP` por casilla fortificada.
 */
export const BATTLE_TWEAKS = {
  supportAnyOrigin: true,
  crossingClash: true,
  fortifyUntilAttacked: true,
  /** El Capitán puede moverse solo (orden de mover con 0 tropas) entre casillas propias. */
  captainAlone: true,
};
/** Origen de un apoyo al ataque que vale para el primer ataque a la casilla (con `supportAnyOrigin`). */
export const ANY_ORIGIN = -1;

/**
 * Alianzas (bloque 8, `docs/alianzas.md`, `alliances.ts`). Cada alianza es
 * entre dos casas: paso libre por las casillas del aliado (nunca su castillo),
 * tropas de paso que defienden, visión compartida, no agresión y ataque
 * conjunto. Romperla es gratis, pero deja `noticeResolutions` resoluciones de
 * aviso (la de esa noche cuenta como la primera) y quien rompe espera
 * `cooldownDays` días para firmar otra.
 */
export const ALLIANCE = {
  enabled: true,
  /** Resoluciones de aviso entre romper y que la alianza deje de existir. */
  noticeResolutions: 3,
  /** Días sin poder firmar otra alianza tras romper una. */
  cooldownDays: 7,
  /** Resoluciones que dura una propuesta sin contestar. */
  proposalResolutions: 3,
  /** Tropas de un aliado dentro de tus casillas a partir de las que avisa Fray Abundio. */
  warnTroops: 10,
  /** Máximo de alianzas por casa (null = sin límite). */
  maxPerHouse: null as number | null,
};

/**
 * Cómo usan las alianzas los bots con personalidad (bloque 8, `ai/alliances.ts`).
 * - Proponen a una casa vecina que no sea el líder si sus ganas
 *   (`trade` + `leaderHatred` − `houseBias`, con estos pesos) pasan de `proposeAbove`.
 * - Aceptan si quien propone no es el líder y no les ha atacado en `grudgeDays` días.
 * - Rompen si el aliado pasa a ser el líder (con manía al líder desde `leaderBreak`),
 *   si dejan de compartir frontera, si tiene dentro más de `warnTroops` x `guestsBreak`
 *   tropas, o, las traicioneras (`houseBias` desde `betrayBias`), si el aliado les adelanta.
 */
export const ALLIANCE_BOTS = {
  weights: { trade: 0.5, leaderHatred: 0.5, houseBias: 0.4 },
  proposeAbove: 0.2,
  maxAlliances: 2,
  grudgeDays: 7,
  leaderBreak: 0.5,
  guestsBreak: 1.5,
  betrayBias: 1.1,
};

export const GLORY = {
  enabled: true,
  perVictory: 1,
  honor: 1,
  max: 8,
};

/** Coste de reclutar una tropa. */
// Antes 2 Hierro + 1 Pan: el Hierro era el único recurso escaso y el Pan sobraba.
// Con 1 Hierro + 2 Pan pasaba lo contrario; 2 + 2 deja los dos justos (simulación del 16-10-2026).
export const TROOP_COST: Partial<Resources> = { hierro: 2, pan: 2 };

/**
 * Coste de fortificar una casilla. Dura hasta que la atacan
 * (`BATTLE_TWEAKS.fortifyUntilAttacked`); sin ese retoque, lo que dice RHYTHM.
 */
export const FORTIFY_COST: Partial<Resources> = { piedra: 8 };
/**
 * Mantenimiento de cada casilla fortificada, el domingo (bloque 4). Si no
 * llega, se desmantelan las que no se pueden pagar. Vacío = sin mantenimiento.
 * 2 de Piedra tras simular de 1 a 4 de Piedra y 2 o 4 de Oro (docs/simulaciones.md).
 */
export const FORTIFY_UPKEEP: Partial<Resources> = { piedra: 2 };
/** `fortifiedUntil` de una fortificación que dura hasta que la atacan. */
export const FORTIFY_FOREVER = 1_000_000;

/**
 * Bloque 5 de la hoja de ruta (recursos). El simulador puede apagarlos para comparar.
 * - `crown`: cambio con la Corona a precio dinámico (CROWN, `crown.ts`). Encendido.
 * - `mercenaries`: "alquiler" (se pagan al contratarlos y se van solos; encendido) o
 *   "soldada" (cobran cada domingo y desertan si no se les paga; solo en el simulador). Ver MERCENARIES.
 */
export const ECONOMY_TWEAKS: { crown: boolean; mercenaries: null | "alquiler" | "soldada" } = {
  crown: true,
  mercenaries: "alquiler",
};

/**
 * Cambio con la Corona (bloque 5). La Corona solo vende, sin tope. Precio en Oro
 * de 1 unidad: `base` × escasez × demanda × `markup`, donde
 * escasez = ((media de los cuatro recursos en el reino + 10) / (ese recurso + 10)) ^ `scarcity`
 * y demanda = 1 + `demandStep` × unidades compradas a la Corona en los últimos 7
 * días (entre todas las casas, contando las de la misma compra). Antes del
 * `markup`, entre `min` y `max`.
 */
export const CROWN = {
  /** Precio (en Oro) de una unidad cuando el recurso abunda como la media. */
  base: 2,
  /** Con qué se compara la escasez: con el Oro del reino o con la media de los otros cuatro recursos. */
  reference: "media" as "oro" | "media",
  scarcity: 0.5,
  demandStep: 0.01,
  /** Lo que la Corona carga sobre el precio (un 30%). */
  markup: 1.3,
  min: 0.25,
  max: 10,
  /** Días que cuentan para la demanda. */
  demandDays: 7,
};

/** Mercenarios de alquiler (bloque 5, `mercenaries.ts`). No comen Pan: lo pone la Corona. */
export const MERCENARIES = {
  /** Alquiler: Oro por tropa y días que se quedan. */
  hire: 6,
  days: 7,
  /** Soldada (solo el simulador): Oro por tropa al contratarla y cada domingo. */
  signOn: 4,
  wage: 2,
  /** Tropas que una casa puede contratar por semana: sin tope (22 de octubre); el simulador puede ponerlo. */
  weeklyCap: Infinity,
};

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
  prado: {},
  lago: {},
  aldea: {},
  ruinas: {},
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
  prado: 2,
  /** En un lago no se puede entrar. */
  lago: 0,
  aldea: 4,
  ruinas: 2,
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
  perTile: 2,
  perFortress: 5,
  /** Un páramo no produce y da menos Prestigio que una casilla normal. */
  perWasteland: 1,
  /** La Aldea (bloque 1) vale por su posición: no produce y da 1. */
  perVillage: 1,
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
  prado: 0,
  lago: 0,
  aldea: 0,
  ruinas: 0,
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
  /** Bloque 5: de 150 a 60, porque las mejoras, la Corona y los mercenarios gastan Oro. */
  gold: 60,
  troops: 40,
  tiles: 5,
  tilesTakenFromHouses: 3,
  tradePartners: 3,
  validTrades: 10,
  /** Bloque 5: de 17 a 16, porque las mejoras piden más. Niveles sumando los cinco edificios (se empieza con 7). */
  totalLevels: 16,
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

/**
 * Generación con geografía (bloque 1, fase 1). Es un objeto para que el
 * simulador pueda apagarla (`geography: false`, el generador de antes) y comparar.
 * - `mix`: proporción de cada tipo entre las neutrales que no son páramo ni Prado.
 *   Como antes: con los campos al 15% y un 5% de Prado subían las deserciones
 *   del 15% al 19% (simulaciones.md).
 * - `pradoShare`: parte de los páramos del tamaño de mapa que se convierten en Prado.
 * - `noiseScale`: tamaño, en casillas, de las manchas de altura y humedad.
 */
export const MAP_GEN = {
  geography: true,
  mix: {
    campos: 0.2,
    bosque: 0.2,
    cantera: 0.2,
    montana: 0.2,
    puerto: 0.1,
    fortaleza: 0.1,
    paramo: 0,
    prado: 0,
    lago: 0,
    aldea: 0,
    ruinas: 0,
  } as Record<Exclude<TileType, "castillo">, number>,
  pradoShare: 0.5,
  noiseScale: 3.5,
  /** Mapas que se prueban; gana el más justo. */
  attempts: 600,
  /** Ajuste de salida (cambiar casillas para que nadie se quede sin un recurso básico cerca). */
  balance: true,
  /** Peso de lo agrupado del terreno al elegir entre los mapas probados (frente a la justicia). */
  clusterWeight: 20,
};

/**
 * Ríos, puentes y lagos (bloque 1, fase 2). Es un objeto para que el
 * simulador pueda apagarlos (`enabled: false`: ni ríos ni lagos) y comparar.
 * - `defense`: atacar cruzando un río suma esto a la defensa (el tope x2 sigue).
 *   Donde un camino cruza el río hay un puente y no cuenta.
 * - `rivers`, `lakes`: cuántos hay según el número de casas. Los lagos ocupan
 *   el sitio de un páramo y no se puede entrar en ellos.
 */
export const RIVERS = {
  enabled: true,
  defense: 0.25,
  rivers: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 2 } as Record<number, number>,
  lakes: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 2 } as Record<number, number>,
};

/**
 * Aldeas y Ruinas (bloque 1, fase 3). Es un objeto para que el simulador pueda
 * apagarlas y comparar.
 * - `villages`: una Aldea por casa, a `villageSteps` pasos de su castillo (los
 *   castillos están a 3 pasos unos de otros, así que más lejos no caben) y
 *   nunca junto a un castillo. Se puede reclutar en ella; no produce.
 * - `ruinsCount`: Ruinas según el número de casas (una por cada dos, sin contar
 *   dos: con más, el mapa de 4 casas perdía la mitad de lo agrupado y la
 *   justicia), en la tierra de en medio, a `ruinsMinSteps` pasos o más de
 *   cualquier castillo (nunca a su lado). La primera casa que entra se lleva el
 *   premio y quedan como Prado.
 * - `prize`: recursos del premio (de un solo tipo); `cardChance`: probabilidad
 *   de que el premio sea una carta de la Corona en vez de recursos.
 */
export const FEATURES = {
  villages: true,
  villageSteps: 2,
  ruins: true,
  ruinsCount: { 4: 1, 5: 1, 6: 2, 7: 2, 8: 3 } as Record<number, number>,
  ruinsMinSteps: 2,
  prize: 10,
  cardChance: 0.5,
};
