import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TILE_NAMES, areAdjacent, fortifyCost, marchKind, subUnits, unitsOf, type Tile, type Units } from "@reyes/engine";
import { api, type GameState, type OrderView, type TileView } from "../api";
import { Icon, ShieldIcon, TileArt } from "../art";
import { cellBox, sharedEdge, type Geo } from "../art/grid";
import { geoOf } from "../art/world";
import { WorldCanvas, useWorld } from "./WorldCanvas";
import { HOUSE_COLORS, TERRAIN_NOTE, TERRITORY, TILE_LABEL, UNIT_LABEL, captainOf, houseName, troopsText, wallsLeft } from "../ui";

interface Props {
  state: GameState;
  draft: OrderView[];
  setDraft: (o: OrderView[]) => void;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

type Mode = "mover" | "apoyar" | "sitiar";
type Compose = { from: number; mode: Mode; target: number | null; mix: Units; apoyaDesde: number | null; capitan?: boolean };

/** Se puede sitiar: fortalezas y castillos que no son tuyos. */
const siegeable = (t: TileView, me: number | null | undefined) =>
  t.owner !== me && (t.type === "fortaleza" || (t.type === "castillo" && t.castleOf != null));

const NO_UNITS: Units = { mesnada: 0, jinetes: 0, catapultas: 0 };
const RIDERS_ONLY = (n: number): Units => ({ mesnada: 0, jinetes: n, catapultas: 0 });

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
          jinetes: t.jinetes ?? 0,
          catapultas: t.catapultas ?? 0,
          fortified: t.fortifiedUntil != null && t.fortifiedUntil > last,
          battle: battles.has(t.id),
          besieger:
            t.besiegedBy != null ? HOUSE_COLORS[state.casas.find((h) => h.id === t.besiegedBy)?.color ?? ""]?.hex ?? null : null,
          fogged: !t.visible,
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(tiles), JSON.stringify(state.casas.map((h) => [h.id, h.color])), last, [...battles].join()],
  );
  const img = useWorld(world);
  const W = img.width;
  const H = img.height;
  const geo = useMemo(() => geoOf(img), [img]);
  const tileAt = useMemo(() => new Map(tiles.map((t) => [`${t.x},${t.y}`, t])), [tiles]);
  const ownerAt = (x: number, y: number) => tileAt.get(`${x},${y}`)?.owner;
  // Un banderín por trozo de territorio (en su casilla de más arriba a la izquierda), no en cada casilla.
  const bannerHere = (t: TileView) =>
    geo.neighbours(t.x, t.y).every(([nx, ny]) => !(ny < t.y || (ny === t.y && nx < t.x)) || ownerAt(nx, ny) !== t.owner);

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
    const [cx, cy] = geo.center(x, y);
    el.scrollLeft = cx * scale - el.clientWidth / 2;
    el.scrollTop = cy * scale - el.clientHeight / 2;
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

  /** Posición de la casilla sobre el dibujo, en porcentajes (escala con el zoom). */
  const boxStyle = (t: TileView) => {
    const [l, tp, w, h] = cellBox(geo, t.x, t.y);
    return { left: `${(l / W) * 100}%`, top: `${(tp / H) * 100}%`, width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%` };
  };
  const points = (t: TileView, inset = 0) => geo.outline(t.x, t.y, inset).map(([x, y]) => `${x},${y}`).join(" ");

  const committed = (tileId: number) => draft.filter((o) => o.desde === tileId).reduce((a, o) => a + o.tropas, 0);
  /** Tropas de cada tipo que quedan libres en una casilla tras las órdenes ya dadas. */
  const freeUnits = (tileId: number): Units => {
    const t = tiles.find((x) => x.id === tileId);
    if (!t || t.troops == null) return NO_UNITS;
    return draft
      .filter((o) => o.desde === tileId)
      .reduce((u, o) => subUnits(u, unitsOf({ troops: o.tropas, jinetes: o.jinetes, catapultas: o.catapultas })), unitsOf({ ...t, troops: t.troops }));
  };
  const tile = tiles.find((t) => t.id === selected) ?? null;
  const byId = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  // Para el motor, las tropas que no se ven cuentan como 0: solo importa el terreno y quién manda.
  const engineTiles = useMemo(() => tiles.map(asTile), [tiles]);

  const isTarget = (t: TileView) => {
    if (!compose) return false;
    const from = byId.get(compose.from)!;
    if (compose.mode === "mover") {
      // Vecinas, y además por camino (dos casillas), por mar (de puerto a puerto)
      // o a la carga (solo jinetes, por lo llano). A la montaña solo sube la Mesnada.
      if (t.type === "castillo" && t.castleOf !== me) return false;
      if (me == null) return false;
      const free = freeUnits(from.id);
      if (t.type === "montana" && free.mesnada === 0) return false;
      if (marchKind(asTile(from), asTile(t), engineTiles, me) != null) return true;
      return free.jinetes > 0 && marchKind(asTile(from), asTile(t), engineTiles, me, RIDERS_ONLY(free.jinetes)) === "carga";
    }
    if (!areAdjacent(from, t)) return false;
    if (compose.mode === "sitiar") return siegeable(t, me);
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
  const frontier = (t: TileView) =>
    geo.neighbours(t.x, t.y)
      .filter(([nx, ny]) => ownerAt(nx, ny) !== t.owner)
      .map(([nx, ny]) => ({ outer: sharedEdge(geo, t.x, t.y, nx, ny, 1.5), inner: sharedEdge(geo, t.x, t.y, nx, ny, 4) }));

  return (
    <div>
      <div className="board">
        <button className="zoom" onClick={() => setClose(!close)} aria-pressed={!close}>
          {close ? "Ver todo el reino" : "Acercar"}
        </button>
        <div className={`map-viewport ${close ? "close" : "whole"}`} ref={viewport}>
        <div className="world-wrap" style={{ width: W * scale, height: H * scale }}>
          <WorldCanvas img={img} label="Mapa de Aldricia" />
          <svg className="world-marks" viewBox={`0 0 ${W} ${H}`} aria-hidden>
            {tiles.map((t) => (
              <polygon key={`g${t.id}`} points={points(t)} className="cell-line" />
            ))}
            {tiles.map((t) => {
              const house = t.owner != null ? state.casas.find((h) => h.id === t.owner) : undefined;
              const color = house ? TERRITORY[house.color] ?? "#fff" : null;
              if (!color) return null;
              return (
                <g key={`o${t.id}`} className={t.visible ? "territory" : "territory fogged"}>
                  <polygon points={points(t)} fill={color} fillOpacity={0.12} />
                  {frontier(t).map(({ outer, inner }, i) => (
                    <g key={i}>
                      <line x1={inner[0][0]} y1={inner[0][1]} x2={inner[1][0]} y2={inner[1][1]} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                      <line x1={outer[0][0]} y1={outer[0][1]} x2={outer[1][0]} y2={outer[1][1]} stroke={color} strokeWidth={3} strokeLinecap="round" />
                    </g>
                  ))}
                </g>
              );
            })}
            {tiles.filter(isTarget).map((t) => (
              <polygon key={`t${t.id}`} points={points(t, 2)} className="cell-target" />
            ))}
            {compose && byId.get(compose.from) && <polygon points={points(byId.get(compose.from)!, 1.5)} className="cell-source" />}
            {tile && !compose && <polygon points={points(tile, 1.5)} className="cell-selected" />}
          </svg>
          <div className="world-overlay">
            {tiles.map((t) => {
              const house = t.owner != null ? state.casas.find((h) => h.id === t.owner) : undefined;
              return (
                <div key={t.id} className={`cell-box ${geo.kind}`} style={boxStyle(t)}>
                  <button
                    className={`tile ${geo.kind}`}
                    onClick={() => onTile(t)}
                    aria-pressed={selected === t.id}
                    aria-label={`${t.nombre}, ${TILE_LABEL[t.type]}, ${t.owner ? houseName(state.casas, t.owner) : "neutral"}, ${
                      t.troops == null ? "tropas desconocidas" : `${t.troops} tropas`
                    }${isTarget(t) ? ", objetivo posible" : ""}`}
                  />
                  {house && t.type !== "castillo" && bannerHere(t) && (
                    <span className="tile-banner" aria-hidden>
                      <ShieldIcon color={house.color} escudo={house.escudo} size={14} title="" />
                    </span>
                  )}
                  {t.troops != null && (
                    <span className="tile-troops" aria-hidden>
                      {t.troops}
                    </span>
                  )}
                  {(t.capitanes ?? []).length > 0 && (
                    <span className="tile-captain" aria-hidden title="Capitán">
                      <Icon name="capitan" size={14} color={t.capitanes!.includes(me ?? -1) ? "#f1cf7d" : "#d9d2c3"} />
                    </span>
                  )}
                  {battles.has(t.id) && (
                    <span className="tile-battle" aria-hidden title="Batalla en la última resolución">
                      <Icon name="ordenes" size={14} color="#f1cf7d" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <svg className="world-arrows" viewBox={`0 0 ${W} ${H}`} aria-hidden>
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
                  return <Arrow key={`l${i}`} geo={geo} from={a} to={b} color={house ? TERRITORY[house.color] ?? "#ccc" : "#ccc"} width={1.5 + Math.min(3, m.troops / 4)} past />;
                })}
              {draft.map((o, i) => {
                const a = byId.get(o.desde);
                const b = byId.get(o.hacia);
                if (!a || !b) return null;
                return (
                  <Arrow
                    key={i}
                    geo={geo}
                    from={a}
                    to={b}
                    color={TERRITORY[mine?.color ?? ""] ?? "#f1cf7d"}
                    width={1.5 + Math.min(3, o.tropas / 4)}
                    dashed={o.tipo !== "mover"}
                    label={o.tropas}
                  />
                );
              })}
          </svg>
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
          available={freeUnits(compose.from)}
          engineTiles={engineTiles}
          captainHere={
            !!byId.get(compose.from)?.capitanes?.includes(me ?? -1) && !draft.some((o) => o.capitan)
          }
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
              setCompose({ from: tile.id, mode, target: null, mix: freeUnits(tile.id), apoyaDesde: null })
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

/** Una casilla tal como la entiende el motor. */
function asTile(t: TileView): Tile {
  return {
    id: t.id,
    x: t.x,
    y: t.y,
    type: t.type,
    owner: t.owner,
    troops: t.troops ?? 0,
    ...(t.jinetes ? { jinetes: t.jinetes } : {}),
    ...(t.catapultas ? { catapultas: t.catapultas } : {}),
    fortifiedUntil: t.fortifiedUntil,
    castleOf: t.castleOf ?? null,
  };
}

/** Flecha de orden entre dos casillas, en píxeles del dibujo. */
function Arrow({
  geo,
  from,
  to,
  color,
  width,
  dashed,
  past,
  label,
}: {
  geo: Geo;
  from: TileView;
  to: TileView;
  color: string;
  width: number;
  dashed?: boolean;
  past?: boolean;
  label?: number;
}) {
  const [ax, ay] = geo.center(from.x, from.y);
  const [bx, by] = geo.center(to.x, to.y);
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
  onOrder: (mode: Mode) => void;
  onFortify: () => void;
}) {
  const mine = tile.owner === state.yo.casa;
  const owner = tile.owner != null ? state.casas.find((h) => h.id === tile.owner) : undefined;
  const note =
    tile.type === "castillo" ? null : TILE_NAMES[tile.type]?.find((n) => tile.nombre.startsWith(n.name))?.note ?? null;
  const fortified = tile.fortifiedUntil != null && tile.fortifiedUntil > state.partida.resolucionActual;
  // Sitiar: hay al lado una fortaleza o un castillo ajeno.
  const canSiege = (state.casillas ?? []).some((t) => siegeable(t, state.yo.casa) && areAdjacent(t, tile));
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
          <small>{tile.troops == null ? (tile.hidden ? "escondidas" : "sin ver") : tile.troops === 1 ? "tropa" : "tropas"}</small>
        </div>
      </div>
      {note && <p className="note">«{note}»</p>}
      {tile.troops != null && ((tile.jinetes ?? 0) > 0 || (tile.catapultas ?? 0) > 0) && (
        <p className="unit-mix">
          {tile.troops - (tile.jinetes ?? 0) - (tile.catapultas ?? 0)} de Mesnada · {tile.jinetes ?? 0}{" "}
          {tile.jinetes === 1 ? "jinete" : "jinetes"} · {tile.catapultas ?? 0} {tile.catapultas === 1 ? "catapulta" : "catapultas"}
        </p>
      )}
      {tile.besiegedBy != null && (
        <p className="siege-note">
          {tile.type === "castillo"
            ? `Rodeado por ${houseName(state.casas, tile.besiegedBy)}: produce la mitad.`
            : `Sitiada por ${houseName(state.casas, tile.besiegedBy)} desde hace ${tile.siegeNights ?? 1} ${(tile.siegeNights ?? 1) === 1 ? "noche" : "noches"}: ${wallsLeft(tile.siegeNights ?? 1)}.`}
        </p>
      )}
      {(tile.capitanes ?? []).map((h) => (
        <p key={h} className="captain-note">
          <Icon name="capitan" size={16} color={h === state.yo.casa ? "#d6a64b" : "#827d8a"} />{" "}
          {h === state.yo.casa ? `Aquí está tu Capitán, ${captainOf(state.casas, h).split(",")[0]}.` : `Aquí está ${captainOf(state.casas, h)}.`}
        </p>
      ))}
      <p className="muted terrain-note">{TERRAIN_NOTE[tile.type]}</p>
      {tile.troops == null && (
        <p className="muted">
          {tile.hidden ? "Sus tropas se esconden en el bosque: no sabes cuántas hay." : "No sabes cuántas tropas hay: está fuera de tu vista."}
        </p>
      )}
      {mine && open && available > 0 && (
        <div className="actions">
          <button className="primary grow" onClick={() => onOrder("mover")}>
            Mover o atacar
          </button>
          <button onClick={() => onOrder("apoyar")}>Apoyar</button>
          {canSiege && <button onClick={() => onOrder("sitiar")}>Sitiar</button>}
        </div>
      )}
      {mine && tile.type !== "castillo" && !fortified && (
        <button className="secondary wide" onClick={onFortify}>
          <Icon name="muralla" size={18} color="#827d8a" /> Fortificar: {fortifyCost(tile).piedra} de Piedra, +25% de defensa{" "}
          {(state.partida.fortificarResoluciones ?? 2) === 1 ? "una resolución" : `${state.partida.fortificarResoluciones ?? 2} resoluciones`}
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
  engineTiles,
  captainHere,
  onAdd,
}: {
  state: GameState;
  compose: Compose;
  setCompose: (c: Compose | null) => void;
  byId: Map<number, TileView>;
  available: Units;
  engineTiles: Tile[];
  /** El Capitán de la casa está en la casilla de salida y aún no va con otra orden. */
  captainHere: boolean;
  onAdd: (o: OrderView) => void;
}) {
  const from = byId.get(compose.from)!;
  const target = compose.target != null ? byId.get(compose.target)! : null;
  const attackOrigins =
    target && compose.mode === "apoyar"
      ? [...byId.values()].filter((t) => t.id !== from.id && t.id !== target.id && areAdjacent(t, target))
      : [];
  const verb = compose.mode === "mover" ? "Mover o atacar" : compose.mode === "sitiar" ? "Sitiar" : "Apoyar";
  // Qué tipos pueden ir: a la carga solo jinetes; a la montaña solo Mesnada; los apoyos, sin catapultas.
  const me = state.yo.casa;
  const charge =
    target != null &&
    compose.mode === "mover" &&
    me != null &&
    marchKind(asTile(from), asTile(target), engineTiles, me) == null;
  const kinds: (keyof Units)[] = !target
    ? []
    : charge
      ? ["jinetes"]
      : compose.mode === "mover" && target.type === "montana"
        ? ["mesnada"]
        : compose.mode === "apoyar"
          ? ["mesnada", "jinetes"]
          : ["mesnada", "jinetes", "catapultas"];
  const mix: Units = {
    mesnada: kinds.includes("mesnada") ? Math.min(compose.mix.mesnada, available.mesnada) : 0,
    jinetes: kinds.includes("jinetes") ? Math.min(compose.mix.jinetes, available.jinetes) : 0,
    catapultas: kinds.includes("catapultas") ? Math.min(compose.mix.catapultas, available.catapultas) : 0,
  };
  const total = mix.mesnada + mix.jinetes + mix.catapultas;
  const shown = kinds.filter((k) => available[k] > 0);
  return (
    <section className="card composer">
      <h2>
        {verb} desde {from.nombre}
      </h2>
      {!target ? (
        <p>
          {compose.mode === "mover"
            ? "Toca una casilla marcada: una vecina, o más lejos por un camino tuyo, por mar desde un puerto o a la carga con jinetes."
            : compose.mode === "sitiar"
              ? "Toca la fortaleza o el castillo vecino que quieres sitiar. Tus tropas se quedan en su casilla y la siguen defendiendo."
              : "Toca una casilla vecina marcada en el mapa."}
        </p>
      ) : (
        <>
          <p>
            Objetivo: <strong>{target.nombre}</strong>
            {charge && " · a la carga: solo van jinetes"}
            {!charge && compose.mode === "mover" && target.type === "montana" && " · a la montaña solo sube la Mesnada"}
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
          {shown.length === 0 && <p className="error">No te quedan tropas que puedan ir ahí.</p>}
          {compose.mode === "mover" && captainHere && (
            <label className="check">
              <input type="checkbox" checked={!!compose.capitan} onChange={(e) => setCompose({ ...compose, capitan: e.target.checked })} />
              Con el Capitán: +2 de fuerza. Si el ataque fracasa contra otra casa, cae preso.
            </label>
          )}
          {compose.mode === "sitiar" && (
            <p className="hint">
              {target.type === "castillo"
                ? "Un castillo hay que rodearlo desde dos casillas tuyas a la vez: entonces produce la mitad y tú ganas 1 de Prestigio cada noche."
                : "Cada noche de asedio la fortaleza pierde un 25% de murallas. Se rompe si atacan tu casilla."}{" "}
              Hacen falta al menos 3 tropas.
            </p>
          )}
          {shown.map((k) => (
            <label key={k}>
              {UNIT_LABEL[k]}: <strong>{mix[k]}</strong> de {available[k]}
              <input
                type="range"
                min={0}
                max={available[k]}
                value={mix[k]}
                onChange={(e) => setCompose({ ...compose, mix: { ...compose.mix, [k]: Number(e.target.value) } })}
              />
            </label>
          ))}
          <div className="actions">
            <button
              className="primary"
              disabled={total < (compose.mode === "sitiar" ? 3 : 1)}
              onClick={() =>
                onAdd({
                  tipo: compose.mode,
                  desde: from.id,
                  hacia: target.id,
                  apoyaDesde: compose.mode === "apoyar" ? compose.apoyaDesde : null,
                  tropas: total,
                  ...(mix.jinetes > 0 ? { jinetes: mix.jinetes } : {}),
                  ...(mix.catapultas > 0 ? { catapultas: mix.catapultas } : {}),
                  ...(compose.mode === "mover" && captainHere && compose.capitan ? { capitan: true } : {}),
                })
              }
            >
              Añadir orden: {troopsText(total, mix.jinetes, mix.catapultas)}
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
