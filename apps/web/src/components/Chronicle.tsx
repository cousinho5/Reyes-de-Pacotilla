// Bloque 11: la crónica del reino. Esta semana noche a noche (la última
// abierta, las demás plegadas con su número de sucesos), filtros «Todo»,
// «Solo lo mío» y «Batallas», y las semanas anteriores en «Ver toda la crónica».

import { useEffect, useState } from "react";
import { resolutionInfo } from "@reyes/engine";
import { api, type EventView, type GameState } from "../api";
import { byNight, chronicleFilter, type ChronicleFilter } from "../realm";
import { describeEvent } from "../ui";

const WEEKDAY = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const FILTERS: [ChronicleFilter, string][] = [
  ["todo", "Todo"],
  ["mio", "Solo lo mío"],
  ["batallas", "Batallas"],
];

export function Chronicle({ state }: { state: GameState }) {
  const days = state.partida.diasResolucion ?? [0, 1, 2, 3, 4, 5, 6];
  const per = days.length;
  const current = state.partida.resolucionActual;
  const lastWeek = Math.max(1, Math.ceil(Math.max(1, current) / per));
  const [week, setWeek] = useState(lastWeek);
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState<ChronicleFilter>("todo");
  const [loaded, setLoaded] = useState<{ key: string; events: EventView[] } | null>(null);
  const key = `${week}:${current}`;

  // Al llegar una noche nueva se vuelve a esta semana.
  useEffect(() => setWeek(lastWeek), [lastWeek]);
  useEffect(() => {
    let alive = true;
    api
      .chronicle(state.partida.id, week)
      .then((r) => alive && setLoaded({ key, events: r.eventos }))
      .catch(() => alive && setLoaded(null));
    return () => {
      alive = false;
    };
  }, [state.partida.id, key]);

  // Mientras llega (o sin conexión), lo de esta semana que ya trae el estado.
  const inWeek = (e: EventView) => Math.ceil((e.resolucion ?? current + 1) / per) === week;
  const events = loaded?.key === key ? loaded.events : (state.eventos ?? []).filter((e) => e.tipo !== "movimiento" && inWeek(e));
  const described = chronicleFilter(events, filter, state.yo.casa)
    .map((e) => ({ ...e, text: describeEvent(e, state.casas, state.casillas ?? []) }))
    .filter((e) => e.text);
  const nights = byNight(described);
  const label = (n: number | null) => {
    if (n == null) return "Sin noche";
    if (n > current) return "Hoy";
    return `Noche ${n} · ${WEEKDAY[resolutionInfo(n, days).weekday]}`;
  };

  return (
    <section className="card chronicle">
      <h2>Crónica del reino</h2>
      <p className="muted chronicle-week">{week === lastWeek ? `Esta semana (semana ${week})` : `Semana ${week}`}</p>
      <div className="chip-filters" role="radiogroup" aria-label="Qué sucesos">
        {FILTERS.map(([k, name]) => (
          <button key={k} role="radio" aria-checked={filter === k} className={filter === k ? "chosen" : ""} onClick={() => setFilter(k)}>
            {name}
          </button>
        ))}
      </div>
      {nights.length === 0 ? (
        <p className="muted">
          {events.length === 0 ? "Aún no ha pasado nada digno de mención. Fray Abundio bosteza." : "Nada de eso esta semana. Fray Abundio busca en sus notas."}
        </p>
      ) : (
        nights.map((g, i) => (
          <details key={`${week}:${g.night}`} className="night-group" open={i === 0}>
            <summary>
              <strong>{label(g.night)}</strong>
              <span className="muted">
                {g.events.length} {g.events.length === 1 ? "suceso" : "sucesos"}
              </span>
            </summary>
            <ul className="list">
              {g.events.map((e) => (
                <li key={e.id}>{e.text}</li>
              ))}
            </ul>
          </details>
        ))
      )}
      {lastWeek > 1 &&
        (all ? (
          <div className="chip-filters chronicle-weeks" role="tablist" aria-label="Semanas">
            {Array.from({ length: lastWeek }, (_, i) => lastWeek - i).map((w) => (
              <button key={w} role="tab" aria-selected={w === week} className={w === week ? "chosen" : ""} onClick={() => setWeek(w)}>
                {w === lastWeek ? "Esta semana" : `Semana ${w}`}
              </button>
            ))}
          </div>
        ) : (
          <button className="link" onClick={() => setAll(true)}>
            Ver toda la crónica ›
          </button>
        ))}
    </section>
  );
}
