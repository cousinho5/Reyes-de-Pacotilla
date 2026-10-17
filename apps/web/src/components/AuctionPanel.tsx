import { useState } from "react";
import { api, type GameState } from "../api";
import { formatWhen, houseName } from "../ui";

/** Gran Subasta del miércoles: tres lotes y pujas ciegas en Oro. */
export function AuctionPanel({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const a = state.subasta;
  const [bids, setBids] = useState<Record<number, string>>({});
  if (!a) {
    return (
      <section className="card">
        <h2>Gran Subasta</h2>
        <p className="muted">Los lotes de la semana se anuncian el martes a las 22:00.</p>
      </section>
    );
  }
  const oro = state.yo.recursos?.oro ?? 0;
  return (
    <section className="card auction">
      <h2>Gran Subasta · semana {a.semana}</h2>
      {a.abierta ? (
        <p className="muted">
          Pujas ciegas en Oro hasta el {formatWhen(state.partida.cierre)}. Gana la más alta (en empate, la primera) y el Oro
          pagado desaparece. Cada lote ganado da +2 de Prestigio, hasta 3 veces.
        </p>
      ) : (
        <p className="muted">Subasta cerrada. Resultado:</p>
      )}
      <ul className="list">
        {a.lotes.map((l) => {
          const value = bids[l.lote] ?? (l.miPuja != null ? String(l.miPuja) : "");
          return (
            <li key={l.lote} className="lot">
              <div className="grow">
                <strong>{l.carta ? `Carta: ${l.carta.nombre}` : l.nombre}</strong>
                {l.carta && (
                  <>
                    <br />
                    <small>{l.carta.texto}</small>
                  </>
                )}
                {!a.abierta && (
                  <>
                    <br />
                    <small>
                      {l.ganador != null ? `Para ${houseName(state.casas, l.ganador)} por ${l.precio} de Oro.` : "Nadie pujó."}
                    </small>
                  </>
                )}
                {a.abierta && l.miPuja != null && (
                  <>
                    <br />
                    <small>Tu puja: {l.miPuja} de Oro</small>
                  </>
                )}
              </div>
              {a.abierta && (
                <form
                  className="inline bid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(value);
                    act(() => api.bid(state.partida.id, l.lote, n), n === 0 ? "Puja retirada." : "Puja sellada. Nadie sabe cuánto.");
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    max={oro}
                    inputMode="numeric"
                    aria-label={`Puja por el lote ${l.lote}`}
                    placeholder="Oro"
                    value={value}
                    onChange={(e) => setBids({ ...bids, [l.lote]: e.target.value })}
                  />
                  <button type="submit">{l.miPuja != null ? "Cambiar" : "Pujar"}</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {a.abierta && <p className="hint">Para retirar una puja, pon 0. Tienes {oro} de Oro.</p>}
    </section>
  );
}
