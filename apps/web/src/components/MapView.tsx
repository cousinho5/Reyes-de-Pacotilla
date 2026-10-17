import { useMemo, useState } from "react";
import { FORTIFY_COST, TILE_NAMES, areAdjacent } from "@reyes/engine";
import { api, type GameState, type OrderView, type TileView } from "../api";
import { Icon, ShieldIcon, TileArt } from "../art";
import { HOUSE_COLORS, TERRITORY, TILE_LABEL, houseName } from "../ui";

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

  // Frontera de cada casa: una línea de su color (con un filo claro por dentro)
  // solo en los lados donde la casilla vecina es de otro dueño.
  const frontier = (t: TileView, color: string) => {
    const other = (dx: number, dy: number) => tiles.find((n) => n.x === t.x + dx && n.y === t.y + dy)?.owner !== t.owner;
    const sides: [number, number, (w: number) => string][] = [
      [0, -1, (w) => `0 ${w}px`],
      [0, 1, (w) => `0 -${w}px`],
      [-1, 0, (w) => `${w}px 0`],
      [1, 0, (w) => `-${w}px 0`],
    ];
    const lines = sides.filter(([dx, dy]) => other(dx, dy));
    return [
      ...lines.map(([, , off]) => `inset ${off(3)} 0 ${color}`),
      ...lines.map(([, , off]) => `inset ${off(4)} 0 rgba(255, 255, 255, 0.55)`),
    ].join(", ");
  };

  return (
    <div>
      <div className="board">
        <div className="map" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {tiles.map((t) => {
            const house = t.owner != null ? state.casas.find((h) => h.id === t.owner) : undefined;
            const border = house ? TERRITORY[house.color] ?? "#fff" : null;
            const classes = [
              "tile",
              `tile-${t.type}`,
              t.visible ? "" : "fogged",
              selected === t.id ? "selected" : "",
              isTarget(t) ? "target" : "",
              compose?.from === t.id ? "source" : "",
            ].join(" ");
            const fortified = t.fortifiedUntil != null && t.fortifiedUntil > state.partida.resolucionActual;
            return (
              <button
                key={t.id}
                className={classes}
                onClick={() => onTile(t)}
                aria-label={`${t.nombre}, ${TILE_LABEL[t.type]}, ${t.owner ? houseName(state.casas, t.owner) : "neutral"}, ${
                  t.troops == null ? "tropas desconocidas" : `${t.troops} tropas`
                }`}
              >
                <TileArt type={t.type} flag={house ? HOUSE_COLORS[house.color]?.hex : null} className="tile-art" />
                {border && <span className="tile-owner" style={{ boxShadow: frontier(t, border) }} aria-hidden />}
                {house && t.type !== "castillo" && (
                  <span className="tile-banner" aria-hidden>
                    <ShieldIcon color={house.color} escudo={house.escudo} size={15} title="" />
                  </span>
                )}
                {fortified && (
                  <span className="tile-fort" aria-hidden>
                    <Icon name="muralla" size={16} color="#aaa5b1" />
                  </span>
                )}
                {t.troops != null && <span className="tile-troops">{t.troops}</span>}
                {outgoing(t).length > 0 && (
                  <span className="tile-orders" aria-hidden>
                    {outgoing(t).map((o) => arrow(t, byId.get(o.hacia)!)).join("")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
      {!tile && !compose && (
        <p className="hint">Toca una casilla con la frontera de tu color (al principio, tu castillo) para mover o atacar con sus tropas.</p>
      )}
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
  const owner = tile.owner != null ? state.casas.find((h) => h.id === tile.owner) : undefined;
  const note =
    tile.type === "castillo" ? null : TILE_NAMES[tile.type]?.find((n) => tile.nombre.startsWith(n.name))?.note ?? null;
  const fortified = tile.fortifiedUntil != null && tile.fortifiedUntil > state.partida.resolucionActual;
  return (
    <section className="card tile-panel">
      <div className="tile-head">
        <TileArt type={tile.type} flag={owner ? HOUSE_COLORS[owner.color]?.hex : null} className="thumb" />
        <div className="grow">
          <h2>{tile.nombre}</h2>
          <p className="muted">
            {TILE_LABEL[tile.type]} · {mine ? "tuya" : tile.owner ? houseName(state.casas, tile.owner) : "neutral"}
            {fortified && " · fortificada"}
          </p>
        </div>
        <div className="troop-count">
          {tile.troops ?? "?"}
          <small>{tile.troops == null ? "sin ver" : tile.troops === 1 ? "tropa" : "tropas"}</small>
        </div>
      </div>
      {note && <p className="note">«{note}»</p>}
      {tile.troops == null && <p className="muted">No sabes cuántas tropas hay: está fuera de tu vista.</p>}
      {mine && open && available > 0 && (
        <div className="actions">
          <button className="primary grow" onClick={() => onOrder("mover")}>
            Mover o atacar
          </button>
          <button onClick={() => onOrder("apoyar")}>Apoyar</button>
        </div>
      )}
      {mine && tile.type !== "castillo" && !fortified && (
        <button className="secondary wide" onClick={onFortify}>
          <Icon name="muralla" size={18} color="#827d8a" /> Fortificar: {FORTIFY_COST.piedra} de Piedra, +25% de defensa dos resoluciones
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
          <p className="hint">La orden se guarda al añadirla. Puedes verla o quitarla en la pestaña Órdenes.</p>
        </>
      )}
      <button className="link" onClick={() => setCompose(null)}>
        Cancelar
      </button>
      {state.partida.ordenesAbiertas === false && <p className="error">Las órdenes están cerradas.</p>}
    </section>
  );
}
