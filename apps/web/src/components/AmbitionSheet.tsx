// Bloque 13: al acabar el prólogo, si aún no has elegido objetivo secreto, esta
// hoja te pone delante las dos opciones y luego «Entrar en mi castillo». Se
// puede dejar para luego: la misma elección sigue en la pestaña Castillo.

import { useState } from "react";
import { api, type GameState } from "../api";
import { FrayAbundio } from "../art";

type Act = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;

/** Si hay que enseñar la hoja tras el prólogo. */
export const ambitionPending = (state: GameState) => {
  const obj = state.yo.objetivo;
  return !!obj && obj.puedeElegir && !obj.elegido && obj.opciones.some(Boolean);
};

export function AmbitionSheet({ state, act, onEnter, onLater }: { state: GameState; act: Act; onEnter: () => void; onLater: () => void }) {
  const options = (state.yo.objetivo?.opciones ?? []).filter(Boolean);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = async (clave: string) => {
    setBusy(true);
    await act(() => api.chooseObjective(state.partida.id, clave));
    setChosen(clave);
    setBusy(false);
  };
  return (
    <div className="cine-player ambition">
      <div className="cine-top">
        <h2>Tu ambición secreta</h2>
      </div>
      <div className="cine-caption">
        <span className="cine-fray">
          <FrayAbundio mood={chosen ? "adulador" : "solemne"} size={72} anim="habla" />
        </span>
        <p>{chosen ? "Anotado. El cronista no ha visto nada." : "Antes de entrar, elegid en secreto vuestra ambición."}</p>
        <small>Nadie más la sabrá. Si la cumplís al final de la partida, +6 de Prestigio.</small>
      </div>
      <ul className="ambition-options">
        {options.map((o) => (
          <li key={o.clave}>
            <button
              className={chosen === o.clave ? "on" : chosen ? "off" : undefined}
              aria-pressed={chosen === o.clave}
              disabled={busy}
              onClick={() => choose(o.clave)}
            >
              {o.texto}
            </button>
          </li>
        ))}
      </ul>
      <div className="ambition-actions">
        {chosen ? (
          <button className="cine-done" onClick={onEnter} autoFocus>
            Entrar en mi castillo
          </button>
        ) : (
          <button className="link" onClick={onLater}>
            Elegir más tarde (en Castillo)
          </button>
        )}
      </div>
    </div>
  );
}
