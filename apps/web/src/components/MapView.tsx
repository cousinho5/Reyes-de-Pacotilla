import { useMemo, useState } from "react";
import { TILE_NAMES, areAdjacent } from "@reyes/engine";
import { api, type GameState, type OrderView, type TileView } from "../api";
import { TILE_LABEL, TILE_MARK, houseColor, houseName } from "../ui";

interface Props {
  state: GameState;
  draft: OrderView[];
  setDraft: (o: OrderView[]) => void;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

type Compose = { from: number; mode: "mover" | "apoyar"; target: number | null; troops: number; apoyaDesde: number | null };

export function MapView({ state, draft, setDraft, act }: Props) {
  const tiles = state.casillas ?? [];
  const cols = state.partida.columnas ?? 5;
  const me = state.yo.casa;
  const [selected, setSelected] = useState<number | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const open = !!state.partida.ordenesAbiertas;

  const committed = (tileId: number) => draft.filter((o) => o.desde === tileId).reduce((a, o) => a + o.tropas, 0);
  const tile = tiles.find((t) => t.id === selected) ?? null;
  const byId = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);

  const isTarget = (t: TileView) => {
    if (!compose) return false;
    const from = byId.get(compose.from)!;
    if (!areAdjacent(from, t)) return false;
    if (compose.mode === "mover") return !(t.type === "castillo" && t.castleOf !== me);
    return t.type !== "castillo";
  };

  const onTile = (t: TileView) => {
    if (compose && compose.target == null && isTarget(t)) {
      setCompose({ ...compose, target: t.id });
      return;
    }
    setSelected(t.id);
    setCompose(null);
  };

  const outgoing = (t: TileView) => draft.filter((o) => o.desde === t.id);

  return (
    <div>
      <div className="map" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {tiles.map((t) => {
          const owner = houseColor(state.casas, t.owner);
          const classes = [
            "tile",
            `tile-${t.type}`,
            t.visible ? "" : "fogged",
            selected === t.id ? "selected" : "",
            isTarget(t) ? "target" : "",
            compose?.from === t.id ? "source" : "",
          ].join(" ");
          return (
            <button
              key={t.id}
              className={classes}
              style={owner ? { boxShadow: `inset 0 0 0 4px ${owner}` } : undefined}
              onClick={() => onTile(t)}
              aria-label={`${t.nombre}, ${TILE_LABEL[t.type]}, ${t.owner ? houseName(state.casas, t.owner) : "neutral"}, ${
                t.troops == null ? "tropas desconocidas" : `${t.troops} tropas`
              }`}
            >
              <span className="tile-mark" aria-hidden>
                {TILE_MARK[t.type]}
              </span>
              <span className="tile-troops">{t.troops == null ? "?" : t.troops}</span>
              {t.fortifiedUntil != null && t.fortifiedUntil > state.partida.resolucionActual && (
                <span className="tile-fort" aria-hidden>
                  ⛨
                </span>
              )}
              {owner && <span className="tile-banner" style={{ background: owner }} aria-hidden />}
              {outgoing(t).length > 0 && (
                <span className="tile-orders" aria-hidden>
                  {outgoing(t).map((o) => arrow(t, byId.get(o.hacia)!)).join("")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {compose ? (
        <Composer
          state={state}
          compose={compose}
          setCompose={setCompose}
          byId={byId}
          available={(byId.get(compose.from)?.troops ?? 0) - committed(compose.from)}
          onAdd={(o) => {
            setDraft([...draft, o]);
            setCompose(null);
          }}
        />
      ) : (
        tile && (
          <TilePanel
            state={state}
            tile={tile}
            available={(tile.troops ?? 0) - committed(tile.id)}
            open={open}
            onOrder={(mode) =>
              setCompose({ from: tile.id, mode, target: null, troops: Math.max(1, (tile.troops ?? 0) - committed(tile.id)), apoyaDesde: null })
            }
            onFortify={() => act(() => api.fortify(state.partida.id, tile.id), "Murallas reforzadas.")}
          />
        )
      )}
      {!tile && !compose && <p className="hint">Toca una casilla para ver qué hay y dar órdenes desde tus tierras.</p>}
    </div>
  );
}

function arrow(from: TileView, to: TileView): string {
  if (to.x > from.x) return "→";
  if (to.x < from.x) return "←";
  if (to.y > from.y) return "↓";
  return "↑";
}

function TilePanel({
  state,
  tile,
  available,
  open,
  onOrder,
  onFortify,
}: {
  state: GameState;
  tile: TileView;
  available: number;
  open: boolean;
  onOrder: (mode: "mover" | "apoyar") => void;
  onFortify: () => void;
}) {
  const mine = tile.owner === state.yo.casa;
  const note =
    tile.type === "castillo" ? null : TILE_NAMES[tile.type]?.find((n) => tile.nombre.startsWith(n.name))?.note ?? null;
  const fortified = tile.fortifiedUntil != null && tile.fortifiedUntil > state.partida.resolucionActual;
  return (
    <section className="card tile-panel">
      <h2>{tile.nombre}</h2>
      <p className="muted">
        {TILE_LABEL[tile.type]} · {tile.owner ? houseName(state.casas, tile.owner) : "Neutral"}
        {fortified && " · fortificada"}
      </p>
      {note && <p className="note">«{note}»</p>}
      <p>{tile.troops == null ? "No sabes cuántas tropas hay: está fuera de tu vista." : `Tropas: ${tile.troops}`}</p>
      {mine && open && available > 0 && (
        <div className="actions">
          <button onClick={() => onOrder("mover")}>Mover / atacar</button>
          <button onClick={() => onOrder("apoyar")}>Apoyar</button>
        </div>
      )}
      {mine && tile.type !== "castillo" && !fortified && (
        <button className="secondary" onClick={onFortify}>
          Fortificar (10 de Piedra, +25% de defensa dos resoluciones)
        </button>
      )}
    </section>
  );
}

function Composer({
  state,
  compose,
  setCompose,
  byId,
  available,
  onAdd,
}: {
  state: GameState;
  compose: Compose;
  setCompose: (c: Compose | null) => void;
  byId: Map<number, TileView>;
  available: number;
  onAdd: (o: OrderView) => void;
}) {
  const from = byId.get(compose.from)!;
  const target = compose.target != null ? byId.get(compose.target)! : null;
  const attackOrigins =
    target && compose.mode === "apoyar"
      ? [...byId.values()].filter((t) => t.id !== from.id && t.id !== target.id && areAdjacent(t, target))
      : [];
  const verb = compose.mode === "mover" ? "Mover o atacar" : "Apoyar";
  return (
    <section className="card composer">
      <h2>
        {verb} desde {from.nombre}
      </h2>
      {!target ? (
        <p>Toca una casilla vecina marcada en el mapa.</p>
      ) : (
        <>
          <p>
            Objetivo: <strong>{target.nombre}</strong>
          </p>
          {compose.mode === "apoyar" && (
            <label>
              ¿Qué apoyas?
              <select
                value={compose.apoyaDesde ?? ""}
                onChange={(e) => setCompose({ ...compose, apoyaDesde: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">La defensa de {target.nombre}</option>
                {attackOrigins.map((t) => (
                  <option key={t.id} value={t.id}>
                    Un ataque que sale de {t.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Tropas: <strong>{compose.troops}</strong> de {available}
            <input
              type="range"
              min={1}
              max={Math.max(1, available)}
              value={compose.troops}
              onChange={(e) => setCompose({ ...compose, troops: Number(e.target.value) })}
            />
          </label>
          <div className="actions">
            <button
              className="primary"
              disabled={available < 1}
              onClick={() =>
                onAdd({
                  tipo: compose.mode,
                  desde: from.id,
                  hacia: target.id,
                  apoyaDesde: compose.mode === "apoyar" ? compose.apoyaDesde : null,
                  tropas: compose.troops,
                })
              }
            >
              Añadir orden
            </button>
          </div>
          <p className="hint">Las órdenes se guardan en la pestaña Órdenes.</p>
        </>
      )}
      <button className="link" onClick={() => setCompose(null)}>
        Cancelar
      </button>
      {state.partida.ordenesAbiertas === false && <p className="error">Las órdenes están cerradas.</p>}
    </section>
  );
}
