// Repetición de la noche (diseño v3, fase 5): al abrir el juego tras una
// resolución, el mapa cuenta en unos 20 segundos lo que pasó. Primero marchan
// los ejércitos, luego cada batalla con sus cifras y una línea de Fray Abundio,
// los asedios y los repliegues. Se puede saltar. Solo enseña lo que esta casa
// ve: las batallas fuera de su vista se cuentan, no se dibujan.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { battleLine } from "@reyes/engine";
import type { EventView, HouseInfo, TileView } from "../api";
import { FrayAbundio, Icon, ShieldIcon } from "../art";
import { cellBox, type Geo } from "../art/grid";
import { TERRITORY, captainOf, describeEvent, houseName, wallsLeft } from "../ui";

interface Token {
  house: number;
  from: number;
  to: number;
  troops: number | null;
  /** Solo llega a medio camino (choque frontal). */
  half?: boolean;
}

type Step =
  | { kind: "marcha"; tokens: Token[]; start: number; dur: number }
  | { kind: "combate"; event: EventView; tile: number; start: number; dur: number }
  | { kind: "choque"; event: EventView; tiles: [number, number]; via?: number; start: number; dur: number }
  | { kind: "rebote"; event: EventView; tile: number; start: number; dur: number }
  | { kind: "asedio"; events: EventView[]; start: number; dur: number }
  | { kind: "repliegue"; tokens: Token[]; start: number; dur: number }
  | { kind: "fin"; start: number; dur: number };

interface Props {
  geo: Geo;
  W: number;
  H: number;
  tiles: TileView[];
  houses: HouseInfo[];
  events: EventView[];
  /** Semilla de las frases (partida y resolución): la misma noche dice siempre lo mismo. */
  seed: string;
  resolution: number;
  onFocus: (x: number, y: number) => void;
  onClose: () => void;
  /** Dónde va la franja de Fray Abundio y el botón Saltar (fuera del mapa que se desplaza). */
  chrome: HTMLElement | null;
}

const num = (n: number) => (Math.round(n * 10) / 10).toLocaleString("es-ES");
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const clamp01 = (p: number) => Math.max(0, Math.min(1, p));

/** Pasos de la repetición y lo que queda fuera de la vista. */
export function replaySteps(events: EventView[], tiles: TileView[]): { steps: Step[]; hidden: number } {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const seen = (id: unknown) => !!byId.get(Number(id))?.visible;
  const marchas: Token[] = [];
  const fights: Step[] = [];
  const sieges: EventView[] = [];
  const back: Token[] = [];
  let hidden = 0;
  for (const e of events) {
    const d = e.datos as Record<string, any>;
    if (e.tipo === "movimiento" && (seen(d.from) || seen(d.to))) {
      marchas.push({ house: d.house, from: d.from, to: d.to, troops: d.troops });
    } else if (e.tipo === "combate") {
      if (!seen(d.tile)) {
        hidden++;
        continue;
      }
      for (const s of d.sides as { house: number | null; role: string; troops: number; from?: number[] }[]) {
        if (s.role !== "ataque" || s.house == null) continue;
        (s.from ?? []).forEach((f, i) => marchas.push({ house: s.house!, from: f, to: d.tile, troops: i === 0 ? s.troops : null }));
      }
      fights.push({ kind: "combate", event: e, tile: d.tile, start: 0, dur: 0 });
    } else if (e.tipo === "choque_frontal" && (seen(d.tiles[0]) || seen(d.tiles[1]) || (d.via != null && seen(d.via)))) {
      const sides = d.sides as { house: number }[];
      if (d.via != null) {
        // Se cruzan por el camino (bloque 4): los dos grupos llegan a la casilla de en medio y chocan allí.
        marchas.push({ house: sides[0]!.house, from: d.tiles[0], to: d.via, troops: null });
        marchas.push({ house: sides[1]!.house, from: d.tiles[1], to: d.via, troops: null });
      } else {
        marchas.push({ house: sides[0]!.house, from: d.tiles[0], to: d.tiles[1], troops: null, half: true });
        marchas.push({ house: sides[1]!.house, from: d.tiles[1], to: d.tiles[0], troops: null, half: true });
      }
      fights.unshift({ kind: "choque", event: e, tiles: [d.tiles[0], d.tiles[1]], ...(d.via != null ? { via: d.via } : {}), start: 0, dur: 0 });
    } else if (e.tipo === "rebote" && seen(d.tile)) {
      fights.push({ kind: "rebote", event: e, tile: d.tile, start: 0, dur: 0 });
    } else if (e.tipo === "asedio" && seen(d.tile)) {
      sieges.push(e);
    } else if (e.tipo === "repliegue" && (seen(d.from) || seen(d.to))) {
      back.push({ house: d.house, from: d.from, to: d.to, troops: d.troops });
    }
  }
  const steps: Step[] = [];
  let t = 0;
  const add = (s: Step) => {
    s.start = t;
    t += s.dur;
    steps.push(s);
  };
  if (marchas.length > 0) add({ kind: "marcha", tokens: marchas, start: 0, dur: 2400 });
  // Unos 20 segundos en total: con muchas batallas, cada una dura menos.
  const each = Math.max(1500, Math.min(2800, 13000 / Math.max(1, fights.length)));
  for (const f of fights) add({ ...f, dur: each } as Step);
  if (sieges.length > 0) add({ kind: "asedio", events: sieges, start: 0, dur: 1800 });
  if (back.length > 0) add({ kind: "repliegue", tokens: back, start: 0, dur: 1600 });
  if (steps.length > 0) add({ kind: "fin", start: 0, dur: 1800 });
  return { steps, hidden };
}

export function NightReplay({ geo, W, H, tiles, houses, events, seed, resolution, onFocus, onClose, chrome }: Props) {
  const { steps, hidden } = useMemo(() => replaySteps(events, tiles), [events, tiles]);
  const total = steps.reduce((a, s) => a + s.dur, 0);
  const [t, setT] = useState(0);
  const byId = useMemo(() => new Map(tiles.map((x) => [x.id, x])), [tiles]);
  const house = (id: number | null | undefined) => (id == null ? undefined : houses.find((h) => h.id === id));
  const color = (id: number | null | undefined) => {
    const h = house(id);
    return h ? (TERRITORY[h.color] ?? "#ccc") : "#d9d2c3";
  };

  // Reloj de la repetición.
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      setT(el);
      if (el < total) raf = requestAnimationFrame(tick);
      else onClose();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const current = steps.find((s) => t >= s.start && t < s.start + s.dur) ?? steps[steps.length - 1];
  const p = current ? clamp01((t - current.start) / current.dur) : 1;

  // La cámara se acerca a cada batalla.
  const focused = useRef<Step | null>(null);
  useEffect(() => {
    if (!current || focused.current === current) return;
    focused.current = current;
    const id = current.kind === "combate" || current.kind === "rebote" ? current.tile : current.kind === "choque" ? (current.via ?? current.tiles[0]) : null;
    const tile = id != null ? byId.get(id) : undefined;
    if (tile) onFocus(tile.x, tile.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  /** Momento en que cada casilla conquistada cambia de color (a mitad de su batalla). */
  const flips = useMemo(() => {
    const m = new Map<number, { at: number; from: number | null; to: number | null }>();
    for (const s of steps) {
      if (s.kind !== "combate") continue;
      const d = s.event.datos as Record<string, any>;
      if (d.conquered) m.set(s.tile, { at: s.start + s.dur * 0.55, from: d.previousOwner, to: d.winner });
    }
    return m;
  }, [steps]);

  const pos = (id: number) => {
    const tile = byId.get(id);
    return tile ? geo.center(tile.x, tile.y) : ([0, 0] as [number, number]);
  };
  const pct = ([x, y]: [number, number]) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const points = (id: number) => {
    const tile = byId.get(id)!;
    return geo.outline(tile.x, tile.y, 0).map(([x, y]) => `${x},${y}`).join(" ");
  };

  const tokens: (Token & { q: number })[] =
    current?.kind === "marcha" || current?.kind === "repliegue"
      ? current.tokens.map((k) => ({ ...k, q: ease(clamp01(p / 0.85)) * (k.half ? 0.45 : 1) }))
      : [];

  const caption = captionOf(current, p, { houses, tiles, seed, resolution, hidden });

  return (
    <div className="replay">
      <svg className="replay-marks" viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <defs>
          {[...flips.keys()].map((id) => {
            const tile = byId.get(id);
            if (!tile) return null;
            const [l, tp, w, h] = cellBox(geo, tile.x, tile.y);
            const f = flips.get(id)!;
            const q = clamp01((t - f.at) / 450);
            return (
              <clipPath key={id} id={`barrido-${id}`}>
                <rect x={l} y={tp} width={w * q} height={h} />
              </clipPath>
            );
          })}
        </defs>
        {/* Antes de su batalla, las casillas conquistadas llevan el color de su antiguo dueño. */}
        {[...flips.entries()].map(([id, f]) =>
          byId.get(id) ? (
            <g key={id}>
              <polygon points={points(id)} fill={color(f.from)} fillOpacity={t < f.at + 450 ? 0.45 : 0} />
              <polygon points={points(id)} fill={color(f.to)} fillOpacity={t < f.at + 600 ? 0.5 : 0.25} clipPath={`url(#barrido-${id})`} />
            </g>
          ) : null,
        )}
        {current && (current.kind === "combate" || current.kind === "rebote") && byId.get(current.tile) && (
          <polygon points={points(current.tile)} className="replay-focus" />
        )}
      </svg>
      <div className="replay-layer">
        {tokens.map((k, i) => {
          const [ax, ay] = pos(k.from);
          const [bx, by] = pos(k.to);
          const x = ax + (bx - ax) * k.q;
          const y = ay + (by - ay) * k.q;
          const h = house(k.house);
          return (
            <span key={i} className="replay-token" style={pct([x, y])}>
              {h && <ShieldIcon color={h.color} escudo={h.escudo} size={18} title="" />}
              {k.troops != null && <b>{k.troops}</b>}
            </span>
          );
        })}
        {current && (current.kind === "combate" || current.kind === "rebote" || current.kind === "choque") && (
          <Battle
            step={current}
            p={p}
            at={pct(
              current.kind === "choque"
                ? current.via != null
                  ? pos(current.via)
                  : midpoint(pos(current.tiles[0]), pos(current.tiles[1]))
                : pos(current.tile),
            )}
            houses={houses}
            events={events}
          />
        )}
        {current?.kind === "asedio" &&
          current.events.map((e) => {
            const d = e.datos as Record<string, any>;
            return (
              <span key={e.id} className="replay-siege" style={pct(pos(d.tile))}>
                <Icon name="tienda" size={22} color={color(d.house)} />
                <small>
                  {d.castle ? `Rodeado: noche ${d.nights}` : `Noche ${d.nights}`}
                  {!d.castle && (
                    <i className="hunger" aria-hidden>
                      <i style={{ width: `${Math.max(0, 100 - d.nights * 25)}%` }} />
                    </i>
                  )}
                </small>
              </span>
            );
          })}
      </div>
      {chrome &&
        createPortal(
          <>
            <div className="replay-caption" aria-live="polite">
              <FrayAbundio mood={current?.kind === "fin" ? "dormido" : current?.kind === "combate" ? "escandalizado" : "solemne"} size={40} />
              <p>{caption}</p>
            </div>
            <div className="replay-bar">
              <span>
                Noche {resolution}
                <i className="replay-progress" aria-hidden>
                  <i style={{ width: `${clamp01(t / Math.max(1, total)) * 100}%` }} />
                </i>
              </span>
              <button onClick={onClose}>Saltar</button>
            </div>
          </>,
          chrome,
        )}
    </div>
  );
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/** El recuadro de una batalla: cada bando con su fuerza y, al final, quién gana. */
function Battle({
  step,
  p,
  at,
  houses,
  events,
}: {
  step: Extract<Step, { kind: "combate" | "rebote" | "choque" }>;
  p: number;
  at: { left: string; top: string };
  houses: HouseInfo[];
  events: EventView[];
}) {
  const d = step.event.datos as Record<string, any>;
  const done = p > 0.55;
  type Side = { house: number | null; label: string; strength: number; troops?: number; supporters?: number[] };
  const sides: Side[] =
    step.kind === "combate"
      ? (d.sides as { house: number | null; role: string; strength: number; troops: number; supporters: number[] }[]).map((s) => ({
          house: s.house,
          label: s.role === "defensa" ? "Defensa" : "Ataque",
          strength: s.strength,
          troops: s.troops,
          supporters: s.supporters.filter((x) => x !== s.house),
        }))
      : step.kind === "choque"
        ? (d.sides as { house: number; strength: number }[]).map((s) => ({ house: s.house, label: "Choque", strength: s.strength }))
        : (d.houses as number[]).map((h) => ({ house: h, label: "Ataque", strength: d.strength }));
  const winner: number | null | undefined = step.kind === "rebote" ? undefined : d.winner;
  const loser = (s: Side) => done && (step.kind === "rebote" || s.house !== winner);
  const prisoner =
    step.kind === "combate" ? events.find((e) => e.tipo === "capitan_preso" && (e.datos as any).tile === step.tile) : undefined;
  const survivors = step.kind === "combate" ? (d.survivors as number) : null;
  return (
    <div className="replay-battle" style={at}>
      <span className="smoke" aria-hidden style={{ opacity: p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) * 4) }}>
        <Icon name="humo" size={34} color="#d9d2c3" />
        <Icon name="humo" size={26} color="#b7ae9c" />
      </span>
      <div className="battle-card">
        {sides.map((s, i) => {
          const h = s.house != null ? houses.find((x) => x.id === s.house) : undefined;
          // Bajas: quien defiende y pierde lo pierde todo; quien ataca y pierde se
          // repliega con la mitad; quien gana se queda con los supervivientes.
          const lost =
            !done || s.troops == null
              ? null
              : loser(s)
                ? s.label === "Defensa"
                  ? s.troops
                  : s.troops - Math.floor(s.troops / 2)
                : survivors != null
                  ? s.troops - survivors
                  : null;
          return (
            <div key={i} className={`battle-side ${loser(s) ? "lost" : done && s.house === winner ? "won" : ""}`}>
              {h ? <ShieldIcon color={h.color} escudo={h.escudo} size={16} title="" /> : <span className="neutral-dot" />}
              <span className="grow">
                {s.label}
                {s.troops != null && ` · ${s.troops}`}
                {(s.supporters?.length ?? 0) > 0 && ` + apoyo`}
              </span>
              <b>{num(s.strength)}</b>
              {lost != null && lost > 0 && <em className="fallen">−{lost}</em>}
            </div>
          );
        })}
        {done && (
          <div className="battle-result">
            {step.kind === "rebote"
              ? "Nadie entra"
              : step.kind === "choque"
                ? winner == null
                  ? "Ambos se repliegan"
                  : `Gana ${houseName(houses, winner)}`
                : d.conquered
                  ? `Cae: gana ${houseName(houses, winner)}${survivors != null ? ` (quedan ${survivors})` : ""}`
                  : `Resiste ${houseName(houses, winner)}`}
            {prisoner && (
              <span className="battle-prisoner">
                <Icon name="capitan" size={14} color="#d9d2c3" /> ¡{captainOf(houses, (prisoner.datos as any).house).split(",")[0]} cae preso!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function captionOf(
  step: Step | undefined,
  p: number,
  ctx: { houses: HouseInfo[]; tiles: TileView[]; seed: string; resolution: number; hidden: number },
): string {
  if (!step) return "";
  const tileName = (id: unknown) => ctx.tiles.find((t) => t.id === id)?.nombre ?? "una casilla";
  switch (step.kind) {
    case "marcha":
      return "Cae la noche y los ejércitos se ponen en marcha.";
    case "combate": {
      if (p < 0.55) return `Batalla en ${tileName(step.tile)}.`;
      const line = battleLine(step.event.datos, (id) => ctx.houses.find((h) => h.id === id)?.nombre, tileName(step.tile), `${ctx.seed}:${step.event.id}`);
      return line ?? describeEvent(step.event, ctx.houses, ctx.tiles) ?? "";
    }
    case "choque":
      if (step.via != null && p < 0.55) return `Dos ejércitos se cruzan por el camino en ${tileName(step.via)}.`;
      return p < 0.55 ? "Dos ejércitos se encuentran." : (describeEvent(step.event, ctx.houses, ctx.tiles) ?? "");
    case "rebote":
      return p < 0.55 ? "Dos ejércitos se encuentran." : (describeEvent(step.event, ctx.houses, ctx.tiles) ?? "");
    case "asedio": {
      const d = step.events[0]!.datos as Record<string, any>;
      return step.events.length === 1
        ? (d.castle ? `${houseName(ctx.houses, d.house)} rodea ${tileName(d.tile)}.` : `Asedio a ${tileName(d.tile)}: ${wallsLeft(d.nights)}.`)
        : `${step.events.length} asedios siguen en pie.`;
    }
    case "repliegue":
      return "Los derrotados vuelven a casa con la mitad de las tropas.";
    case "fin":
      return ctx.hidden > 0
        ? `Fin de la noche ${ctx.resolution}. Y ${ctx.hidden} ${ctx.hidden === 1 ? "batalla" : "batallas"} lejos de tu vista: la crónica las cuenta.`
        : `Fin de la noche ${ctx.resolution}. El cronista se retira a dormir.`;
  }
}
