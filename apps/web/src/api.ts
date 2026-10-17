// Cliente de la API. Las cookies de sesión viajan solas (mismo origen).

import type { BuildingKind, PrestigeBreakdown, Resource, Resources, TileType } from "@reyes/engine";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? "Algo ha fallado. El cronista culpa a las ratas.", res.status);
  return data as T;
}

export interface Me {
  usuario: { id: number; nombre: string } | null;
  partidas: { id: number; nombre: string; estado: string; prueba?: boolean; casa: string; color: string }[];
}

export interface Invitation {
  partida: { id: number; nombre: string; estado: string; semanas: number };
  casas: { nombre: string; color: string }[];
  coloresLibres: string[];
  yaDentro: boolean;
}

export interface ObjectiveView {
  clave: string;
  texto: string;
}

export interface HouseInfo {
  id: number;
  nombre: string;
  color: string;
  lema: string | null;
  prestigio?: PrestigeBreakdown;
  logros?: { clave: string; veces: number }[];
  objetivo?: (ObjectiveView & { cumplido: boolean }) | null;
}

export interface OfferInfo {
  id: number;
  de: number;
  para: number | null;
  da: Resources;
  pide: Resources;
  estado: "open" | "accepted" | "rejected" | "cancelled" | "countered";
  aceptadaPor: number | null;
  contraofertaDe: number | null;
  creada: string;
}

export interface TradeInfo {
  id: number;
  casas: [number, number];
  valido: boolean;
  cantidades: [number, number] | null;
  cuando: string;
}

export interface TileView {
  id: number;
  x: number;
  y: number;
  type: TileType;
  owner: number | null;
  troops: number | null;
  fortifiedUntil: number | null;
  castleOf?: number | null;
  visible: boolean;
  nombre: string;
}

export interface OrderView {
  id?: number;
  tipo: "mover" | "apoyar";
  desde: number;
  hacia: number;
  apoyaDesde: number | null;
  tropas: number;
}

export interface EventView {
  id: number;
  tipo: string;
  resolucion: number | null;
  datos: Record<string, unknown>;
}

export interface GameState {
  partida: {
    id: number;
    nombre: string;
    estado: "lobby" | "active" | "finished";
    semanas: number;
    esCreador: boolean;
    codigoInvitacion: string | null;
    inicio: string | null;
    columnas: number | null;
    filas: number | null;
    resolucionActual: number;
    totalResoluciones: number;
    proximaResolucion?: number | null;
    cierre?: string | null;
    resolucion?: string | null;
    ordenesAbiertas?: boolean;
    haEmpezado?: boolean;
    final?: { ranking: { house: number; total: number }[]; winner: number | null } | null;
  };
  yo: {
    casa: number;
    recursos?: Resources;
    edificios?: Record<BuildingKind, number>;
    produccionDiaria?: Resources;
    mantenimientoSemanal?: number;
    ayudaAlUltimo?: Resource | null;
    recursoAyuda?: Resource;
    objetivo?: {
      opciones: ObjectiveView[];
      elegido: ObjectiveView | null;
      puedeElegir: boolean;
      cumplido: boolean | null;
    };
    ausencia?: { vacaciones: boolean; plantilla: "defensiva" | "economica" | "equilibrada" };
  };
  casas: HouseInfo[];
  /** Solo en partidas de prueba (y solo para quien las creó, en juego). */
  prueba?: TestInfo | null;
  subasta?: AuctionInfo | null;
  cartas?: CardInfo[];
  /** Casas que vigilas con la carta Espía. */
  vigiladas?: number[];
  casillas?: TileView[];
  ordenes?: OrderView[];
  eventos?: EventView[];
  ofertas?: OfferInfo[];
  tratos?: TradeInfo[];
}

export interface AuctionInfo {
  semana: number;
  abierta: boolean;
  lotes: {
    lote: number;
    nombre: string;
    carta: { clave: string; nombre: string; texto: string } | null;
    recursos: Partial<Resources> | null;
    miPuja: number | null;
    ganador: number | null;
    precio: number | null;
  }[];
}

export interface CardInfo {
  id: number;
  clave: string;
  nombre: string;
  texto: string;
  objetivo: "casa" | "casilla_propia" | "recursos" | "edificio" | null;
}

export interface CardParamsInput {
  casa?: number;
  casilla?: number;
  edificio?: BuildingKind;
  da?: Resource;
  recibe?: Resource;
}

export interface TestInfo {
  /** En la sala de espera: bots que se añadirán al empezar. */
  bots?: number;
  /** En juego: hora simulada y casa que manejas. */
  ahora?: string;
  jugandoComo?: number;
  casas?: { id: number; nombre: string; color: string; bot: boolean; personalidad?: string | null }[];
}

export const api = {
  me: () => call<Me>("GET", "/yo"),
  login: (codigo: string) => call<{ ok: true }>("POST", "/entrar", { codigo }),
  logout: () => call<{ ok: true }>("POST", "/salir"),
  invitation: (codigo: string) => call<Invitation>("GET", `/invitacion/${encodeURIComponent(codigo)}`),
  join: (codigo: string, body: { nombre?: string; casa: string; color: string; lema?: string }) =>
    call<{ ok: true; partida: number; codigoAcceso: string | null }>("POST", `/invitacion/${encodeURIComponent(codigo)}/unirse`, body),
  game: (id: number) => call<GameState>("GET", `/partidas/${id}`),
  start: (id: number, inicio?: string) => call<{ ok: true; inicio: string }>("POST", `/partidas/${id}/empezar`, inicio ? { inicio } : {}),
  upgrade: (id: number, edificio: BuildingKind) => call<{ ok: true }>("POST", `/partidas/${id}/mejorar`, { edificio }),
  recruit: (id: number, cantidad: number) => call<{ ok: true }>("POST", `/partidas/${id}/reclutar`, { cantidad }),
  fortify: (id: number, casilla: number) => call<{ ok: true }>("POST", `/partidas/${id}/fortificar`, { casilla }),
  setHelp: (id: number, recurso: Resource) => call<{ ok: true }>("POST", `/partidas/${id}/ayuda`, { recurso }),
  saveOrders: (id: number, ordenes: OrderView[]) => call<{ ok: true }>("PUT", `/partidas/${id}/ordenes`, { ordenes }),
  newCode: () => call<{ codigoAcceso: string }>("POST", "/codigo-nuevo"),
  createOffer: (id: number, body: { para: number | null; da: Partial<Resources>; pide: Partial<Resources>; contraofertaDe?: number }) =>
    call<{ ok: true }>("POST", `/partidas/${id}/ofertas`, body),
  acceptOffer: (id: number, oferta: number) => call<{ ok: true }>("POST", `/partidas/${id}/ofertas/${oferta}/aceptar`),
  rejectOffer: (id: number, oferta: number) => call<{ ok: true }>("POST", `/partidas/${id}/ofertas/${oferta}/rechazar`),
  cancelOffer: (id: number, oferta: number) => call<{ ok: true }>("POST", `/partidas/${id}/ofertas/${oferta}/retirar`),
  chooseObjective: (id: number, clave: string) => call<{ ok: true }>("POST", `/partidas/${id}/objetivo`, { clave }),
  setAbsence: (id: number, body: { vacaciones?: boolean; plantilla?: string }) =>
    call<{ ok: true }>("POST", `/partidas/${id}/ausencia`, body),
  pushKey: () => call<{ clave: string | null }>("GET", "/push/clave"),
  pushSubscribe: (sub: PushSubscriptionJSON) => call<{ ok: true }>("POST", "/push/suscribir", sub),
  pushUnsubscribe: (endpoint: string) => call<{ ok: true }>("POST", "/push/baja", { endpoint }),
  pushTest: () => call<{ ok: true }>("POST", "/push/prueba"),
  bid: (id: number, lote: number, cantidad: number) => call<{ ok: true }>("PUT", `/partidas/${id}/subasta/${lote}`, { cantidad }),
  useCard: (id: number, carta: number, params: CardParamsInput) => call<{ ok: true }>("POST", `/partidas/${id}/cartas/${carta}/usar`, params),
  testAdvance: (id: number, hasta: "paso" | "resolucion") =>
    call<{ ok: true; ahora: string; resolucion: number; estado: string }>("POST", `/partidas/${id}/prueba/avanzar`, { hasta }),
  testPlayAs: (id: number, casa: number) => call<{ ok: true }>("POST", `/partidas/${id}/prueba/jugar-como`, { casa }),
  deleteGame: (id: number) => call<{ ok: true }>("DELETE", `/partidas/${id}`),
};
