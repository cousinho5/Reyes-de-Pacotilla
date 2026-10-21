import { Icon, ResourceIcon } from "../art";
import { useState } from "react";
import { BUILDINGS, FORTIFY_UPKEEP, RESOURCES, UNIT_KINDS, canAfford, recruitCost as costOf, upgradeCost, unitsOf, type Resource, type Resources, type UnitKind } from "@reyes/engine";
import { api, type GameState } from "../api";
import { BUILDING_LABEL, RESOURCE_LABEL, UNIT_LABEL, UNIT_NOTE, UNIT_ONE, houseName } from "../ui";
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
  // Bloque 1: también se recluta en las aldeas propias.
  const villages = (state.casillas ?? []).filter((t) => t.type === "aldea" && t.owner === state.yo.casa);
  const [siteId, setSiteId] = useState<number | null>(null);
  const site = villages.find((t) => t.id === siteId) ?? null;
  const active = state.partida.estado === "active";
  const forts = (state.casillas ?? []).filter(
    (t) => t.owner === state.yo.casa && t.fortifiedUntil != null && t.fortifiedUntil > state.partida.resolucionActual,
  ).length;
  const maxRecruit = Math.max(
    1,
    Math.min(50, ...(Object.entries(one) as [Resource, number][]).map(([r, v]) => Math.floor(res[r] / v))),
  );
  const count = Math.min(recruit, maxRecruit);
  const recruitCost: Partial<Resources> = costOf(count, kind);
  const where = site ?? myCastle;
  const garrison = where && where.troops != null ? unitsOf({ ...where, troops: where.troops }) : null;
  const place = site ? `en ${site.nombre}` : "en el castillo";

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
          {forts > 0 && (FORTIFY_UPKEEP.piedra ?? 0) > 0 && (
            <>
              {" "}
              Y {forts * (FORTIFY_UPKEEP.piedra ?? 0)} de Piedra por {forts === 1 ? "tu casilla fortificada" : `tus ${forts} casillas fortificadas`}: si no llega, se desmantelan las que no se puedan pagar.
            </>
          )}
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
        {villages.length > 0 && (
          <div className="unit-picker" role="radiogroup" aria-label="Dónde reclutar">
            {[null, ...villages].map((v) => (
              <button
                key={v?.id ?? "castillo"}
                role="radio"
                aria-checked={(v?.id ?? null) === (site?.id ?? null)}
                className={(v?.id ?? null) === (site?.id ?? null) ? "chosen" : ""}
                onClick={() => setSiteId(v?.id ?? null)}
              >
                {v ? v.nombre : "Castillo"}
              </button>
            ))}
          </div>
        )}
        <p className="muted">
          Las tropas aparecen {site ? `en tu aldea, ${site.nombre}` : "en tu castillo"}
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
              () => api.recruit(gameId, count, kind, site?.id),
              kind === "mesnada"
                ? `${count} ${count === 1 ? "soldado se presenta" : "soldados se presentan"} ${place}.`
                : kind === "jinetes"
                  ? `${count} ${count === 1 ? "jinete llega" : "jinetes llegan"} ${site ? `a ${site.nombre}` : "al castillo"}.`
                  : `${count} ${count === 1 ? "catapulta llega" : "catapultas llegan"} ${site ? `a ${site.nombre}` : "al castillo"}, crujiendo.`,
            )
          }
        >
          Reclutar
        </button>
      </section>

      <CaptainCard state={state} gameId={gameId} act={act} />

      <HouseSettings state={state} act={act} />
    </div>
  );
}

/** Tu Capitán (dónde está o de quién es preso) y los Capitanes que tienes presos. */
function CaptainCard({ state, gameId, act }: Props) {
  const me = state.casas.find((h) => h.id === state.yo.casa);
  if (!me?.capitan) return null;
  const where = state.casillas?.find((t) => t.capitanes?.includes(me.id));
  const prisoners = state.casas.filter((h) => h.capitan?.presoDe === me.id);
  return (
    <section className="card">
      <h2>
        <Icon name="capitan" size={20} color="#d6a64b" /> {me.capitan.nombre}
      </h2>
      {me.capitan.presoDe != null ? (
        <p>
          Preso de {houseName(state.casas, me.capitan.presoDe)}. Se escapará en la resolución {me.capitan.libreEn}, salvo que te lo
          devuelvan antes: puedes ofrecer un rescate en el Comercio.
        </p>
      ) : (
        <p>
          Está en {where?.nombre ?? "tu castillo"}. Suma 2 de fuerza al grupo con el que va (lo eliges al dar una orden desde su
          casilla) y a la defensa de la casilla donde está. Si su grupo pierde contra otra casa, cae preso.
        </p>
      )}
      {prisoners.length > 0 && (
        <>
          <h3>Tus presos</h3>
          <ul className="list">
            {prisoners.map((h) => (
              <li key={h.id}>
                <span>
                  {h.capitan!.nombre}, de {h.nombre} (se escapa en la resolución {h.capitan!.libreEn})
                </span>
                <button className="link" onClick={() => act(() => api.releaseCaptain(gameId, h.id), `${h.capitan!.nombre} vuelve a casa.`)}>
                  Soltar
                </button>
              </li>
            ))}
          </ul>
          <p className="hint">Cobra el rescate en el Comercio antes de soltarlo: Fray Abundio no se fía de nadie.</p>
        </>
      )}
    </section>
  );
}
