// Tipos del estado de juego. El motor solo trabaja con estos datos planos:
// el servidor los carga de la base de datos y el cliente los recibe filtrados
// por la niebla de guerra.

export type HouseId = number;
export type TileId = number;

export const RESOURCES = ["pan", "madera", "piedra", "hierro", "oro"] as const;
export type Resource = (typeof RESOURCES)[number];
export type Resources = Record<Resource, number>;

export const BUILDINGS = ["granja", "aserradero", "cantera", "mina", "mercado"] as const;
export type BuildingKind = (typeof BUILDINGS)[number];

export type TileType =
  | "castillo"
  | "campos"
  | "bosque"
  | "cantera"
  | "montana"
  | "puerto"
  | "fortaleza"
  | "paramo"
  | "prado"
  | "lago"
  | "aldea"
  | "ruinas";

export interface Tile {
  id: TileId;
  x: number;
  y: number;
  type: TileType;
  /** Casa dueña; null = neutral. */
  owner: HouseId | null;
  /** Tropas del dueño, o guarnición neutral si no tiene dueño. */
  troops: number;
  /**
   * Cuántas de esas tropas son Jinetes y cuántas Catapultas (diseño v3); el
   * resto es Mesnada. Si faltan, todo es Mesnada.
   */
  jinetes?: number;
  catapultas?: number;
  /** Número de resolución hasta la que dura la fortificación (incluida). */
  fortifiedUntil?: number | null;
  /** Solo en castillos: la casa a la que pertenece. Nunca cambia. */
  castleOf?: HouseId | null;
  /** Asedio (diseño v3): casa que tiene sitiada la casilla y noches que lleva. */
  besiegedBy?: HouseId | null;
  siegeNights?: number;
  /**
   * Ríos (bloque 1): un bit por cada lado de la casilla por el que pasa un río,
   * en el orden de `neighbourCoords`. Los lados hacia fuera del mapa también
   * cuentan (para dibujar dónde desemboca).
   */
  river?: number;
  /**
   * Tropas de paso (bloque 8): grupos de casas aliadas del dueño que están en
   * la casilla. Siguen siendo de su casa: no producen ni dan Prestigio, comen
   * Pan de su casa y suman a la defensa si atacan la casilla.
   */
  guests?: Guest[];
}

/** Tropas de paso de una casa aliada en una casilla (bloque 8). */
export interface Guest {
  house: HouseId;
  troops: number;
  jinetes?: number;
  catapultas?: number;
}

/**
 * Alianza entre dos casas (bloque 8). `status`: "active" mientras dura;
 * "breaking" durante el aviso tras romperla, hasta la resolución `endsAt`
 * (incluida): al terminar esa resolución deja de existir y las tropas de paso
 * vuelven a casa. `since`: resolución en la que empezó (la más antigua manda
 * cuando una casa podría atacar a la vez con dos aliados que no lo son entre sí).
 */
export interface Alliance {
  a: HouseId;
  b: HouseId;
  status: "active" | "breaking";
  endsAt: number | null;
  since: number;
}

export interface MoveOrder {
  kind: "move";
  house: HouseId;
  from: TileId;
  to: TileId;
  troops: number;
  /** De esas tropas, cuántas son Jinetes y cuántas Catapultas (el resto, Mesnada). */
  jinetes?: number;
  catapultas?: number;
  /** El Capitán de la casa va con este grupo (solo si está en la casilla de origen). */
  captain?: boolean;
  /** Las tropas salen de las tropas de paso de la casa en `from`, una casilla aliada (bloque 8). */
  guest?: boolean;
  /**
   * Cuándo se dio la orden o se cambió por última vez (milisegundos). Decide cuál
   * es «el primer ataque» que recibe un apoyo sin origen (bloque 4). Sin él,
   * cuenta el orden de la lista.
   */
  at?: number;
}

export interface SupportOrder {
  kind: "support";
  house: HouseId;
  from: TileId;
  /** Casilla que se apoya (la atacada o la defendida). */
  target: TileId;
  /**
   * Origen del ataque apoyado; null = se apoya la defensa de `target`;
   * ANY_ORIGIN = el primer ataque que llegue a `target` esa noche (bloque 4).
   */
  supportedFrom: TileId | null;
  troops: number;
  jinetes?: number;
  catapultas?: number;
  /** Apoya desde las tropas de paso de la casa en `from` (bloque 8). */
  guest?: boolean;
}

/**
 * Sitiar (diseño v3): el grupo se queda en su casilla, rodeando la vecina. Cada
 * noche de asedio la casilla sitiada pierde murallas y deja de producir; un
 * castillo rodeado desde dos casillas produce la mitad y da Prestigio a quien
 * lo sitia. Las tropas que sitian siguen defendiendo su casilla.
 */
export interface SiegeOrder {
  kind: "siege";
  house: HouseId;
  from: TileId;
  target: TileId;
  troops: number;
  jinetes?: number;
  catapultas?: number;
  /** Sitia desde las tropas de paso de la casa en `from` (bloque 8). */
  guest?: boolean;
}

export type Order = MoveOrder | SupportOrder | SiegeOrder;

/**
 * Capitán de una casa (diseño v3, fase 4): está en una casilla propia o preso
 * de otra casa hasta la resolución `freeAt` (incluida, se escapa al empezar
 * esa resolución).
 */
export interface Captain {
  house: HouseId;
  /** Casilla donde está; null si está preso. */
  tile: TileId | null;
  capturedBy?: HouseId | null;
  freeAt?: number | null;
}

export interface CampaignInput {
  /** Número de la resolución que se está ejecutando (1, 2, ...). */
  resolution: number;
  tiles: Tile[];
  orders: Order[];
  /** Casas en piloto automático: sus casillas tienen +25% de defensa. */
  absentHouses?: HouseId[];
  /** Carta Tregua: casillas que nadie puede atacar en esta resolución. */
  truceTiles?: TileId[];
  /** Carta Tambores de guerra: bonificación de ataque por casa (0,25 = +25%). */
  attackBonus?: Partial<Record<HouseId, number>>;
  /** Eventos: bonificación de ataque para todos, de defensa para todos y Paz del Rey. */
  attackBonusAll?: number;
  defenseBonus?: number;
  peace?: boolean;
  /** Capitanes de las casas (diseño v3). */
  captains?: Captain[];
  /** Alianzas en vigor o en aviso (bloque 8). */
  alliances?: Alliance[];
}

export type CampaignEvent =
  | {
      type: "orden_invalida";
      order: Order;
      reason: string;
    }
  | {
      type: "apoyo_cortado";
      house: HouseId;
      from: TileId;
      target: TileId;
    }
  | {
      type: "choque_frontal";
      /** Casillas de salida de los dos grupos. */
      tiles: [TileId, TileId];
      /** Si se cruzan por el camino (bloque 4): casilla de en medio, donde chocan. */
      via?: TileId;
      winner: HouseId | null;
      sides: { house: HouseId; strength: number }[];
    }
  | {
      type: "combate";
      tile: TileId;
      /** Ganador; null si gana la guarnición neutral. */
      winner: HouseId | null;
      /** Dueño anterior de la casilla (null = neutral). */
      previousOwner: HouseId | null;
      conquered: boolean;
      survivors: number;
      /**
       * Bloque 8: casas que ganan junto a `winner` (aliados del ataque conjunto,
       * o tropas de paso que defendían) y las tropas que les quedan a todas.
       */
      allies?: HouseId[];
      kept?: { house: HouseId; troops: number }[];
      /** Tropas de paso que estaban en la casilla y no lucharon (aliadas de un atacante). */
      aside?: HouseId[];
      sides: {
        house: HouseId | null;
        role: "defensa" | "ataque";
        strength: number;
        troops: number;
        supporters: HouseId[];
        /** Ataque: casillas de las que salen sus tropas (para la repetición de la noche). */
        from?: TileId[];
        /** Ataque: alguno de sus grupos entra cruzando un río sin puente (bloque 1). */
        river?: boolean;
        /** Ataque conjunto (bloque 8): casas aliadas con las que ataca. Defensa: tropas de paso que defienden. */
        joint?: HouseId[];
      }[];
    }
  | {
      type: "tregua";
      tile: TileId;
      /** Casas cuyo ataque se detuvo (sus tropas no se movieron). */
      houses: HouseId[];
    }
  | {
      type: "paz";
      tile: TileId;
      houses: HouseId[];
    }
  | {
      type: "rebote";
      tile: TileId;
      houses: HouseId[];
      strength: number;
    }
  | {
      type: "movimiento";
      house: HouseId;
      from: TileId;
      to: TileId;
      troops: number;
      /** Entra en una casilla aliada como tropas de paso (bloque 8). */
      guest?: boolean;
    }
  | {
      /**
       * Bloque 8: tropas de paso que vuelven a la casilla propia más cercana
       * porque la alianza terminó o la casilla pasó a una casa que no es aliada.
       */
      type: "expulsion";
      house: HouseId;
      from: TileId;
      to: TileId;
      troops: number;
    }
  | {
      type: "asedio";
      house: HouseId;
      tile: TileId;
      /** Noches que lleva sitiada (1 = la primera). */
      nights: number;
      castle: boolean;
      from: TileId[];
    }
  | {
      type: "asedio_roto";
      house: HouseId;
      tile: TileId;
      /** "cortado": atacaron a quien sitiaba; "levantado": ya nadie sitia; "tomada": la casilla cambió de manos. */
      reason: "cortado" | "levantado" | "tomada";
    }
  | {
      type: "capitan_preso";
      house: HouseId;
      /** Casa que lo captura. */
      by: HouseId;
      tile: TileId;
      freeAt: number;
    }
  | {
      type: "capitan_libre";
      house: HouseId;
      /**
       * "fuga": se escapó al cumplirse el plazo; "huida": perdió contra una guarnición
       * neutral y volvió al castillo; "liberado": quien lo tenía lo soltó gratis;
       * "rescate": su casa pagó el rescate (bloque 4). Los dos últimos los escribe
       * el servidor, con `by` (quien lo tenía) y, en el rescate, `oro`.
       */
      reason: "fuga" | "huida" | "liberado" | "rescate";
      by?: HouseId;
      oro?: number;
    }
  | {
      type: "repliegue";
      house: HouseId;
      from: TileId;
      to: TileId;
      troops: number;
      /** false si la casilla de origen se perdió y las tropas se pierden. */
      arrived: boolean;
    };

export interface CampaignResult {
  tiles: Tile[];
  events: CampaignEvent[];
  /** Capitanes tras la resolución (los mismos que entraron, movidos, presos o libres). */
  captains: Captain[];
}
