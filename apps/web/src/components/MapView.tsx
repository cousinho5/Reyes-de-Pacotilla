import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FORTIFY_COST, TILE_NAMES, areAdjacent } from "@reyes/engine";
import { api, type GameState, type OrderView, type TileView } from "../api";
import { Icon, ShieldIcon, TileArt } from "../art";
import { CELL } from "../art/world";
import { WorldCanvas, useWorld } from "./WorldCanvas";
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
  const rows = state.partida.filas ?? 5;
  const mine = state.casas.find((h) => h.id === me);
  const [showLast, setShowLast] = useState(false);

  // Lo que pasó en la última resolución (solo lo que esta casa pudo ver).
  const last = state.partida.resolucionActual;
  const lastEvents = (state.eventos ?? []).filter((e) => e.resolucion === last && last > 0);
  const combats = lastEvents.filter((e) => e.tipo === "combate");
  const battles = new Set(combats.map((e) => Number(e.datos.tile)));
  const conquests = combats.filter((e) => e.datos.conquered).length;
  const lastMoves = lastEvents
    .filter((e) => e.tipo === "movimiento")
    .map((e) => e.datos as { house: number; from: number; to: number; troops: number });

  // El dibujo del mundo: terreno, banderas, tropas a la vista, empalizadas y batallas.
  const world = useMemo(
    () => ({
      cols,
      rows,
      seed: state.partida.id,
      cells: tiles.map((t) => {
        const house = t.owner != null ? state.casas.find((h) => h.id === t.owner) : undefined;
        return {
          x: t.x,
          y: t.y,
          type: t.type,
          owner: house ? HOUSE_COLORS[house.color]?.hex ?? null : null,
          troops: t.troops,
          fortified: t.fortifiedUntil != null && t.fortifiedUntil > last,
          battle: battles.has(t.id),
          fogged: !t.visible,
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(tiles), JSON.stringify(state.casas.map((h) => [h.id, h.color])), last, [...battles].join()],
  );
  // Un banderín por trozo de territorio (en la casilla de arriba a la izquierda), no en cada casilla.
  const bannerHere = (t: TileView) => {
    const ownerAt = (x: number, y: number) => tiles.find((n) => n.x === x && n.y === y)?.owner;
    return ownerAt(t.x - 1, t.y) !== t.owner && ownerAt(t.x, t.y - 1) !== t.owner;
  };
  const img = useWorld(world);
  const M = img.margin;
  const W = img.width;
  const H = img.height;

  // Zoom: de cerca (2 px de pantalla por píxel del dibujo, unas 3 casillas de ancho
  // en un móvil) o el reino entero ajustado al ancho.
  const viewport = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(360);
  const [close, setClose] = useState(true);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const fit = viewW / W;
  const scale = close ? Math.max(2, fit) : fit;
  const focus = useRef<{ x: number; y: number } | null>(null);
  const centerOn = (x: number, y: number) => {
    const el = viewport.current;
    if (!el) return;
    el.scrollLeft = (M + (x + 0.5) * CELL) * scale - el.clientWidth / 2;
    el.scrollTop = (M + (y + 0.5) * CELL) * scale - el.clientHeight / 2;
  };
  // Al abrir, el mapa se centra en tu castillo.
  const myCastle = tiles.find((t) => t.type === "castillo" && t.castleOf === me) ?? tiles.find((t) => t.owner === me);
  const centered = useRef(false);
  useLayoutEffect(() => {
    if (focus.current) {
      centerOn(focus.current.x, focus.current.y);
      focus.current = null;
    } else if (!centered.current && myCastle) {
      centerOn(myCastle.x, myCastle.y);
      centered.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, myCastle?.id]);

  const overlayBox = {
    left: `${(M / W) * 100}%`,
    top: `${(M / H) * 100}%`,
    width: `${((cols * CELL) / W) * 100}%`,
    height: `${((rows * CELL) / H) * 100}%`,
  };

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
    // En la vista de todo el reino, tocar una casilla acerca el mapa a ella.
    if (!close) {
      focus.current = { x: t.x, y: t.y };
      setClose(true);
      setSelected(t.id);
      return;
    }
    if (compose && compose.target == null && isTarget(t)) {
      setCompose({ ...compose, target: t.id });
      return;
    }
    setSelected(t.id);
    setCompose(null);
  };


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
        <button className="zoom" onClick={() => setClose(!close)} aria-pressed={!close}>
          {close ? "Ver todo el reino" : "Acercar"}
        </button>
        <div className={`map-viewport ${close ? "close" : "whole"}`} ref={viewport}>
        <div className="world-wrap" style={{ width: W * scale, height: H * scale }}>
          <WorldCanvas img={img} label="Mapa de Aldricia" />
          <div className="world-overlay" style={overlayBox}>
            <div
              className="map"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
            >
              {tiles.map((t) => {
                const house = t.owner != null ? state.casas.find((h) => h.id === t.owner) : undefined;
                const border = house ? TERRITORY[house.color] ?? "#fff" : null;
                const classes = [
                  "tile",
                  t.visible ? "" : "fogged",
                  t.owner === me ? "mine" : "",
                  selected === t.id ? "selected" : "",
                  isTarget(t) ? "target" : "",
                  compose?.from === t.id ? "source" : "",
                ].join(" ");
                return (
                  <button
                    key={t.id}
                    className={classes}
                    style={{ gridColumn: t.x + 1, gridRow: t.y + 1 }}
                    onClick={() => onTile(t)}
                    aria-label={`${t.nombre}, ${TILE_LABEL[t.type]}, ${t.owner ? houseName(state.casas, t.owner) : "neutral"}, ${
                      t.troops == null ? "tropas desconocidas" : `${t.troops} tropas`
                    }`}
                  >
                    {border && (
                      <span className="tile-owner" style={{ boxShadow: frontier(t, border), background: `${border}1f` }} aria-hidden />
                    )}
                    {house && t.type !== "castillo" && bannerHere(t) && (
                      <span className="tile-banner" aria-hidden>
                        <ShieldIcon color={house.color} escudo={house.escudo} size={14} title="" />
                      </span>
                    )}
                    {t.troops != null && <span className="tile-troops">{t.troops}</span>}
                    {battles.has(t.id) && (
                      <span className="tile-battle" aria-hidden title="Batalla en la última resolución">
                        <Icon name="ordenes" size={14} color="#f1cf7d" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <svg className="world-arrows" viewBox={`0 0 ${cols * CELL} ${rows * CELL}`} aria-hidden>
              <defs>
                <marker id="punta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
                </marker>
              </defs>
              {showLast &&
                lastMoves.map((m, i) => {
                  const a = byId.get(m.from);
                  const b = byId.get(m.to);
                  if (!a || !b) return null;
                  const house = state.casas.find((h) => h.id === m.house);
                  return <Arrow key={`l${i}`} from={a} to={b} color={house ? TERRITORY[house.color] ?? "#ccc" : "#ccc"} width={1.5 + Math.min(3, m.troops / 4)} past />;
                })}
              {draft.map((o, i) => {
                const a = byId.get(o.desde);
                const b = byId.get(o.hacia);
                if (!a || !b) return null;
                return (
                  <Arrow
                    key={i}
                    from={a}
                    to={b}
                    color={TERRITORY[mine?.color ?? ""] ?? "#f1cf7d"}
                    width={1.5 + Math.min(3, o.tropas / 4)}
                    dashed={o.tipo === "apoyar"}
                    label={o.tropas}
                  />
                );
              })}
            </svg>
          </div>
        </div>
        </div>
      </div>
      {(battles.size > 0 || lastMoves.length > 0) && (
        <div className="war-report">
          <span>
            <Icon name="ordenes" size={18} color="#f1cf7d" />
            {battles.size > 0
              ? `${battles.size} ${battles.size === 1 ? "batalla" : "batallas"} en la última resolución`
              : "Movimientos de la última resolución"}
            {conquests > 0 && ` · ${conquests} ${conquests === 1 ? "casilla cambia" : "casillas cambian"} de bandera`}
          </span>
          <button className="link" onClick={() => setShowLast(!showLast)} aria-pressed={showLast}>
            {showLast ? "Ocultar" : "Ver en el mapa"}
          </button>
        </div>
      )}

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

/** Flecha de orden entre dos casillas, en coordenadas del mundo (32 por casilla). */
function Arrow({
  from,
  to,
  color,
  width,
  dashed,
  past,
  label,
}: {
  from: TileView;
  to: TileView;
  color: string;
  width: number;
  dashed?: boolean;
  past?: boolean;
  label?: number;
}) {
  const ax = from.x * CELL + CELL / 2;
  const ay = from.y * CELL + CELL / 2;
  const bx = to.x * CELL + CELL / 2;
  const by = to.y * CELL + CELL / 2;
  // Algo de curva para que dos flechas opuestas no se tapen.
  const mx = (ax + bx) / 2 + (by - ay) * 0.18;
  const my = (ay + by) / 2 - (bx - ax) * 0.18;
  const sx = ax + (bx - ax) * 0.18;
  const sy = ay + (by - ay) * 0.18;
  const ex = ax + (bx - ax) * 0.78;
  const ey = ay + (by - ay) * 0.78;
  const d = `M${sx},${sy} Q${mx},${my} ${ex},${ey}`;
  return (
    <g className={past ? "arrow past" : "arrow"}>
      <path d={d} stroke="#1c1410" strokeWidth={width * 2 + 3} fill="none" strokeLinecap="round" strokeDasharray={dashed ? "8 6" : undefined} />
      <path d={d} stroke={color} strokeWidth={width * 2} fill="none" strokeLinecap="round" strokeDasharray={dashed ? "8 6" : undefined} markerEnd="url(#punta)" />
      {label != null && (
        <g transform={`translate(${mx},${my})`}>
          <rect x={-9} y={-8} width={18} height={16} rx={3} fill="#1c1410" />
          <text x={0} y={4.5} textAnchor="middle" className="arrow-label">
            {label}
          </text>
        </g>
      )}
    </g>
  );
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
