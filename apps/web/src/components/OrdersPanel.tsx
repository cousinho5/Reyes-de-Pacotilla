import { useMemo } from "react";
import { ANY_ORIGIN, crossingRisks } from "@reyes/engine";
import type { GameState, OrderView } from "../api";
import { describeEvent, formatWhen, houseName, nightLabel, troopsText, withArticle } from "../ui";
import { nextResolution, nightOf, project, queueNights, toOrder } from "../plan";

interface Props {
  state: GameState;
  draft: OrderView[];
  setDraft: (o: OrderView[]) => void;
  /** Ir al mapa a planear esa noche de la cola. */
  onPlan: (night: number) => void;
}

export function OrdersPanel({ state, draft, setDraft, onPlan }: Props) {
  const tiles = state.casillas ?? [];
  const name = (id: number | null) => tiles.find((t) => t.id === id)?.nombre ?? "?";
  const open = !!state.partida.ordenesAbiertas;
  const next = nextResolution(state);
  const nights = open ? queueNights(state) : 1;

  // Simular varias noches: el mismo motor que el servidor, con lo que esta casa ve.
  // Lo que no ves (tropas ocultas y órdenes ajenas) no entra en la previsión.
  const forecast = useMemo(() => {
    if (draft.length === 0) return [];
    const { nights: planned, maps } = project(state, draft);
    return planned.map((p, k) =>
      p.events
        .filter((e) => e.type !== "movimiento")
        .map((e, i) => ({ i, text: describeEvent({ id: i, tipo: e.type, resolucion: null, datos: e as never }, state.casas, maps[k] ?? tiles) }))
        .filter((x): x is { i: number; text: string } => !!x.text),
    );
  }, [draft, tiles, state]);

  const remove = (o: OrderView) => setDraft(draft.filter((x) => x !== o));

  // Cruces por el camino (bloque 4): marchas de esta noche que un enemigo a la vista podría cruzar.
  const crossings = useMemo(() => {
    const me = state.yo.casa;
    if (me == null) return new Map<OrderView, number[]>();
    const tonight = draft.filter((o) => nightOf(o, next) === next);
    const risks = crossingRisks(tiles, me, tonight.map((o) => toOrder(o, me)));
    return new Map(risks.map((r) => [tonight[r.order]!, r.by]));
  }, [draft, tiles, state.yo.casa, next]);

  return (
    <div>
      <section className="card">
        <h2>Órdenes para la resolución {state.partida.proximaResolucion ?? "—"}</h2>
        <p className="muted">
          Se cumplen todas a la vez el {formatWhen(state.partida.resolucion)}. Se guardan solas en cuanto las das y
          puedes quitarlas hasta el cierre ({formatWhen(state.partida.cierre)}). Nadie más las ve hasta entonces.
        </p>
        {nights > 1 && (
          <p className="muted">
            También puedes dejar órdenes en cola para las {nights - 1 === 1 ? "siguiente noche" : `${nights - 1} noches siguientes`}: elige la
            noche encima del mapa. Al llegar su noche, cada una sale con las tropas que queden.
          </p>
        )}
        {Array.from({ length: nights }, (_, k) => {
          const list = draft.filter((o) => nightOf(o, next) === next + k);
          if (k > 0 && list.length === 0) return null;
          return (
            <div key={k} className="night-orders">
              {nights > 1 && (
                <h3>
                  {k === 0 ? `Próxima: ${nightLabel(state.partida, 0)}` : `En cola: ${nightLabel(state.partida, k)}`}
                  {open && (
                    <button className="link" onClick={() => onPlan(k)}>
                      Ver en el mapa
                    </button>
                  )}
                </h3>
              )}
              {list.length === 0 ? (
                <p>Sin órdenes: tus tropas mantendrán sus posiciones. Para dar una, toca una casilla tuya en el mapa.</p>
              ) : (
                <ul className="list orders">
                  {list.map((o, i) => (
                    <li key={i}>
                      <span>
                        <OrderText o={o} name={name} />
                        {crossings.has(o) && (
                          <small className="order-warning">
                            Por el camino puede salirle al paso {withArticle(houseName(state.casas, crossings.get(o)![0]!))}: chocaríais de frente.
                          </small>
                        )}
                      </span>
                      {open && (
                        <button className="link" aria-label="Quitar orden" onClick={() => remove(o)}>
                          Quitar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {!open && <p className="error">Las órdenes están cerradas hasta la resolución.</p>}
      </section>

      {forecast.some((f) => f.length > 0) && (
        <section className="card">
          <h2>Simulación</h2>
          <p className="muted">Con lo que ves ahora. Las órdenes de las demás casas son secretas y pueden cambiarlo todo.</p>
          {forecast.map((lines, k) =>
            lines.length === 0 ? null : (
              <div key={k}>
                {forecast.length > 1 && <h3>{nightLabel(state.partida, k)}</h3>}
                <ul className="list">
                  {lines.map((f) => (
                    <li key={f.i}>{f.text}</li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </section>
      )}
    </div>
  );
}

function OrderText({ o, name }: { o: OrderView; name: (id: number | null) => string }) {
  const n = <strong>{troopsText(o.tropas, o.jinetes, o.catapultas)}</strong>;
  if (o.tipo === "sitiar")
    return (
      <>
        {n} de {name(o.desde)} sitian <strong>{name(o.hacia)}</strong>
      </>
    );
  if (o.tipo === "mover" && o.tropas === 0 && o.capitan)
    return (
      <>
        Tu <strong>Capitán</strong> va solo de {name(o.desde)} a <strong>{name(o.hacia)}</strong>
      </>
    );
  if (o.tipo === "mover")
    return (
      <>
        {n} de {name(o.desde)} → <strong>{name(o.hacia)}</strong>
        {o.capitan && " (con el Capitán)"}
      </>
    );
  return (
    <>
      {n} de {name(o.desde)} apoyan{" "}
      {o.apoyaDesde === ANY_ORIGIN ? (
        <>
          el primer ataque sobre <strong>{name(o.hacia)}</strong>
        </>
      ) : o.apoyaDesde ? (
        <>
          el ataque de {name(o.apoyaDesde)} sobre <strong>{name(o.hacia)}</strong>
        </>
      ) : (
        <>
          la defensa de <strong>{name(o.hacia)}</strong>
        </>
      )}
    </>
  );
}
