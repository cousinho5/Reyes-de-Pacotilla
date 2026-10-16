import { useState } from "react";
import type { GameState } from "../api";
import { HOUSE_COLORS, describeEvent } from "../ui";

export function Realm({ state }: { state: GameState }) {
  const [open, setOpen] = useState<number | null>(null);
  const events = (state.eventos ?? [])
    .map((e) => ({ e, text: describeEvent(e, state.casas, state.casillas ?? []) }))
    .filter((x) => x.text && x.e.tipo !== "movimiento");

  return (
    <div>
      <section className="card">
        <h2>Clasificación de Prestigio</h2>
        <ol className="ranking">
          {state.casas.map((h, i) => (
            <li key={h.id} className={h.id === state.yo.casa ? "me" : ""}>
              <button className="row-button" onClick={() => setOpen(open === h.id ? null : h.id)} aria-expanded={open === h.id}>
                <span className="rank">{i + 1}</span>
                <span className="swatch" style={{ background: HOUSE_COLORS[h.color]?.hex }} />
                <span className="grow">
                  <strong>{h.nombre}</strong>
                  {i === 0 && (h.prestigio?.total ?? 0) > (state.casas[1]?.prestigio?.total ?? 0) && (
                    <small> · favorito del cronista</small>
                  )}
                  {h.lema && (
                    <>
                      <br />
                      <small>«{h.lema}»</small>
                    </>
                  )}
                </span>
                <strong>{h.prestigio?.total ?? 0}</strong>
              </button>
              {open === h.id && h.prestigio && (
                <p className="breakdown">
                  Territorio {h.prestigio.territorio} · Edificios {h.prestigio.edificios} · Riqueza {h.prestigio.riqueza} · Comercio{" "}
                  {h.prestigio.comercio} · Logros {h.prestigio.logros}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="card chronicle">
        <h2>Crónica del reino</h2>
        {events.length === 0 ? (
          <p className="muted">Aún no ha pasado nada digno de mención. Fray Abundio bosteza.</p>
        ) : (
          <ul className="list">
            {events.map(({ e, text }) => (
              <li key={e.id}>
                {e.resolucion != null && <small className="muted">Resolución {e.resolucion} · </small>}
                {text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
