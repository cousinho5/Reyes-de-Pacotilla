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
  partidas: { id: number; nombre: string; estado: string; casa: string; color: string }[];
}

export interface Invitation {
  partida: { id: number; nombre: string; estado: string; semanas: number };
  casas: { nombre: string; color: string }[];
  coloresLibres: string[];
  yaDentro: boolean;
}

export interface HouseInfo {
  id: number;
  nombre: string;
  color: string;
  lema: string | null;
  prestigio?: PrestigeBreakdown;
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
  };
  yo: {
    casa: number;
    recursos?: Resources;
    edificios?: Record<BuildingKind, number>;
    produccionDiaria?: Resources;
    mantenimientoSemanal?: number;
    ayudaAlUltimo?: Resource | null;
    recursoAyuda?: Resource;
  };
  casas: HouseInfo[];
  casillas?: TileView[];
  ordenes?: OrderView[];
  eventos?: EventView[];
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
};
