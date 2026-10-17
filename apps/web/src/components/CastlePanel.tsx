import { ResourceIcon } from "../art";
import { useState } from "react";
import { BUILDINGS, RESOURCES, UNIT_KINDS, canAfford, recruitCost as costOf, upgradeCost, unitsOf, type Resource, type Resources, type UnitKind } from "@reyes/engine";
import { api, type GameState } from "../api";
import { BUILDING_LABEL, RESOURCE_LABEL, UNIT_LABEL, UNIT_NOTE, UNIT_ONE } from "../ui";
import { CardsPanel } from "./CardsPanel";
import { HouseSettings } from "./HouseSettings";

interface Props {
  state: GameState;
  gameId: number;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

function Cost({ cost }: { cost: Partial<Resources> }) {
  return (
    <>
      {RESOURCES.filter((r) => cost[r]).map((r) => (
        <span key={r} className={`res res-${r}`}>
          <ResourceIcon r={r} size={14} /> {cost[r]} <span className="sr-only">{RESOURCE_LABEL[r]}</span>
        </span>
      ))}
    </>
  );
}

export function CastlePanel({ state, gameId, act }: Props) {
  const res = state.yo.recursos!;
  const prod = state.yo.produccionDiaria!;
  const levels = state.yo.edificios!;
  const [recruit, setRecruit] = useState(5);
  const [kind, setKind] = useState<UnitKind>("mesnada");
  const one = costOf(1, kind);
  const myCastle = state.casillas?.find((t) => t.type === "castillo" && t.owner === state.yo.casa);
  const active = state.partida.estado === "active";
  const maxRecruit = Math.max(
    1,
    Math.min(50, ...(Object.entries(one) as [Resource, number][]).map(([r, v]) => Math.floor(res[r] / v))),
  );
  const count = Math.min(recruit, maxRecruit);
  const recruitCost: Partial<Resources> = costOf(count, kind);
  const garrison = myCastle && myCastle.troops != null ? unitsOf({ ...myCastle, troops: myCastle.troops }) : null;

  return (
    <div>
      <section className="card">
        <h2>Tesoro</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Tienes</th>
              <th>Al día</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) => (
              <tr key={r}>
                <td>
                  <ResourceIcon r={r} size={16} />{" "}
                  {RESOURCE_LABEL[r]}
                </td>
                <td>{res[r]}</td>
                <td>+{prod[r]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          El domingo pagarás {state.yo.mantenimientoSemanal} de Pan de mantenimiento. Si no llega, desertan tropas.
        </p>
        {state.yo.ayudaAlUltimo && (
          <p className="note">La Corona te ayuda esta semana: +3 de {RESOURCE_LABEL[state.yo.ayudaAlUltimo]} al día.</p>
        )}
        <label>
          Si algún domingo vas último, la Corona te ayudará con:
          <select
            value={state.yo.recursoAyuda ?? "pan"}
            onChange={(e) => act(() => api.setHelp(gameId, e.target.value as Resource), "Preferencia guardada.")}
          >
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {RESOURCE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <CardsPanel state={state} act={act} />

      <section className="card">
        <h2>Edificios</h2>
        <ul className="list buildings">
          {BUILDINGS.map((b) => {
            const level = levels[b];
            const cost = upgradeCost(level);
            const affordable = cost ? canAfford(res, cost) : false;
            return (
              <li key={b}>
                <div>
                  <strong>{BUILDING_LABEL[b]}</strong> · nivel {level}
                  <br />
                  {cost ? (
                    <small>
                      Subir a {level + 1}: <Cost cost={cost} />
                    </small>
                  ) : (
                    <small>Nivel máximo. Una obra maestra.</small>
                  )}
                </div>
                {cost && (
                  <button
                    disabled={!affordable || !active}
                    onClick={() => act(() => api.upgrade(gameId, b), `${BUILDING_LABEL[b]} sube a nivel ${level + 1}. Las obras han terminado a tiempo, cosa nunca vista.`)}
                  >
                    Mejorar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2>Reclutar</h2>
        <p className="muted">
          Las tropas aparecen en tu castillo
          {garrison
            ? ` (ahora: ${garrison.mesnada} de Mesnada, ${garrison.jinetes} ${garrison.jinetes === 1 ? "jinete" : "jinetes"} y ${garrison.catapultas} ${garrison.catapultas === 1 ? "catapulta" : "catapultas"}).`
            : "."}
        </p>
        <div className="unit-picker" role="radiogroup" aria-label="Tipo de tropa">
          {UNIT_KINDS.map((k) => (
            <button key={k} role="radio" aria-checked={kind === k} className={kind === k ? "chosen" : ""} onClick={() => setKind(k)}>
              {UNIT_LABEL[k]}
            </button>
          ))}
        </div>
        <p className="muted unit-note">
          {UNIT_NOTE[kind]} Cada {UNIT_ONE[kind]}: <Cost cost={one} />
        </p>
        <label>
          {UNIT_LABEL[kind]}: <strong>{count}</strong>
          <input type="range" min={1} max={maxRecruit} value={count} onChange={(e) => setRecruit(Number(e.target.value))} />
        </label>
        <p>
          Coste: <Cost cost={recruitCost} />
        </p>
        <button
          className="primary"
          disabled={!canAfford(res, recruitCost) || !active}
          onClick={() =>
            act(
              () => api.recruit(gameId, count, kind),
              kind === "mesnada"
                ? `${count} ${count === 1 ? "soldado se presenta" : "soldados se presentan"} en el castillo.`
                : kind === "jinetes"
                  ? `${count} ${count === 1 ? "jinete llega" : "jinetes llegan"} al castillo.`
                  : `${count} ${count === 1 ? "catapulta llega" : "catapultas llegan"} al castillo, crujiendo.`,
            )
          }
        >
          Reclutar
        </button>
      </section>

      <HouseSettings state={state} act={act} />
    </div>
  );
}
