// Piezas de pixel art listas para usar: escudos, casillas, recursos y Fray Abundio.

import { SYMBOL_NAME, type Resource, type ShieldDivision, type ShieldShape, type ShieldSymbol, type TileType } from "@reyes/engine";
import { useMemo } from "react";
import type { ShieldView } from "../api";
import { Pixels } from "./Pixels";
import { shieldGrid } from "./shield";
import { shade } from "./tiles";
import { renderWorld } from "./world";
import { ICONS, type IconName } from "./icons";
import { FRAY_SPRITES, RESOURCE_SPRITES, type FrayMood } from "./sprites";

export { Pixels } from "./Pixels";
export type { FrayMood } from "./sprites";

/** Colores de la interfaz para cada esmalte (diseño, sección 18.2). */
export const ENAMEL: Record<string, string> = {
  gules: "#B3291D",
  azur: "#1B3C80",
  sinople: "#246B2A",
  sable: "#1E1E24",
  purpura: "#A23C9E",
  naranjado: "#A84E0F",
  aguamarina: "#0E6A6E",
  leonado: "#4E2F18",
};
const METAL = { oro: ["#E8B83A", "#A97E14"], plata: ["#E6E6E6", "#9A9AA3"] } as const;


interface ShieldProps {
  color: string;
  escudo?: ShieldView | null;
  size?: number;
  title?: string;
  className?: string;
}

/** El escudo de una casa. Sin datos de escudo (partidas antiguas) pinta uno pleno con león. */
export function ShieldIcon({ color, escudo, size = 32, title, className }: ShieldProps) {
  const shape = (escudo?.forma ?? "espanol") as ShieldShape;
  const division = (escudo?.color2 ? (escudo.division ?? "pleno") : "pleno") as ShieldDivision;
  const symbol = (escudo?.simbolo ?? "leon") as ShieldSymbol;
  const grid = useMemo(() => shieldGrid(shape, division, symbol), [shape, division, symbol]);
  const metal = METAL[(escudo?.metal ?? "oro") as keyof typeof METAL] ?? METAL.oro;
  const a = ENAMEL[color] ?? "#666666";
  const b = ENAMEL[escudo?.color2 ?? ""] ?? a;
  const palette = {
    k: "#1a1410",
    a,
    b,
    A: shade(a, 0.28),
    B: shade(b, 0.28),
    c: shade(a, -0.3),
    d: shade(b, -0.3),
    m: metal[0],
    n: metal[1],
    x: "#1a1410",
  };
  return (
    <Pixels
      grid={grid}
      palette={palette}
      size={size}
      title={title ?? `Escudo con ${SYMBOL_NAME[symbol] ?? symbol}`}
      className={`shield ${className ?? ""}`}
    />
  );
}

/** Dibujo de una casilla suelta (miniatura): el mismo pintor que el mapa. */
export function TileArt({ type, flag, className }: { type: TileType; flag?: string | null; className?: string }) {
  const img = useMemo(() => renderWorld({ cols: 1, rows: 1, margin: 0, cells: [{ x: 0, y: 0, type, owner: flag ?? null }] }), [type, flag]);
  return <Pixels grid={img.pixels} palette={img.palette} size={32} className={className} />;
}

export function ResourceIcon({ r, size = 18 }: { r: Resource; size?: number }) {
  const s = RESOURCE_SPRITES[r];
  return <Pixels grid={s.grid} palette={s.palette} size={size} className="res-icon" />;
}

const MOOD_LABEL: Record<FrayMood, string> = {
  solemne: "Fray Abundio, solemne",
  adulador: "Fray Abundio, adulador",
  escandalizado: "Fray Abundio, escandalizado",
  dormido: "Fray Abundio, dormido",
  monedas: "Fray Abundio, contando monedas",
};

export function FrayAbundio({ mood = "solemne", size = 72 }: { mood?: FrayMood; size?: number }) {
  const s = FRAY_SPRITES[mood];
  return <Pixels grid={s.grid} palette={s.palette} size={size} title={MOOD_LABEL[mood]} className="fray" />;
}

/** Icono de interfaz en pixel art, teñido con `color`. */
export function Icon({ name, size = 24, color = "#d6a64b", title }: { name: IconName; size?: number; color?: string; title?: string }) {
  const palette = useMemo(() => ({ k: "#1c1410", m: color, l: shade(color, 0.45), d: shade(color, -0.35) }), [color]);
  return <Pixels grid={ICONS[name]} palette={palette} size={size} title={title} className="ico" />;
}
