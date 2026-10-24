// Piezas de pixel art listas para usar: escudos, casillas, recursos y Fray Abundio.

import { SYMBOL_NAME, type Resource, type ShieldDivision, type ShieldShape, type ShieldSymbol, type TileType } from "@reyes/engine";
import { useEffect, useMemo, useState } from "react";
import type { ShieldView } from "../api";
import { Pixels } from "./Pixels";
import { shieldGrid } from "./shield";
import { shade } from "./tiles";
import { renderWorld } from "./world";
import { ICONS, type IconName } from "./icons";
import { FRAY_ANIMS, FRAY_SPRITES, RESOURCE_SPRITES, type FrayAnim, type FrayMood } from "./sprites";
import { corona, corona_brilla, podio } from "./podio";

import { espantapajaros } from "./espantapajaros";
export { Pixels } from "./Pixels";
export type { FrayAnim, FrayMood } from "./sprites";

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

/** Rejilla y colores del escudo de una casa. Sin datos de escudo (partidas antiguas), uno pleno con león. */
export function shieldArt(color: string, escudo?: ShieldView | null): { grid: string[]; palette: Record<string, string>; symbol: ShieldSymbol } {
  const shape = (escudo?.forma ?? "espanol") as ShieldShape;
  const division = (escudo?.color2 ? (escudo.division ?? "pleno") : "pleno") as ShieldDivision;
  const symbol = (escudo?.simbolo ?? "leon") as ShieldSymbol;
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
  return { grid: shieldGrid(shape, division, symbol), palette, symbol };
}

/** El escudo de una casa. Sin datos de escudo (partidas antiguas) pinta uno pleno con león. */
export function ShieldIcon({ color, escudo, size = 32, title, className }: ShieldProps) {
  const art = useMemo(() => shieldArt(color, escudo), [color, JSON.stringify(escudo ?? null)]);
  return (
    <Pixels
      grid={art.grid}
      palette={art.palette}
      size={size}
      title={title ?? `Escudo con ${SYMBOL_NAME[art.symbol] ?? art.symbol}`}
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

/** La animación de cada cara cuando no se pide otra (bloque 3). */
const MOOD_ANIM: Partial<Record<FrayMood, FrayAnim>> = { solemne: "parpadea", dormido: "cabecea", monedas: "tintinea" };
/** Si se ha pedido reducir el movimiento (entonces nada se anima). */
export const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fray Abundio (bloque 3: 48x48 tras su pupitre). Se anima solo: parpadea, cabecea
 * dormido o hace sonar las monedas; `anim` pide otra (habla, moja). Con «reducir
 * movimiento», la cara quieta.
 */
export function FrayAbundio({ mood = "solemne", size = 72, anim }: { mood?: FrayMood; size?: number; anim?: FrayAnim | null }) {
  const which = anim === null ? undefined : (anim ?? MOOD_ANIM[mood]);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (!which || still()) return;
    const a = FRAY_ANIMS[which];
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        i = (i + 1) % a.frames.length;
        setFrame(i);
        next();
      }, a.ms[i] ?? a.ms[0]!);
    };
    next();
    return () => clearTimeout(t);
  }, [which]);
  const s = which && !still() ? (FRAY_ANIMS[which].frames[frame] ?? FRAY_SPRITES[mood]) : FRAY_SPRITES[mood];
  return <Pixels grid={s.grid} palette={s.palette} size={size} title={MOOD_LABEL[mood]} className="fray" />;
}

/** Marca de las casas bot (docs/bots.md): el espantapájaros, «casa gobernada por su mayordomo». */
export const BOT_TITLE = "Casa gobernada por su mayordomo (un bot)";
export function BotMark({ size = 16 }: { size?: number }) {
  return <Pixels grid={espantapajaros.grid} palette={espantapajaros.palette} size={size} title={BOT_TITLE} className="bot-mark" />;
}

/** Icono de interfaz en pixel art, teñido con `color`. */
export function Icon({ name, size = 24, color = "#d6a64b", title }: { name: IconName; size?: number; color?: string; title?: string }) {
  const palette = useMemo(() => ({ k: "#1c1410", m: color, l: shade(color, 0.45), d: shade(color, -0.35) }), [color]);
  return <Pixels grid={ICONS[name]} palette={palette} size={size} title={title} className="ico" />;
}

/**
 * Bloque 11: la corona del primero. Con `shine`, brilla una vez (un destello
 * que la cruza); con «reducir movimiento», quieta.
 */
export function Crown({ size = 32, shine = false }: { size?: number; shine?: boolean }) {
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    if (!shine || still()) return;
    let i = 0;
    setFrame(0);
    const t = setInterval(() => {
      i++;
      if (i >= corona_brilla.length) {
        clearInterval(t);
        setFrame(null);
      } else setFrame(i);
    }, 85);
    return () => clearInterval(t);
  }, [shine]);
  const s = frame != null ? corona_brilla[frame]! : corona;
  return <Pixels grid={s.grid} palette={s.palette} size={size} className="crown" />;
}

/** Bloque 11: el podio de madera (segundo, primero y tercero), a lo ancho que se pida. */
export function Podium({ size = 288 }: { size?: number }) {
  return <Pixels grid={podio.grid} palette={podio.palette} size={size} className="podium-art" />;
}
