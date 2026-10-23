// Bloque 7: la partida de muestra de la portada, para enseñar el prólogo a quien
// aún no juega. Siete casas inventadas sobre un mapa de semilla fija, todo en el
// cliente: no se pide nada al servidor.

import { generateMap } from "@reyes/engine";
import type { CinematicMapData } from "./components/CinematicMap";
import type { HouseInfo } from "./api";

type Row = [nombre: string, color: string, forma: string, division: string, simbolo: string, metal: string, color2: string | null, lema: string];

const HOUSES: Row[] = [
  ["Duques del Queso", "naranjado", "rodela", "cortado", "queso", "oro", "sable", "Curado y sin prisa"],
  ["Señores del Pato", "azur", "apuntado", "pleno", "pato", "plata", null, "Cuac"],
  ["Los Pocapena", "gules", "espanol", "partido", "leon", "oro", "oro", "Ni una lágrima"],
  ["Gallina Bélica", "sinople", "almendrado", "tronchado", "gallina", "oro", "leonado", "Primero el huevo"],
  ["Barones del Barro", "leonado", "estandarte", "pleno", "cerdo", "oro", null, "Hasta las rodillas"],
  ["Caracol Veloz", "aguamarina", "espanol", "cortado", "caracol", "plata", "purpura", "Llegaremos"],
  ["Casa del Nabo", "purpura", "apuntado", "partido", "nabo", "oro", "sinople", "Humilde raíz"],
];

export const SAMPLE_HOUSES: HouseInfo[] = HOUSES.map(([nombre, color, forma, division, simbolo, metal, color2, lema], i) => ({
  id: i + 1,
  nombre,
  color,
  lema,
  escudo: { forma, division, color2, simbolo, metal },
}));

let sample: CinematicMapData | null = null;

/** El estado de la partida de muestra (siempre el mismo), con lo que leen el prólogo y su mapa. */
export function sampleGame(): CinematicMapData {
  if (sample) return sample;
  const map = generateMap("aldricia-portada", SAMPLE_HOUSES.map((h) => h.id));
  const state: CinematicMapData = {
    partida: {
      // Un número que no usa ninguna partida de verdad.
      id: 0,
      nombre: "Aldricia de muestra",
      estado: "lobby",
      semanas: 6,
      esCreador: false,
      codigoInvitacion: null,
      inicio: null,
      columnas: map.cols,
      filas: map.rows,
      costa: map.coast,
      resolucionActual: 0,
      totalResoluciones: 42,
    } as CinematicMapData["partida"],
    casas: SAMPLE_HOUSES,
    casillas: map.tiles.map((t, i) => ({
      id: i + 1,
      x: t.x,
      y: t.y,
      type: t.type,
      owner: t.owner ?? null,
      troops: null,
      fortifiedUntil: null,
      river: t.river ?? 0,
      visible: true,
      nombre: t.name,
    })),
    yo: { casa: 1 },
  };
  sample = state;
  return state;
}
