import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ANY_ORIGIN, BATTLE_TWEAKS, defenseMultiplier, FORTIFY_UPKEEP, RIVERS, TILE_NAMES, areAdjacent, bridgeBetween, fortifyCost, marchKind, riverBetween, subUnits, threats, unitsOf, type Tile, type Units } from "@reyes/engine";
import { api, type GameState, type OrderView, type TileView } from "../api";
import { Icon, ShieldIcon, TileArt } from "../art";
import { cellBox, sharedEdge, type Geo } from "../art/grid";
import { geoOf } from "../art/world";
import { WorldCanvas, useWorldMeta } from "./WorldCanvas";
import { HOUSE_COLORS, TERRAIN_NOTE, TERRITORY, TILE_LABEL, UNIT_LABEL, captainOf, houseName, nightLabel, troops as troopsWord, troopsText, wallsLeft, withArticle } from "../ui";
import { asTile, myAllies, myBreaking, nextResolution, nightOf, project, queueNights } from "../plan";
import { NightReplay, replaySteps } from "./NightReplay";
import { useMapZoom } from "./useMapZoom";
import { Sheet, type SheetState } from "./Sheet";

interface Props {
  state: GameState;
  draft: OrderView[];
  setDraft: (o: OrderView[]) => void;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
  /** Noche de la cola que se está planeando (0 = la próxima resolución). */
  night: number;
  setNight: (n: number) => void;
}

/** "capitan": el Capitán va solo, sin tropas, a otra casilla tuya (bloque 4). */
type Mode = "mover" | "apoyar" | "sitiar" | "capitan";
/** `guest`: salen las tropas de paso de tu casa en esa casilla aliada (bloque 8). */
type Compose = { from: number; mode: Mode; target: number | null; mix: Units; apoyaDesde: number | null; capitan?: boolean; guest?: boolean };

/** Se puede sitiar: fortalezas y castillos que no son tuyos ni de una casa con la que tienes alianza. */
const siegeable = (t: TileView, me: number | null | undefined, bound: number[] = []) =>
  t.owner !== me && (t.owner == null || !bound.includes(t.owner)) && (t.type === "fortaleza" || (t.type === "castillo" && t.castleOf != null));

/** Tus tropas de paso en una casilla aliada (bloque 8). */
const myGuests = (t: TileView | undefined, me: number) => t?.guests?.find((g) => g.house === me);

const NO_UNITS: Units = { mesnada: 0, jinetes: 0, catapultas: 0 };
/** Mantener pulsada una casilla este tiempo enseña su información rápida (bloque 6). */
const LONG_PRESS_MS = 450;
/** Un dedo que se mueve más que esto ya no es una pulsación: arrastra. */
const DRAG_SLOP_PX = 10;
const RIDERS_ONLY = (n: number): Units => ({ mesnada: 0, jinetes: n, catapultas: 0 });

/** La última noche vista en repetición, por partida (en este navegador). */
function seenNight(game: number): number {
  try {
    return Number(localStorage.getItem(`noche:${game}`) ?? 0);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
function markSeen(game: number, n: number) {
  try {
    localStorage.setItem(`noche:${game}`, String(n));
  } catch {
    /* sin almacenamiento: se verá otra vez, no pasa nada */
  }
}

export function MapView({ state, draft, setDraft, act, night, setNight }: Props) {
  const now = state.casillas ?? [];
  const next = nextResolution(state);
  const nightsOpen = state.partida.estado === "active" && state.partida.ordenesAbiertas ? queueNights(state) : 1;
  const k = Math.min(night, nightsOpen - 1);
  // Noches en cola: el mapa muestra cómo quedaría si todo sale como esperas.
  const plan = useMemo(() => (nightsOpen > 1 ? project(state, draft) : null), [state, draft, nightsOpen]);
  const tiles = k > 0 && plan ? plan.maps[k]! : now;
  const nightDraft = draft.filter((o) => nightOf(o, next) === next + k);
  const otherNights = draft.filter((o) => nightOf(o, next) !== next + k);
  const cols = state.partida.columnas ?? 5;
  const me = state.yo.casa;
  const [selected, setSelected] = useState<number | null>(null);
  const [compose, setCompose] = useState<Compose | null>(null);
  const open = !!state.partida.ordenesAbiertas;
  const rows = state.partida.filas ?? 5;
  const mine = state.casas.find((h) => h.id === me);
  const [showLast, setShowLast] = useState(false);
  // Bloque 8: aliados en vigor (paso libre) y casas con la alianza en aviso (ni atacar ni entrar).
  const allies = useMemo(() => myAllies(state), [state]);
  const breaking = useMemo(() => myBreaking(state), [state]);
  const bound = useMemo(() => [...allies, ...breaking], [allies, breaking]);

  // Lo que pasó en la última resolución (solo lo que esta casa pudo ver).
  const last = state.partida.resolucionActual;
  const lastEvents = (state.eventos ?? []).filter((e) => e.resolucion === last && last > 0);
  const combats = lastEvents.filter((e) => e.tipo === "combate");
  const battles = new Set(combats.map((e) => Number(e.datos.tile)));
  const conquests = combats.filter((e) => e.datos.conquered).length;
  const lastMoves = lastEvents
    .filter((e) => e.tipo === "movimiento")
    .map((e) => e.datos as { house: number; from: number; to: number; troops: number });
  // Avisos: casillas tuyas que un enemigo a la vista puede atacar, y estandartes vistos esta noche.
  // Las casas con las que tienes alianza no amenazan (no os podéis atacar).
  const threatened = useMemo(
    () =>
      k === 0 && me != null
        ? threats(now, me)
            .map((x) => ({ ...x, by: x.by.filter((h) => !bound.includes(h)) }))
            .filter((x) => x.by.length > 0)
        : [],
    [now, me, k, bound],
  );
  const threatAt = new Map(threatened.map((x) => [x.tile, x.by]));
  const banners = k === 0 ? lastEvents.filter((e) => e.tipo === "estandartes").map((e) => e.datos as { house: number; tile: number; troops: number; near: number }) : [];
  const bannerNear = new Map(banners.map((b) => [b.near, b]));

  // Repetición de la noche: sale sola la primera vez que abres el mapa tras una resolución.
  const replayable = useMemo(() => last > 0 && replaySteps(lastEvents, now).steps.length > 0, [JSON.stringify(lastEvents.map((e) => e.id)), now, last]);
  const [replay, setReplay] = useState(false);
  const [chrome, setChrome] = useState<HTMLDivElement | null>(null);
  const [dock, setDock] = useState(64);
  useEffect(() => {
    if (replay) setDock(document.querySelector(".tabs")?.getBoundingClientRect().height ?? 64);
  }, [replay]);
  const boardRef = useRef<HTMLDivElement>(null);
  /** Sube la página hasta que el mapa quede entero bajo la cabecera fija. */
  const showBoard = () => {
    const el = boardRef.current;
    if (!el) return;
    const header = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 8, behavior: "smooth" });
  };
  useEffect(() => {
    if (!replayable || seenNight(state.partida.id) >= last) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setNight(0);
    setReplay(true);
    showBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayable, last, state.partida.id]);
  const endReplay = () => {
    markSeen(state.partida.id, last);
    setReplay(false);
  };

  // El dibujo del mundo: terreno, banderas, tropas a la vista, empalizadas y batallas.
  const world = useMemo(
    () => ({
      cols,
      rows,
      seed: state.partida.id,
      coast: state.partida.costa ?? null,
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
          river: t.river ?? 0,
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(tiles), JSON.stringify(state.casas.map((h) => [h.id, h.color])), last, [...battles].join()],
  );
  const img = useWorldMeta(world);
  const W = img.width;
  const H = img.height;
  const geo = useMemo(() => geoOf(img), [img]);
  const tileAt = useMemo(() => new Map(tiles.map((t) => [`${t.x},${t.y}`, t])), [tiles]);
  const ownerAt = (x: number, y: number) => tileAt.get(`${x},${y}`)?.owner;
  // Un banderín por trozo de territorio (en su casilla de más arriba a la izquierda), no en cada casilla.
  const bannerHere = (t: TileView) =>
    geo.neighbours(t.x, t.y).every(([nx, ny]) => !(ny < t.y || (ny === t.y && nx < t.x)) || ownerAt(nx, ny) !== t.owner);

  // Zoom (bloque 6): todo el reino, normal (2 px de pantalla por píxel del dibujo, unas
  // 3 casillas de ancho en un móvil) y cerca; con el botón, la pinza o dos toques.
  const viewport = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { level, setLevel, scale } = useMapZoom(viewport, wrapRef, W);
  const close = level > 0;
  const focus = useRef<{ x: number; y: number } | null>(null);
  // Ficha de la casilla (bloque 6): hoja que sube desde abajo, encima del mapa.
  const [sheet, setSheet] = useState<SheetState>("peek");
  /** Arrastre en curso desde una casilla tuya (bloque 6) e información rápida de la casilla pulsada. */
  const [drag, setDrag] = useState<{ from: number; over: number | null } | null>(null);
  const [quick, setQuick] = useState<number | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [sheetH, setSheetH] = useState(0);
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [replay]);
  /** Alto de la ventana del mapa que no tapa la hoja. */
  const visibleH = (el: HTMLElement) => {
    const top = sheetRef.current?.getBoundingClientRect().top;
    const r = el.getBoundingClientRect();
    return top == null ? el.clientHeight : Math.max(80, Math.min(el.clientHeight, top - r.top));
  };
  const centerOn = (x: number, y: number) => {
    const el = viewport.current;
    if (!el) return;
    const [cx, cy] = geo.center(x, y);
    el.scrollLeft = cx * scale - el.clientWidth / 2;
    el.scrollTop = cy * scale - visibleH(el) / 2;
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

  const committed = (tileId: number, guest = false) =>
    nightDraft.filter((o) => o.desde === tileId && !!o.dePaso === guest).reduce((a, o) => a + o.tropas, 0);
  /** Tropas de cada tipo que quedan libres en una casilla tras las órdenes ya dadas (las propias o las de paso). */
  const freeUnits = (tileId: number, guest = false): Units => {
    const t = tiles.find((x) => x.id === tileId);
    const stack = guest ? myGuests(t, me) : t && t.troops != null ? { ...t, troops: t.troops } : undefined;
    if (!stack) return NO_UNITS;
    return nightDraft
      .filter((o) => o.desde === tileId && !!o.dePaso === guest)
      .reduce((u, o) => subUnits(u, unitsOf({ troops: o.tropas, jinetes: o.jinetes, catapultas: o.catapultas })), unitsOf(stack));
  };
  const tile = tiles.find((t) => t.id === selected) ?? null;
  const byId = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  // Para el motor, las tropas que no se ven cuentan como 0: solo importa el terreno y quién manda.
  const engineTiles = useMemo(() => tiles.map(asTile), [tiles]);

  /** Casillas a las que puede ir una orden desde `c.from`. */
  const isTargetFor = (c: Pick<Compose, "from" | "mode" | "guest">, t: TileView) => {
    const from = byId.get(c.from)!;
    if (c.mode === "capitan") {
      return me != null && t.owner === me && t.id !== from.id && marchKind(asTile(from), asTile(t), engineTiles, me, undefined, allies) != null;
    }
    if (c.mode === "mover") {
      // Vecinas, y además por camino (dos casillas), por mar (de puerto a puerto)
      // o a la carga (solo jinetes, por lo llano). A la montaña solo sube la Mesnada.
      // Bloque 8: en las casillas aliadas se entra (nunca en su castillo); en las de
      // una alianza en aviso no se entra, salvo para mover por ellas las tropas de paso.
      if (t.type === "castillo" && t.castleOf !== me) return false;
      if (me == null) return false;
      if (t.owner != null && breaking.includes(t.owner) && !c.guest) return false;
      const free = freeUnits(from.id, c.guest);
      if (t.type === "montana" && free.mesnada === 0) return false;
      if (marchKind(asTile(from), asTile(t), engineTiles, me, undefined, allies) != null) return true;
      return free.jinetes > 0 && marchKind(asTile(from), asTile(t), engineTiles, me, RIDERS_ONLY(free.jinetes), allies) === "carga";
    }
    if (!areAdjacent(from, t)) return false;
    if (c.mode === "sitiar") return siegeable(t, me, bound);
    return t.type !== "castillo";
  };

  // Bloque 6: mientras se arrastra desde una casilla, se marcan sus destinos como al mover.
  const isTarget = (t: TileView) =>
    compose ? isTargetFor(compose, t) : drag ? isTargetFor({ from: drag.from, mode: "mover" }, t) : false;

  // Bloque 6: órdenes con el dedo. Desde la casilla tuya que tienes elegida, arrastrar
  // hasta otra prepara la orden (y la hoja pide confirmarla); mantener pulsada
  // cualquier casilla enseña su información rápida mientras no se suelta.
  const gesture = useRef<{ pointer: number; tile: TileView; x: number; y: number; timer: number; drag: boolean; long: boolean } | null>(null);
  const swallowClick = useRef(false);
  const swallow = () => {
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 400);
  };
  const canDragFrom = (t: TileView) => {
    if (!open || !close || compose || me == null || t.owner !== me || selected !== t.id) return false;
    const u = freeUnits(t.id);
    return u.mesnada + u.jinetes + u.catapultas > 0;
  };
  /** La casilla bajo un punto de la pantalla, por la forma del dibujo (las cajas de los botones se solapan). */
  const tileUnder = (clientX: number, clientY: number): TileView | undefined => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return undefined;
    const [gx, gy] = geo.cellAt((clientX - r.left) / scale, (clientY - r.top) / scale);
    return tileAt.get(`${gx},${gy}`);
  };
  const tilePointer = {
    down: (e: PointerEvent<HTMLButtonElement>, t: TileView) => {
      if (gesture.current) window.clearTimeout(gesture.current.timer);
      const g = { pointer: e.pointerId, tile: t, x: e.clientX, y: e.clientY, timer: 0, drag: false, long: false };
      g.timer = window.setTimeout(() => {
        if (g.drag || gesture.current !== g) return;
        g.long = true;
        setQuick(t.id);
      }, LONG_PRESS_MS);
      gesture.current = g;
      if (canDragFrom(t)) e.currentTarget.setPointerCapture(e.pointerId);
    },
    move: (e: PointerEvent<HTMLButtonElement>) => {
      const g = gesture.current;
      if (!g || g.pointer !== e.pointerId) return;
      if (!g.drag && Math.hypot(e.clientX - g.x, e.clientY - g.y) < DRAG_SLOP_PX) return;
      window.clearTimeout(g.timer);
      if (g.long || !canDragFrom(g.tile)) return;
      g.drag = true;
      const over = tileUnder(e.clientX, e.clientY);
      setDrag({ from: g.tile.id, over: over?.id ?? null });
    },
    up: (e: PointerEvent<HTMLButtonElement>) => {
      const g = gesture.current;
      if (!g || g.pointer !== e.pointerId) return;
      gesture.current = null;
      window.clearTimeout(g.timer);
      if (g.long) {
        swallow();
        setQuick(null);
      }
      if (g.drag) {
        swallow();
        setDrag(null);
        const over = tileUnder(e.clientX, e.clientY);
        if (over && over.id !== g.tile.id && isTargetFor({ from: g.tile.id, mode: "mover" }, over)) {
          setCompose({ from: g.tile.id, mode: "mover", target: over.id, mix: freeUnits(g.tile.id), apoyaDesde: null });
          openSheet();
        }
      }
    },
    cancel: () => {
      if (gesture.current) window.clearTimeout(gesture.current.timer);
      gesture.current = null;
      setQuick(null);
      setDrag(null);
    },
  };

  const onTile = (t: TileView) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    // En la vista de todo el reino, tocar una casilla acerca el mapa a ella.
    if (!close) {
      focus.current = { x: t.x, y: t.y };
      setLevel(1);
      setSelected(t.id);
      openSheet();
      return;
    }
    if (compose && compose.target == null && isTarget(t)) {
      setCompose({ ...compose, target: t.id });
      openSheet();
      return;
    }
    setSelected(t.id);
    setCompose(null);
    openSheet();
  };
  const openSheet = () => setSheet((s) => (s === "full" ? "full" : "half"));
  const closeSheet = () => {
    setSelected(null);
    setCompose(null);
    setSheet("peek");
  };
  // El mapa se mueve para que la casilla elegida no quede bajo la hoja (cuando la hoja ya ha subido).
  useEffect(() => {
    if (selected == null || !close) return;
    const t = window.setTimeout(() => {
      const el = viewport.current;
      const tl = tiles.find((x) => x.id === selected);
      if (!el || !tl) return;
      const [cx, cy] = geo.center(tl.x, tl.y);
      const x = cx * scale - el.scrollLeft;
      const y = cy * scale - el.scrollTop;
      const h = visibleH(el);
      const m = 48;
      if (x < m || x > el.clientWidth - m || y < m || y > h - m) {
        el.scrollTo({ left: cx * scale - el.clientWidth / 2, top: cy * scale - h / 2, behavior: "smooth" });
      }
    }, 230);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, sheet, scale]);


  // Frontera de cada casa: una línea de su color (con un filo claro por dentro)
  // solo en los lados donde la casilla vecina es de otro dueño.
  const frontier = (t: TileView) =>
    geo.neighbours(t.x, t.y)
      .filter(([nx, ny]) => ownerAt(nx, ny) !== t.owner)
      .map(([nx, ny]) => ({ outer: sharedEdge(geo, t.x, t.y, nx, ny, 1.5), inner: sharedEdge(geo, t.x, t.y, nx, ny, 4) }));

  const nightNames = Array.from({ length: nightsOpen }, (_, i) => nightLabel(state.partida, i));
  return (
    <div className="map-screen">
      {nightsOpen > 1 && (
        <div className="nights" role="tablist" aria-label="Noche para la que das órdenes">
          {nightNames.map((label, i) => {
            const count = draft.filter((o) => nightOf(o, next) === next + i).length;
            return (
              <button
                key={i}
                role="tab"
                aria-selected={k === i}
                className={k === i ? "active" : ""}
                onClick={() => {
                  setNight(i);
                  setCompose(null);
                }}
              >
                {label}
                {count > 0 && <span className="badge">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
      {k > 0 && (
        <p className="plan-note">
          Órdenes en cola para {nightLabel(state.partida, k, true)}. El mapa muestra cómo quedaría si todo sale como esperas; las
          demás casas también mueven, y al llegar la noche cada orden sale con las tropas que queden.
        </p>
      )}
      <div className={`board${replay ? " replaying" : ""}${k > 0 ? " planning" : ""}`} ref={boardRef}>
        {quick != null && byId.get(quick) && (
          <QuickInfo
            tile={byId.get(quick)!}
            state={state}
            resolution={next}
            at={(() => {
              const t = byId.get(quick)!;
              const el = viewport.current;
              const board = boardRef.current;
              if (!el || !board) return { left: 0, top: 0, below: true };
              const [cx, cy] = geo.center(t.x, t.y);
              const vr = el.getBoundingClientRect();
              const br = board.getBoundingClientRect();
              const top = vr.top - br.top + cy * scale - el.scrollTop;
              const left = Math.min(br.width - 100, Math.max(100, vr.left - br.left + cx * scale - el.scrollLeft));
              return { left, top, below: top < 150 };
            })()}
          />
        )}
        <button className="zoom" onClick={() => setLevel(close ? 0 : 1)} aria-pressed={!close}>
          {close ? "Ver todo el reino" : "Acercar"}
        </button>
        <div className={`map-viewport ${close ? "close" : "whole"}`} ref={viewport}>
        <div className="world-wrap" ref={wrapRef} style={{ width: W * scale, height: H * scale }}>
          <WorldCanvas opts={world} label="Mapa de Aldricia" />
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
            {/* Bloque 8: casillas de tus aliados, con un filo de puntos (las de una alianza en aviso, más apagado). */}
            {tiles
              .filter((t) => t.owner != null && bound.includes(t.owner))
              .map((t) => (
                <polygon key={`al${t.id}`} points={points(t, 3)} className={allies.includes(t.owner!) ? "cell-ally" : "cell-ally ending"} />
              ))}
            {!replay &&
              tiles
                .filter((t) => threatAt.has(t.id))
                .map((t) => <polygon key={`a${t.id}`} points={points(t, 2.5)} className="cell-threat" />)}
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
                    onPointerDown={(e) => tilePointer.down(e, t)}
                    onPointerMove={tilePointer.move}
                    onPointerUp={tilePointer.up}
                    onPointerCancel={tilePointer.cancel}
                    onContextMenu={(e) => e.preventDefault()}
                    style={canDragFrom(t) ? { touchAction: "none" } : undefined}
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
                      {(t.guests ?? []).length > 0 && <small className="tile-guests">+{t.guests!.reduce((a, g) => a + g.troops, 0)}</small>}
                    </span>
                  )}
                  {(t.capitanes ?? []).length > 0 && (
                    <span className="tile-captain" aria-hidden title="Capitán">
                      <Icon name="capitan" size={14} color={t.capitanes!.includes(me ?? -1) ? "#f1cf7d" : "#d9d2c3"} />
                    </span>
                  )}
                  {k === 0 && battles.has(t.id) && (
                    <span className="tile-battle" aria-hidden title="Batalla en la última resolución">
                      <Icon name="ordenes" size={14} color="#f1cf7d" />
                    </span>
                  )}
                  {bannerNear.has(t.id) && (
                    <span className="tile-alert" aria-hidden title="Se ven estandartes al lado">
                      <Icon name="estandarte" size={14} color={TERRITORY[state.casas.find((h) => h.id === bannerNear.get(t.id)!.house)?.color ?? ""] ?? "#fff"} />
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
              {/* Las órdenes de las otras noches de la cola, punteadas y apagadas: la ruta a varios días. */}
              {!replay &&
                otherNights.map((o, i) => {
                  const a = byId.get(o.desde);
                  const b = byId.get(o.hacia);
                  if (!a || !b) return null;
                  return (
                    <Arrow
                      key={`q${i}`}
                      geo={geo}
                      from={a}
                      to={b}
                      color={TERRITORY[mine?.color ?? ""] ?? "#f1cf7d"}
                      width={1.2 + Math.min(2, o.tropas / 5)}
                      dashed
                      queued
                    />
                  );
                })}
              {!replay && nightDraft.map((o, i) => {
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
                    label={o.tropas === 0 && o.capitan ? "C" : o.tropas}
                  />
                );
              })}
              {drag && drag.over != null && drag.over !== drag.from && byId.get(drag.from) && byId.get(drag.over) && (
                <Arrow
                  geo={geo}
                  from={byId.get(drag.from)!}
                  to={byId.get(drag.over)!}
                  color={isTarget(byId.get(drag.over)!) ? TERRITORY[mine?.color ?? ""] ?? "#f1cf7d" : "#8a7560"}
                  width={2.5}
                  dashed
                />
              )}
          </svg>
          {replay && (
            <NightReplay
              geo={geo}
              W={W}
              H={H}
              tiles={now}
              houses={state.casas}
              events={lastEvents}
              seed={`${state.partida.id}:${last}`}
              resolution={last}
              onFocus={(x, y) => {
                const el = viewport.current;
                if (!el || !close) return;
                const [cx, cy] = geo.center(x, y);
                el.scrollTo({ left: cx * scale - el.clientWidth / 2, top: cy * scale - el.clientHeight / 2, behavior: "smooth" });
              }}
              onClose={endReplay}
              chrome={chrome}
            />
          )}
        </div>
        {/* Sitio para desplazar el mapa por encima de la hoja: ninguna casilla se queda debajo. */}
        {close && <div className="sheet-room" style={{ height: sheetH }} aria-hidden />}
        </div>
      </div>
      {/* Franja de la repetición: fija abajo, encima de las pestañas, para que se lea siempre. */}
      <div className="replay-chrome" ref={setChrome} style={{ bottom: dock }} hidden={!replay} />
      {!replay && (
        <Sheet
          ref={sheetRef}
          state={sheet}
          setState={setSheet}
          onClose={tile || compose ? closeSheet : undefined}
          label={tile ? `Ficha de ${tile.nombre}` : "Lo último en el mapa"}
        >
          {compose ? (
            <Composer
              state={state}
              compose={compose}
              setCompose={setCompose}
              byId={byId}
              available={freeUnits(compose.from, compose.guest)}
              allies={allies}
              engineTiles={engineTiles}
              captainHere={
                !compose.guest && !!byId.get(compose.from)?.capitanes?.includes(me ?? -1) && !nightDraft.some((o) => o.capitan)
              }
              onAdd={(o) => {
                setDraft([...draft, { ...o, resolucion: next + k, ...(compose.guest ? { dePaso: true } : {}) }]);
                setCompose(null);
              }}
            />
          ) : tile ? (
            <TilePanel
              state={state}
              tile={tile}
              available={(tile.troops ?? 0) - committed(tile.id)}
              guestsAvailable={(myGuests(tile, me)?.troops ?? 0) - committed(tile.id, true)}
              bound={bound}
              allies={allies}
              open={open}
              planning={k > 0}
              captainHere={!!tile.capitanes?.includes(me ?? -1) && !nightDraft.some((o) => o.capitan)}
              onOrder={(mode, guest) => {
                setCompose({ from: tile.id, mode, target: null, mix: freeUnits(tile.id, guest), apoyaDesde: null, ...(guest ? { guest: true } : {}) });
                // Mientras eliges el destino, la hoja se encoge para ver el mapa.
                setSheet("peek");
              }}
              onFortify={() => act(() => api.fortify(state.partida.id, tile.id), "Murallas reforzadas.")}
            />
          ) : (
            <>
              {k === 0 && threatened.length > 0 && (
                <p className="threat-note">
                  <span className="threat-swatch" aria-hidden />
                  {threatened.length === 1
                    ? `${tiles.find((t) => t.id === threatened[0]!.tile)?.nombre ?? "Una casilla"} está al alcance de ${withArticle(houseName(state.casas, threatened[0]!.by[0]))}.`
                    : `${threatened.length} casillas tuyas están al alcance de un enemigo a la vista.`}
                </p>
              )}
              {banners.length > 0 && (
                <ul className="banner-alerts">
                  {banners.map((b, i) => (
                    <li key={i}>
                      <Icon name="estandarte" size={18} color={TERRITORY[state.casas.find((h) => h.id === b.house)?.color ?? ""] ?? "#fff"} />
                      Se ven estandartes de {withArticle(houseName(state.casas, b.house))} en {now.find((t) => t.id === b.tile)?.nombre} ({troopsWord(b.troops)}), junto a{" "}
                      {now.find((t) => t.id === b.near)?.nombre}.
                    </li>
                  ))}
                </ul>
              )}
              {k === 0 && (battles.size > 0 || lastMoves.length > 0) && (
                <div className="war-report">
                  <span>
                    <Icon name="ordenes" size={18} color="#f1cf7d" />
                    {battles.size > 0
                      ? `${battles.size} ${battles.size === 1 ? "batalla" : "batallas"} en la última resolución`
                      : "Movimientos de la última resolución"}
                    {conquests > 0 && ` · ${conquests} ${conquests === 1 ? "casilla cambia" : "casillas cambian"} de bandera`}
                  </span>
                  <span className="war-actions">
                    {replayable && (
                      <button
                        className="link"
                        onClick={() => {
                          setReplay(true);
                          showBoard();
                        }}
                        disabled={replay}
                      >
                        Ver la noche
                      </button>
                    )}
                    <button className="link" onClick={() => setShowLast(!showLast)} aria-pressed={showLast}>
                      {showLast ? "Ocultar" : "Flechas"}
                    </button>
                  </span>
                </div>
              )}
              {/* La ayuda, solo si no hay nada más que contar: la hoja asomada solo enseña lo primero. */}
              {!(k === 0 && threatened.length > 0) && banners.length === 0 && !(k === 0 && (battles.size > 0 || lastMoves.length > 0)) && (
                <p className="hint">Toca una casilla con la frontera de tu color (al principio, tu castillo) y arrastra desde ella hasta otra para mover o atacar. Mantén pulsada cualquier casilla para ver quién la tiene y su defensa.</p>
              )}
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

/** Lo que se ve al mantener pulsada una casilla (bloque 6): dueño, tropas y defensa. */
function QuickInfo({ tile, state, resolution, at }: { tile: TileView; state: GameState; resolution: number; at: { left: number; top: number; below: boolean } }) {
  const defense = Math.round((defenseMultiplier(asTile(tile), resolution, false) - 1) * 100);
  const fortified = tile.fortifiedUntil != null && tile.fortifiedUntil >= resolution;
  return (
    <div className={`quick-info${at.below ? " below" : ""}`} style={{ left: at.left, top: at.top }} role="status">
      <strong>{tile.nombre}</strong>
      <span>
        {TILE_LABEL[tile.type]} · {tile.owner != null ? houseName(state.casas, tile.owner) : "neutral"}
      </span>
      <span>Tropas: {tile.troops == null ? "sin ver" : troopsText(tile.troops, tile.jinetes ?? 0, tile.catapultas ?? 0)}</span>
      <span>
        Defensa: {defense > 0 ? `+${defense}%` : "sin ventaja"}
        {fortified && " · fortificada"}
      </span>
    </div>
  );
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
  queued,
  label,
}: {
  geo: Geo;
  from: TileView;
  to: TileView;
  color: string;
  width: number;
  dashed?: boolean;
  past?: boolean;
  /** Orden de otra noche de la cola. */
  queued?: boolean;
  /** Tropas de la orden ("C": el Capitán va solo). */
  label?: number | string;
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
    <g className={past ? "arrow past" : queued ? "arrow queued" : "arrow"}>
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
  guestsAvailable,
  bound,
  allies,
  open,
  planning,
  captainHere,
  onOrder,
  onFortify,
}: {
  state: GameState;
  tile: TileView;
  available: number;
  /** Bloque 8: tus tropas de paso aquí que aún no tienen orden esa noche. */
  guestsAvailable: number;
  /** Casas con las que tienes alianza (en vigor o en aviso) y solo las en vigor. */
  bound: number[];
  allies: number[];
  open: boolean;
  /** Se están dando órdenes en cola: fortificar es de hoy, no se planea. */
  planning?: boolean;
  /** Tu Capitán está aquí y aún no va con ninguna orden esa noche. */
  captainHere?: boolean;
  onOrder: (mode: Mode, guest?: boolean) => void;
  onFortify: () => void;
}) {
  const me = state.yo.casa;
  const ally = tile.owner != null && bound.includes(tile.owner);
  const alliance = ally ? state.alianzas?.lista.find((a) => a.casas.includes(me) && a.casas.includes(tile.owner!)) : undefined;
  const mine = tile.owner === state.yo.casa;
  const owner = tile.owner != null ? state.casas.find((h) => h.id === tile.owner) : undefined;
  const note =
    tile.type === "castillo" ? null : TILE_NAMES[tile.type]?.find((n) => tile.nombre.startsWith(n.name))?.note ?? null;
  const fortified = tile.fortifiedUntil != null && tile.fortifiedUntil > state.partida.resolucionActual;
  // Sitiar: hay al lado una fortaleza o un castillo ajeno.
  const canSiege = (state.casillas ?? []).some((t) => siegeable(t, state.yo.casa, bound) && areAdjacent(t, tile));
  return (
    <section className="card tile-panel">
      <div className="tile-head">
        <TileArt type={tile.type} flag={owner ? HOUSE_COLORS[owner.color]?.hex : null} className="thumb" />
        <div className="grow">
          <h2>{tile.nombre}</h2>
          <p className="muted">
            {TILE_LABEL[tile.type]} · {mine ? "tuya" : tile.owner ? houseName(state.casas, tile.owner) : "neutral"}
            {fortified && (BATTLE_TWEAKS.fortifyUntilAttacked ? " · fortificada hasta que la ataquen" : " · fortificada")}
          </p>
        </div>
        <div className="troop-count">
          {tile.troops ?? "?"}
          <small>{tile.troops == null ? (tile.hidden ? "escondidas" : "sin ver") : tile.troops === 1 ? "tropa" : "tropas"}</small>
        </div>
      </div>
      {note && <p className="note">«{note}»</p>}
      {alliance && (
        <p className="ally-note">
          Casilla aliada: <em>{alliance.nombre}</em>
          {alliance.estado === "aviso"
            ? ". La alianza está en aviso: no se puede entrar, solo sacar tus tropas."
            : tile.type === "castillo"
              ? ". En su castillo no se entra."
              : allies.includes(tile.owner!)
                ? ". Puedes entrar con tus tropas sin combatir."
                : "."}
        </p>
      )}
      {(tile.guests ?? []).map((g) => (
        <p key={g.house} className="guest-note">
          {g.house === me ? "Tus tropas de paso aquí" : `Tropas de paso de ${houseName(state.casas, g.house)}`}: {troopsText(g.troops, g.jinetes, g.catapultas)}.
          {" "}Defienden la casilla si la atacan.
        </p>
      ))}
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
      {riverNote(tile, state.casillas ?? []) && <p className="muted terrain-note">{riverNote(tile, state.casillas ?? [])}</p>}
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
      {!mine && open && guestsAvailable > 0 && (
        <div className="actions">
          <button className="primary grow" onClick={() => onOrder("mover", true)}>
            Mover tus tropas de paso
          </button>
          {alliance?.estado !== "aviso" && <button onClick={() => onOrder("apoyar", true)}>Apoyar</button>}
          {alliance?.estado !== "aviso" && canSiege && <button onClick={() => onOrder("sitiar", true)}>Sitiar</button>}
        </div>
      )}
      {mine && open && captainHere && BATTLE_TWEAKS.captainAlone && (
        <button className="secondary wide" onClick={() => onOrder("capitan")}>
          <Icon name="capitan" size={18} color="#d6a64b" /> Mover al Capitán solo
        </button>
      )}
      {mine && !planning && tile.type !== "castillo" && !fortified && (
        <button className="secondary wide" onClick={onFortify}>
          <Icon name="muralla" size={18} color="#827d8a" /> Fortificar: {fortifyCost(tile).piedra} de Piedra, +25% de defensa{" "}
          {BATTLE_TWEAKS.fortifyUntilAttacked
            ? `hasta que la ataquen (${FORTIFY_UPKEEP.piedra ?? 0} de Piedra cada domingo)`
            : (state.partida.fortificarResoluciones ?? 2) === 1
              ? "una resolución"
              : `${state.partida.fortificarResoluciones ?? 2} resoluciones`}
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
  allies,
  captainHere,
  onAdd,
}: {
  state: GameState;
  allies: number[];
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
  const me = state.yo.casa;
  // Bloque 8: a una casilla aliada se entra sin combatir (quedan como tropas de paso).
  const entering = compose.mode === "mover" && target?.owner != null && allies.includes(target.owner);
  const verb =
    compose.mode === "capitan"
      ? "Mover al Capitán"
      : entering
        ? "Entrar"
        : compose.mode === "mover"
          ? "Mover o atacar"
          : compose.mode === "sitiar"
            ? "Sitiar"
            : "Apoyar";
  // Qué tipos pueden ir: a la carga solo jinetes; a la montaña solo Mesnada; los apoyos, sin catapultas.
  const charge =
    target != null &&
    compose.mode === "mover" &&
    me != null &&
    marchKind(asTile(from), asTile(target), engineTiles, me, undefined, allies) == null;
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
  if (compose.mode === "capitan") {
    return (
      <section className="card composer">
        <h2>
          {verb} desde {from.nombre}
        </h2>
        {!target ? (
          <p>Toca una casilla tuya marcada: una vecina, o más lejos por un camino tuyo o por mar desde un puerto.</p>
        ) : (
          <>
            <p>
              Destino: <strong>{target.nombre}</strong>
            </p>
            <p className="hint">
              Va solo, sin tropas, y no ataca. Allí suma 2 a la defensa, pero si atacan la casilla y no la defienden, cae preso.
            </p>
            <div className="actions">
              <button
                className="primary"
                onClick={() => onAdd({ tipo: "mover", desde: from.id, hacia: target.id, apoyaDesde: null, tropas: 0, capitan: true })}
              >
                Añadir orden: el Capitán va solo
              </button>
            </div>
          </>
        )}
        <button className="link" onClick={() => setCompose(null)}>
          Cancelar
        </button>
        {state.partida.ordenesAbiertas === false && <p className="error">Las órdenes están cerradas.</p>}
      </section>
    );
  }
  return (
    <section className="card composer">
      <h2>
        {verb} desde {from.nombre}
        {compose.guest && " (tropas de paso)"}
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
            {entering ? "Destino" : "Objetivo"}: <strong>{target.nombre}</strong>
            {entering && " · casilla aliada: entras sin combatir y tus tropas quedan de paso"}
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
                <option value={ANY_ORIGIN}>El primer ataque a {target.nombre}</option>
              </select>
              {compose.apoyaDesde === ANY_ORIGIN && (
                <span className="hint">
                  Suma a tu propio ataque si lo hay; si no, al de la casa que dio antes su orden.
                </span>
              )}
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
                  tipo: compose.mode as Exclude<Mode, "capitan">,
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

/** Ríos (bloque 1): cuántas vecinas quedan al otro lado de un río y si hay puente. */
function riverNote(tile: TileView, all: TileView[]): string | null {
  if (!tile.river || !RIVERS.enabled) return null;
  const tiles = all as unknown as Tile[];
  const across = all.filter((o) => areAdjacent(o, tile) && riverBetween(tile, o));
  if (!across.length) return null;
  const bridges = across.filter((o) => bridgeBetween(tile as unknown as Tile, o as unknown as Tile, tiles)).length;
  const n = across.length - bridges;
  const pct = Math.round(RIVERS.defense * 100);
  const parts = [
    n > 0 ? `Un río la separa de ${n === 1 ? "una vecina" : `${n} vecinas`}: atacar cruzándolo da +${pct}% al defensor.` : null,
    bridges > 0 ? `${bridges === 1 ? "Un puente lo cruza" : `${bridges} puentes lo cruzan`} sin desventaja.` : null,
  ];
  return parts.filter(Boolean).join(" ");
}
