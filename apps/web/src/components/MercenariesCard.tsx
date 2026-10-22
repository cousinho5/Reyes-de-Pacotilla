import { useState } from "react";
import { api, type GameState } from "../api";
import { formatDay } from "../ui";

/** Frases al contratar (banco de frases, 11.13). */
const HIRED = [
  "{n} mercenarios se presentan en el castillo. Cobran por adelantado y no preguntan contra quién.",
  "{n} espadas de alquiler para siete días. El cronista no sabe sus nombres, y ellos prefieren que siga así.",
  "Llegan {n} mercenarios. Comen de la Corona, luchan por tu Oro y se irán sin despedirse.",
];

/**
 * Mercenarios de alquiler (bloque 5), junto a Reclutar: Oro por tropa, aparecen
 * en el castillo como Mesnada, no comen Pan y se van solos a los 7 días.
 */
export function MercenariesCard({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const m = state.mercenarios;
  const [want, setWant] = useState(3);
  if (!m) return null;
  const oro = state.yo.recursos?.oro ?? 0;
  const max = Math.max(1, Math.min(50, Math.floor(oro / m.precio)));
  const n = Math.min(want, max);
  const cost = n * m.precio;
  const active = state.partida.estado === "active";
  const total = m.grupos.reduce((a, g) => a + g.unidades, 0);
  return (
    <section className="card">
      <h2>Mercenarios</h2>
      <p className="muted">
        {m.precio} de Oro por tropa. Aparecen en tu castillo como Mesnada, no comen Pan y se van solos a los {m.dias} días, estén
        donde estén.
      </p>
      {total > 0 && (
        <ul className="list">
          {m.grupos.map((g, i) => (
            <li key={i}>
              {g.unidades} {g.unidades === 1 ? "mercenario se va" : "mercenarios se van"} el {formatDay(g.seVan)}, al amanecer.
            </li>
          ))}
        </ul>
      )}
      <label>
        Mercenarios: <strong>{n}</strong>
        <input type="range" min={1} max={max} value={n} onChange={(e) => setWant(Number(e.target.value))} />
      </label>
      <p>Coste: {cost} de Oro (tienes {oro}).</p>
      <button
        className="primary"
        disabled={!active || cost > oro}
        onClick={() => act(() => api.hireMercenaries(state.partida.id, n), HIRED[Math.floor(Math.random() * HIRED.length)]!.replace("{n}", String(n)))}
      >
        Contratar
      </button>
    </section>
  );
}
