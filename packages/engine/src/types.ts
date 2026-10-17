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
  | "fortaleza";

export interface Tile {
  id: TileId;
  x: number;
  y: number;
  type: TileType;
  /** Casa dueña; null = neutral. */
  owner: HouseId | null;
  /** Tropas del dueño, o guarnición neutral si no tiene dueño. */
  troops: number;
  /** Número de resolución hasta la que dura la fortificación (incluida). */
  fortifiedUntil?: number | null;
  /** Solo en castillos: la casa a la que pertenece. Nunca cambia. */
  castleOf?: HouseId | null;
}

export interface MoveOrder {
  kind: "move";
  house: HouseId;
  from: TileId;
  to: TileId;
  troops: number;
}

export interface SupportOrder {
  kind: "support";
  house: HouseId;
  from: TileId;
  /** Casilla que se apoya (la atacada o la defendida). */
  target: TileId;
  /** Origen del ataque apoyado; null = se apoya la defensa de `target`. */
  supportedFrom: TileId | null;
  troops: number;
}

export type Order = MoveOrder | SupportOrder;

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
      tiles: [TileId, TileId];
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
      sides: { house: HouseId | null; role: "defensa" | "ataque"; strength: number; troops: number; supporters: HouseId[] }[];
    }
  | {
      type: "tregua";
      tile: TileId;
      /** Casas cuyo ataque se detuvo (sus tropas no se movieron). */
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
}
