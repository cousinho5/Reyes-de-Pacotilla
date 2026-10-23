// Bloque 11: la carrera por el Prestigio. Una línea por casa en su esmalte, un
// punto por domingo (y «Hoy» mientras se juega), tu línea gruesa y el primero
// con un aro de latón. Al tocar una semana salen las cifras de cada casa.

import { useState } from "react";
import type { GameState } from "../api";
import { racePoints } from "../realm";
import { HOUSE_COLORS } from "../ui";

const W = 340;
const H = 170;
const PAD = { l: 30, r: 14, t: 12, b: 24 };

export function PrestigeChart({ state }: { state: GameState }) {
  const points = racePoints(state);
  const [picked, setPicked] = useState<number | null>(null);
  const me = state.yo.casa;

  if (points.length === 0) {
    return (
      <section className="card">
        <h2>La carrera</h2>
        <p className="muted">La gráfica empieza a dibujarse tras la primera noche. Fray Abundio ya ha comprado tinta.</p>
      </section>
    );
  }

  const max = Math.max(10, ...points.flatMap((p) => Object.values(p.totals)));
  const step = Math.ceil(max / 4 / 5) * 5;
  const top = step * 4;
  const x = (i: number) => (points.length === 1 ? (PAD.l + W - PAD.r) / 2 : PAD.l + (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (v: number) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b);
  const last = points[points.length - 1]!;
  const leader = state.casas.reduce((a, b) => ((last.totals[b.id] ?? 0) > (last.totals[a.id] ?? 0) ? b : a), state.casas[0]!);
  // Tu línea, la última: encima de las demás.
  const houses = [...state.casas].sort((a, b) => (a.id === me ? 1 : b.id === me ? -1 : 0));
  const shown = picked != null ? points[picked] : null;

  return (
    <section className="card race">
      <h2>La carrera</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="race-chart" role="img" aria-label="Prestigio de cada casa por semana">
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(k * step)} y2={y(k * step)} className="race-grid" />
            <text x={PAD.l - 6} y={y(k * step) + 4} className="race-axis" textAnchor="end">
              {k * step}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={p.label} x={x(i)} y={H - 6} className={`race-axis${picked === i ? " picked" : ""}`} textAnchor="middle">
            {p.label}
          </text>
        ))}
        {picked != null && <line x1={x(picked)} x2={x(picked)} y1={PAD.t} y2={H - PAD.b} className="race-cursor" />}
        {houses.map((h) => {
          const hex = HOUSE_COLORS[h.color]?.hex ?? "#666";
          const pts = points.map((p, i) => [x(i), y(p.totals[h.id] ?? 0)] as const);
          const mine = h.id === me;
          return (
            <g key={h.id}>
              <polyline
                points={pts.map(([a, b]) => `${a},${b}`).join(" ")}
                fill="none"
                stroke={hex}
                strokeWidth={mine ? 4 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={mine || h.id === leader.id ? 1 : 0.75}
              />
              {pts.map(([a, b], i) => (
                <circle key={i} cx={a} cy={b} r={mine ? 3.5 : 2.5} fill={hex} />
              ))}
              {h.id === leader.id && <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={7} className="race-leader" />}
            </g>
          );
        })}
        {/* Zonas que se tocan: una por punto, toda la altura. */}
        {points.map((p, i) => (
          <rect
            key={p.label}
            x={x(i) - (W - PAD.l - PAD.r) / Math.max(1, points.length - 1) / 2}
            y={0}
            width={(W - PAD.l - PAD.r) / Math.max(1, points.length - 1)}
            height={H}
            fill="transparent"
            onClick={() => setPicked(picked === i ? null : i)}
          >
            <title>{p.label}</title>
          </rect>
        ))}
      </svg>
      {shown ? (
        <ol className="race-picked" aria-live="polite">
          {[...state.casas]
            .sort((a, b) => (shown.totals[b.id] ?? 0) - (shown.totals[a.id] ?? 0))
            .map((h) => (
              <li key={h.id} className={h.id === me ? "me" : ""}>
                <span className="mention-dot" style={{ background: HOUSE_COLORS[h.color]?.hex ?? "#666" }} aria-hidden="true" />
                {h.nombre} <strong>{shown.totals[h.id] ?? 0}</strong>
              </li>
            ))}
        </ol>
      ) : (
        <p className="muted race-hint">Toca una semana para ver las cifras. Tu línea es la gruesa; el aro marca al primero.</p>
      )}
    </section>
  );
}
