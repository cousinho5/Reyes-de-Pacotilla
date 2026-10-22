import { useState } from "react";
import { ResourceIcon } from "../art";
import { api, type CrownGood, type GameState } from "../api";
import { RESOURCE_LABEL } from "../ui";

const GOODS: CrownGood[] = ["pan", "madera", "piedra", "hierro"];

/** Frases de la compra (banco de frases, 11.12). */
const BOUGHT = [
  "{n} de {recurso} por {oro} de Oro. El recaudador real lo cuenta dos veces.",
  "La Corona te vende {n} de {recurso} por {oro} de Oro. Sin regatear: la Corona no regatea.",
  "{n} de {recurso} de los almacenes reales. {oro} de Oro menos y un recibo con sello.",
];

const price = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Cambio con la Corona (bloque 5): la Corona vende Pan, Madera, Piedra y Hierro
 * por Oro. Cada unidad comprada encarece la siguiente, así que el total se pide
 * al servidor antes de comprar.
 */
export function CrownPanel({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const corona = state.corona;
  const [units, setUnits] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, { n: number; oro: number } | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  if (!corona) return null;
  const gameId = state.partida.id;
  const oro = state.yo.recursos?.oro ?? 0;

  const ask = async (r: CrownGood) => {
    const n = Number(units[r]);
    if (!Number.isInteger(n) || n < 1) return;
    setError(null);
    try {
      const q = await api.crownQuote(gameId, r, n);
      setQuotes((x) => ({ ...x, [r]: { n, oro: q.oro } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const buy = (r: CrownGood, q: { n: number; oro: number }) => {
    const line = BOUGHT[Math.floor(Math.random() * BOUGHT.length)]!
      .replace("{n}", String(q.n))
      .replace("{recurso}", RESOURCE_LABEL[r])
      .replace("{oro}", String(q.oro));
    setQuotes((x) => ({ ...x, [r]: undefined }));
    setUnits((x) => ({ ...x, [r]: "" }));
    return act(() => api.crownBuy(gameId, r, q.n, q.oro), line);
  };

  return (
    <section className="card crown">
      <h2>Cambio con la Corona</h2>
      <p className="muted">
        La Corona vende por Oro, más caro que un buen trato. El precio sube cuando escasea en el reino y con cada unidad que le
        compran, también dentro de la misma compra. Tienes {oro} de Oro.
      </p>
      <ul className="list">
        {GOODS.map((r) => {
          const q = quotes[r];
          return (
            <li key={r} className="lot">
              <div className="grow">
                <strong>
                  <ResourceIcon r={r} size={14} /> {RESOURCE_LABEL[r]}
                </strong>
                <br />
                <small>1 a {price(corona.precios[r])} de Oro</small>
              </div>
              <form
                className="inline bid"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q && q.n === Number(units[r])) void buy(r, q);
                  else void ask(r);
                }}
              >
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label={`Unidades de ${RESOURCE_LABEL[r]}`}
                  placeholder="Nº"
                  value={units[r] ?? ""}
                  onChange={(e) => {
                    setUnits({ ...units, [r]: e.target.value });
                    setQuotes((x) => ({ ...x, [r]: undefined }));
                  }}
                />
                <button type="submit" disabled={!units[r] || (q != null && q.oro > oro)}>
                  {q ? `Comprar por ${q.oro}` : "Ver precio"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
      {error && <p className="hint">{error}</p>}
    </section>
  );
}
