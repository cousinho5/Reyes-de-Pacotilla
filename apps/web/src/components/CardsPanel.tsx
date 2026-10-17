import { useState } from "react";
import { BUILDINGS, RESOURCES, type BuildingKind, type Resource } from "@reyes/engine";
import { api, type CardInfo, type CardParamsInput, type GameState } from "../api";
import { BUILDING_LABEL, RESOURCE_LABEL } from "../ui";

/** Cartas de la Corona sin usar. */
export function CardsPanel({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const cards = state.cartas ?? [];
  if (cards.length === 0) return null;
  return (
    <section className="card">
      <h2>Cartas de la Corona</h2>
      <ul className="list">
        {cards.map((c) => (
          <CardRow key={c.id} card={c} state={state} act={act} />
        ))}
      </ul>
    </section>
  );
}

function CardRow({
  card,
  state,
  act,
}: {
  card: CardInfo;
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const me = state.yo.casa;
  const ownTiles = (state.casillas ?? []).filter((t) => t.owner === me && t.type !== "castillo");
  const rivals = state.casas.filter((h) => h.id !== me);
  const levels = state.yo.edificios!;
  const [params, setParams] = useState<CardParamsInput>(() => ({
    casa: rivals[0]?.id,
    casilla: ownTiles[0]?.id,
    edificio: BUILDINGS.find((b) => levels[b] <= 3),
    da: "oro",
    recibe: "hierro",
  }));
  const active = state.partida.estado === "active";
  const needs = card.objetivo;
  const blocked = (needs === "casilla_propia" && ownTiles.length === 0) || (needs === "edificio" && !params.edificio);

  return (
    <li className="card-row">
      <div>
        <strong>{card.nombre}</strong>
        <br />
        <small>{card.texto}</small>
      </div>
      {active && (
        <div className="actions">
          {needs === "casa" && (
            <select aria-label="Casa" value={params.casa} onChange={(e) => setParams({ ...params, casa: Number(e.target.value) })}>
              {rivals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre}
                </option>
              ))}
            </select>
          )}
          {needs === "casilla_propia" &&
            (ownTiles.length === 0 ? (
              <small className="muted">Necesitas alguna casilla además del castillo.</small>
            ) : (
              <select aria-label="Casilla" value={params.casilla} onChange={(e) => setParams({ ...params, casilla: Number(e.target.value) })}>
                {ownTiles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            ))}
          {needs === "edificio" && (
            <select
              aria-label="Edificio"
              value={params.edificio}
              onChange={(e) => setParams({ ...params, edificio: e.target.value as BuildingKind })}
            >
              {BUILDINGS.filter((b) => levels[b] <= 3).map((b) => (
                <option key={b} value={b}>
                  {BUILDING_LABEL[b]} (nivel {levels[b]})
                </option>
              ))}
            </select>
          )}
          {needs === "recursos" && (
            <>
              <select aria-label="Das" value={params.da} onChange={(e) => setParams({ ...params, da: e.target.value as Resource })}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    Das {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
              <select aria-label="Recibes" value={params.recibe} onChange={(e) => setParams({ ...params, recibe: e.target.value as Resource })}>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    Recibes {RESOURCE_LABEL[r]}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            className="primary"
            disabled={blocked}
            onClick={() => act(() => api.useCard(state.partida.id, card.id, params), `${card.nombre}: hecho.`)}
          >
            Usar
          </button>
        </div>
      )}
    </li>
  );
}
