// Cliente de la API. Las cookies de sesión viajan solas (mismo origen).

import type { Bulletin, BuildingKind, PrestigeBreakdown, Resource, Resources, TileType } from "@reyes/engine";

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
  partidas: { id: number; nombre: string; estado: string; prueba?: boolean; casa: string; color: string; escudo?: ShieldView }[];
}

export interface ShieldView {
  forma: string;
  division: string;
  color2: string | null;
  simbolo: string;
  metal: string;
}

/** Nombre, lema y escudo, tal como se mandan al unirse o al retocar la casa. */
export interface HouseForm {
  casa: string;
  color: string;
  lema?: string;
  forma: string;
  division: string;
  color2: string | null;
  simbolo: string;
  metal: string;
}

export interface Invitation {
  partida: { id: number; nombre: string; estado: string; semanas: number };
  casas: { nombre: string; color: string; escudo?: ShieldView }[];
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
  escudo?: ShieldView;
  prestigio?: PrestigeBreakdown;
  /** Etapa de su castillo, de 1 a 5 (bloque 2). */
  etapa?: number;
  logros?: { clave: string; veces: number }[];
  objetivo?: (ObjectiveView & { cumplido: boolean }) | null;
  /** Capitán de la casa: su nombre y, si está preso, de quién y hasta qué resolución. */
  capitan?: {
    nombre: string;
    presoDe: number | null;
    libreEn: number | null;
    /** Rescate en Oro que pide quien lo tiene (solo lo ven las dos casas; null si aún no ha pedido). */
    rescate?: number | null;
  };
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
  /** Bloque 10: resolución tras la que se retira si sigue abierta. */
  caducaTras: number | null;
  caducada: boolean;
  /** Frase corta de quien la hace (80 letras como mucho). */
  frase: string | null;
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
  /** De esas tropas, Jinetes y Catapultas (el resto, Mesnada). Solo si se ven. */
  jinetes?: number;
  catapultas?: number;
  fortifiedUntil: number | null;
  castleOf?: number | null;
  /** Capitanes que hay en la casilla (el tuyo siempre; los ajenos, si ves sus tropas). */
  capitanes?: number[];
  /** Asedio: casa que la sitia y noches que lleva. */
  besiegedBy?: number | null;
  siegeNights?: number;
  /** Ríos por los lados de la casilla (bloque 1): un bit por lado, como en el motor. */
  river?: number;
  /** Bloque 8: tropas de paso de casas aliadas (solo si se ven las tropas de la casilla). */
  guests?: { house: number; troops: number; jinetes?: number; catapultas?: number }[];
  visible: boolean;
  /** Se ve la casilla, pero sus tropas se esconden en el bosque (emboscada). */
  hidden?: boolean;
  nombre: string;
}

export interface OrderView {
  id?: number;
  tipo: "mover" | "apoyar" | "sitiar";
  desde: number;
  hacia: number;
  apoyaDesde: number | null;
  tropas: number;
  /** De esas tropas, Jinetes y Catapultas (el resto, Mesnada). */
  jinetes?: number;
  catapultas?: number;
  /** El Capitán va con este grupo. */
  capitan?: boolean;
  /** Resolución para la que es (las siguientes a la próxima van en cola). */
  resolucion?: number;
  /** Bloque 8: salen las tropas de paso de tu casa en esa casilla aliada. */
  dePaso?: boolean;
  /** Bloque 12: se copia a la noche siguiente al resolver (asedios y defensas). */
  repetir?: boolean;
}

/** Bloque 8: alianzas, tal como llegan del servidor. */
export interface AlliancesInfo {
  activas: boolean;
  nochesDeAviso: number;
  resolucionesPropuesta: number;
  diasSinFirmar: number;
  umbralTropas: number;
  maximo: number | null;
  /** Si rompiste una alianza hace poco, hasta cuándo no puedes firmar otra. */
  sinFirmarHasta: string | null;
  /** Registro público: alianzas en vigor y en aviso de todo el reino. */
  lista: {
    id: number;
    nombre: string;
    casas: [number, number];
    estado: "activa" | "aviso";
    desde: number | null;
    terminaTras: number | null;
    rotaPor: number | null;
  }[];
  /** Propuestas en las que está tu casa. */
  propuestas: { id: number; nombre: string; de: number; para: number; caducaTras: number }[];
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
    /** Lados con costa (bloque 1); null en los mapas de antes. */
    costa?: "oeste-este" | "norte-sur" | null;
    /** Zona horaria de la partida (bloque 2: el día en que tendrás lo que falta, la hora del cielo). */
    zonaHoraria?: string;
    resolucionActual: number;
    totalResoluciones: number;
    /** Días con resolución (0 = lunes ... 6 = domingo). */
    diasResolucion?: number[];
    /** Resoluciones que dura fortificar. */
    fortificarResoluciones?: number;
    /** Noches seguidas para las que se pueden dejar órdenes (esta y las siguientes). */
    nochesEnCola?: number;
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
    /** Bloque 12: aviso 1 hora antes del cierre si aún no has dado órdenes. */
    avisoCierre?: boolean;
  };
  casas: HouseInfo[];
  /** Solo en partidas de prueba (y solo para quien las creó, en juego). */
  prueba?: TestInfo | null;
  subasta?: AuctionInfo | null;
  /** Bloque 5: mercenarios de alquiler de tu casa y cuándo se van (fecha local). */
  mercenarios?: { precio: number; dias: number; grupos: { unidades: number; seVan: string }[] } | null;
  /** Bloque 5: Oro que cuesta la próxima unidad de cada recurso en la Corona. */
  corona?: { precios: Record<CrownGood, number> } | null;
  /** Bloque 3: `edicion` es "domingo" o "miercoles" (la hoja volandera). */
  boletines?: { semana: number; edicion?: "domingo" | "miercoles"; titular: string }[];
  /** Bloque 3: la proclama de tu casa para el próximo domingo. */
  proclama?: { semana: number; texto: string | null; max: number } | null;
  /** Bloque 3: al acabar, tu línea al pie de la Crónica Definitiva (null si ganaste o la partida sigue). */
  feDeErratas?: { texto: string | null; max: number } | null;
  soborno?: { semana: number; coste: number; pagado: number | null; frases: string[] } | null;
  evento?: { semana: number; clave: string; nombre: string; texto: string; linea: string; aplicado: boolean } | null;
  cartas?: CardInfo[];
  /** Casas que vigilas con la carta Espía. */
  vigiladas?: number[];
  alianzas?: AlliancesInfo | null;
  casillas?: TileView[];
  ordenes?: OrderView[];
  eventos?: EventView[];
  ofertas?: OfferInfo[];
  tratos?: TradeInfo[];
}

export interface AuctionInfo {
  semana: number;
  abierta: boolean;
  /** Cuándo se anunciaron los lotes (la vela empieza a arder entonces). */
  abre?: string | null;
  lotes: {
    lote: number;
    nombre: string;
    carta: { clave: string; nombre: string; texto: string } | null;
    recursos: Partial<Resources> | null;
    miPuja: number | null;
    /** Sobres (pujas) del lote, sin cantidades ni de quién. */
    sobres?: number;
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
  casas?: { id: number; nombre: string; color: string; escudo?: ShieldView; bot: boolean; personalidad?: string | null }[];
}

export type CrownGood = "pan" | "madera" | "piedra" | "hierro";

// --- Lo último que se vio (bloque 6): la partida abre al instante y, sin conexión,
// enseña lo guardado. Se guarda en este navegador y se borra al entrar o salir.

const SAVED_GAMES = 3;
const savedKey = (id: number) => `partida:${id}`;
function readSaved<T>(key: string): { at: number; data: T } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { at: number; data: T }) : null;
  } catch {
    return null;
  }
}
function writeSaved(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* sin sitio: la próxima vez habrá que esperar a la red */
  }
}
/** La última partida que se vio y cuándo (ms), o null. */
export function savedGame(id: number): { at: number; state: GameState } | null {
  const s = readSaved<GameState>(savedKey(id));
  return s ? { at: s.at, state: s.data } : null;
}
export function saveGame(id: number, state: GameState) {
  writeSaved(savedKey(id), state);
  // Solo las últimas partidas: el sitio del navegador es poco.
  try {
    const games = Object.keys(localStorage)
      .filter((k) => k.startsWith("partida:"))
      .map((k) => ({ k, at: readSaved(k)?.at ?? 0 }))
      .sort((a, b) => b.at - a.at);
    games.slice(SAVED_GAMES).forEach((g) => localStorage.removeItem(g.k));
  } catch {
    /* sin almacenamiento */
  }
}
function forgetSaved() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("partida:") || k === "yo")
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* sin almacenamiento */
  }
}
/** Sin red (no un error del servidor): fetch falla con TypeError. */
export const isOffline = (err: unknown) => !(err instanceof ApiError);

export const api = {
  me: async () => {
    try {
      const me = await call<Me>("GET", "/yo");
      writeSaved("yo", me);
      return me;
    } catch (err) {
      const saved = isOffline(err) ? readSaved<Me>("yo") : null;
      if (saved) return saved.data;
      throw err;
    }
  },
  login: (codigo: string) => call<{ ok: true }>("POST", "/entrar", { codigo }).finally(forgetSaved),
  logout: () => call<{ ok: true }>("POST", "/salir").finally(forgetSaved),
  invitation: (codigo: string) => call<Invitation>("GET", `/invitacion/${encodeURIComponent(codigo)}`),
  join: (codigo: string, body: { nombre?: string } & HouseForm) =>
    call<{ ok: true; partida: number; codigoAcceso: string | null }>("POST", `/invitacion/${encodeURIComponent(codigo)}/unirse`, body),
  game: (id: number) => call<GameState>("GET", `/partidas/${id}`),
  editHouse: (id: number, body: HouseForm) => call<{ ok: true }>("PUT", `/partidas/${id}/casa`, body),
  start: (id: number, inicio?: string) => call<{ ok: true; inicio: string }>("POST", `/partidas/${id}/empezar`, inicio ? { inicio } : {}),
  upgrade: (id: number, edificio: BuildingKind) => call<{ ok: true }>("POST", `/partidas/${id}/mejorar`, { edificio }),
  recruit: (id: number, cantidad: number, tipo: "mesnada" | "jinetes" | "catapultas" = "mesnada", casilla?: number) =>
    call<{ ok: true }>("POST", `/partidas/${id}/reclutar`, casilla != null ? { cantidad, tipo, casilla } : { cantidad, tipo }),
  fortify: (id: number, casilla: number) => call<{ ok: true }>("POST", `/partidas/${id}/fortificar`, { casilla }),
  releaseCaptain: (id: number, casa: number) => call<{ ok: true }>("POST", `/partidas/${id}/capitan/${casa}/soltar`),
  setRansom: (id: number, casa: number, oro: number | null) => call<{ ok: true }>("PUT", `/partidas/${id}/capitan/${casa}/rescate`, { oro }),
  payRansom: (id: number, oro: number) => call<{ ok: true }>("POST", `/partidas/${id}/capitan/rescate`, { oro }),
  setHelp: (id: number, recurso: Resource) => call<{ ok: true }>("POST", `/partidas/${id}/ayuda`, { recurso }),
  saveOrders: (id: number, ordenes: OrderView[]) => call<{ ok: true }>("PUT", `/partidas/${id}/ordenes`, { ordenes }),
  newCode: () => call<{ codigoAcceso: string }>("POST", "/codigo-nuevo"),
  createOffer: (id: number, body: { para: number | null; da: Partial<Resources>; pide: Partial<Resources>; contraofertaDe?: number; frase?: string }) =>
    call<{ ok: true }>("POST", `/partidas/${id}/ofertas`, body),
  acceptOffer: (id: number, oferta: number) => call<{ ok: true }>("POST", `/partidas/${id}/ofertas/${oferta}/aceptar`),
  rejectOffer: (id: number, oferta: number) => call<{ ok: true }>("POST", `/partidas/${id}/ofertas/${oferta}/rechazar`),
  cancelOffer: (id: number, oferta: number) => call<{ ok: true }>("POST", `/partidas/${id}/ofertas/${oferta}/retirar`),
  chooseObjective: (id: number, clave: string) => call<{ ok: true }>("POST", `/partidas/${id}/objetivo`, { clave }),
  setAbsence: (id: number, body: { vacaciones?: boolean; plantilla?: string }) =>
    call<{ ok: true }>("POST", `/partidas/${id}/ausencia`, body),
  setCloseWarning: (id: number, activo: boolean) => call<{ ok: true }>("POST", `/partidas/${id}/aviso-cierre`, { activo }),
  pushKey: () => call<{ clave: string | null }>("GET", "/push/clave"),
  pushSubscribe: (sub: PushSubscriptionJSON) => call<{ ok: true }>("POST", "/push/suscribir", sub),
  pushUnsubscribe: (endpoint: string) => call<{ ok: true }>("POST", "/push/baja", { endpoint }),
  pushTest: () => call<{ ok: true }>("POST", "/push/prueba"),
  bulletin: (id: number, semana: number, edicion: "domingo" | "miercoles" = "domingo") =>
    call<Bulletin & { publicado: string; erratas?: { casa: number; texto: string }[] }>(
      "GET",
      `/partidas/${id}/boletin/${semana}${edicion === "miercoles" ? "?edicion=miercoles" : ""}`,
    ),
  errata: (id: number, texto: string) => call<{ ok: true; texto: string | null }>("PUT", `/partidas/${id}/fe-de-erratas`, { texto }),
  proclaim: (id: number, texto: string) => call<{ ok: true; texto: string | null }>("PUT", `/partidas/${id}/proclama`, { texto }),
  bribe: (id: number, plantilla: number) => call<{ ok: true }>("POST", `/partidas/${id}/soborno`, { plantilla }),
  bid: (id: number, lote: number, cantidad: number) => call<{ ok: true }>("PUT", `/partidas/${id}/subasta/${lote}`, { cantidad }),
  hireMercenaries: (id: number, cantidad: number) =>
    call<{ ok: true; oro: number; seVan: string }>("POST", `/partidas/${id}/mercenarios`, { cantidad }),
  crownQuote: (id: number, recurso: CrownGood, unidades: number) =>
    call<{ oro: number }>("POST", `/partidas/${id}/corona/presupuesto`, { recurso, unidades }),
  crownBuy: (id: number, recurso: CrownGood, unidades: number, oro: number) =>
    call<{ ok: true; oro: number }>("POST", `/partidas/${id}/corona/comprar`, { recurso, unidades, oro }),
  useCard: (id: number, carta: number, params: CardParamsInput) => call<{ ok: true }>("POST", `/partidas/${id}/cartas/${carta}/usar`, params),
  allianceName: (id: number) => call<{ nombre: string }>("GET", `/partidas/${id}/alianzas/nombre`),
  proposeAlliance: (id: number, casa: number, nombre: string) =>
    call<{ ok: true; id: number; name: string }>("POST", `/partidas/${id}/alianzas`, { casa, nombre }),
  acceptAlliance: (id: number, alianza: number) => call<{ ok: true }>("POST", `/partidas/${id}/alianzas/${alianza}/aceptar`),
  declineAlliance: (id: number, alianza: number) => call<{ ok: true }>("POST", `/partidas/${id}/alianzas/${alianza}/rechazar`),
  withdrawAlliance: (id: number, alianza: number) => call<{ ok: true }>("POST", `/partidas/${id}/alianzas/${alianza}/retirar`),
  breakAlliance: (id: number, alianza: number) =>
    call<{ ok: true; terminaTras: number }>("POST", `/partidas/${id}/alianzas/${alianza}/romper`),
  testAdvance: (id: number, hasta: "paso" | "resolucion") =>
    call<{ ok: true; ahora: string; resolucion: number; estado: string }>("POST", `/partidas/${id}/prueba/avanzar`, { hasta }),
  testPlayAs: (id: number, casa: number) => call<{ ok: true }>("POST", `/partidas/${id}/prueba/jugar-como`, { casa }),
  deleteGame: (id: number) => call<{ ok: true }>("DELETE", `/partidas/${id}`),
};
