import { useMemo } from "react";
import { resolveCampaign, type Order, type Tile } from "@reyes/engine";
import type { GameState, OrderView } from "../api";
import { describeEvent, formatWhen, troopsText } from "../ui";

interface Props {
  state: GameState;
  draft: OrderView[];
  setDraft: (o: OrderView[]) => void;
}

export function OrdersPanel({ state, draft, setDraft }: Props) {
  const tiles = state.casillas ?? [];
  const name = (id: number | null) => tiles.find((t) => t.id === id)?.nombre ?? "?";
  const open = !!state.partida.ordenesAbiertas;

  // Simular: el mismo motor que el servidor, con lo que esta casa ve.
  // Lo que no ves (tropas ocultas y órdenes ajenas) no entra en la previsión.
  const forecast = useMemo(() => {
    if (draft.length === 0) return [];
    const known: Tile[] = tiles.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      type: t.type,
      owner: t.owner,
      troops: t.troops ?? 0,
      ...(t.jinetes ? { jinetes: t.jinetes } : {}),
      ...(t.catapultas ? { catapultas: t.catapultas } : {}),
      fortifiedUntil: t.fortifiedUntil,
      castleOf: t.castleOf ?? null,
    }));
    const orders: Order[] = draft.map((o) =>
      o.tipo === "mover"
        ? { kind: "move", house: state.yo.casa, from: o.desde, to: o.hacia, troops: o.tropas, jinetes: o.jinetes, catapultas: o.catapultas }
        : {
            kind: "support",
            house: state.yo.casa,
            from: o.desde,
            target: o.hacia,
            supportedFrom: o.apoyaDesde,
            troops: o.tropas,
            jinetes: o.jinetes,
            catapultas: o.catapultas,
          },
    );
    const r = resolveCampaign({ resolution: (state.partida.resolucionActual ?? 0) + 1, tiles: known, orders });
    return r.events
      .filter((e) => e.type !== "movimiento")
      .map((e, i) => ({ i, text: describeEvent({ id: i, tipo: e.type, resolucion: null, datos: e as never }, state.casas, tiles) }))
      .filter((x): x is { i: number; text: string } => !!x.text);
  }, [draft, tiles, state]);

  return (
    <div>
      <section className="card">
        <h2>Órdenes para la resolución {state.partida.proximaResolucion ?? "—"}</h2>
        <p className="muted">
          Se cumplen todas a la vez el {formatWhen(state.partida.resolucion)}. Se guardan solas en cuanto las das y
          puedes quitarlas hasta el cierre ({formatWhen(state.partida.cierre)}). Nadie más las ve hasta entonces.
        </p>
        {draft.length === 0 ? (
          <p>Sin órdenes: tus tropas mantendrán sus posiciones. Para dar una, toca una casilla tuya en el mapa.</p>
        ) : (
          <ul className="list orders">
            {draft.map((o, i) => (
              <li key={i}>
                <span>
                  {o.tipo === "mover" ? (
                    <>
                      <strong>{troopsText(o.tropas, o.jinetes, o.catapultas)}</strong> de {name(o.desde)} → <strong>{name(o.hacia)}</strong>
                    </>
                  ) : (
                    <>
                      <strong>{troopsText(o.tropas, o.jinetes, o.catapultas)}</strong> de {name(o.desde)} apoyan{" "}
                      {o.apoyaDesde ? (
                        <>
                          el ataque de {name(o.apoyaDesde)} sobre <strong>{name(o.hacia)}</strong>
                        </>
                      ) : (
                        <>
                          la defensa de <strong>{name(o.hacia)}</strong>
                        </>
                      )}
                    </>
                  )}
                </span>
                {open && (
                  <button className="link" aria-label="Quitar orden" onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!open && <p className="error">Las órdenes están cerradas hasta la resolución.</p>}
      </section>

      {forecast.length > 0 && (
        <section className="card">
          <h2>Simulación</h2>
          <p className="muted">Con lo que ves ahora. Las órdenes de las demás casas son secretas y pueden cambiarlo todo.</p>
          <ul className="list">
            {forecast.map((f) => (
              <li key={f.i}>{f.text}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
