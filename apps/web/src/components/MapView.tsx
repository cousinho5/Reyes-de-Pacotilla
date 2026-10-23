import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { BATTLE_TWEAKS, DEFENSE_BONUS, SIEGE, defenseMultiplier, FORTIFY_UPKEEP, RIVERS, TILE_NAMES, TILE_PRODUCTION, areAdjacent, bridgeBetween, fortifyCost, marchKind, riverBetween, subUnits, threats, unitsOf, type Tile, type Units } from "@reyes/engine";
import { api, type GameState, type OrderView, type TileView } from "../api";
import { Icon, ResourceIcon, ShieldIcon, TileArt } from "../art";
import { useOpenHouse } from "../houseSheet";
import { cellBox, sharedEdge, type Geo } from "../art/grid";
import { geoOf } from "../art/world";
import { WorldCanvas, useWorldMeta } from "./WorldCanvas";
import { HOUSE_COLORS, RESOURCE_LABEL, TERRAIN_NOTE, TERRITORY, TILE_LABEL, UNIT_LABEL, captainOf, houseName, nightLabel, troops as troopsWord, troopsText, wallsLeft, withArticle } from "../ui";
import { asTile, myAllies, myBreaking, nextResolution, nightOf, project, queueNights, whatIfAttacked } from "../plan";
import { VERB_LABEL, orderOf, share, verbOf, verbTitle, verbsFor, type Verb } from "../verbs";
import { NightReplay, replaySteps } from "./NightReplay";
import { useMapZoom } from "./useMapZoom";
import { Sheet, type SheetState } from "./Sheet";

interface Props {
  state: GameState;
  draft: OrderView[];
  /** `note`: el aviso al guardar (si no, el de siempre). */
  setDraft: (o: OrderView[], note?: string) => void;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
  /** Bloque 12: una orden que abrir para cambiarla (desde la pestaña Órdenes). */
  editOrder?: OrderView | null;
  onEditOpened?: () => void;
  /** Noche de la cola que se está planeando (0 = la próxima resolución). */
  night: number;
  setNight: (n: number) => void;
  /** Bloque 10: abrir Comercio (el aviso de la Gran Subasta abierta). */
  onOpenTrade?: () => void;
  /** Bloque 11: casilla en la que centrar el mapa al abrirlo («Ver en el mapa» de la ficha de casa). */
  focusTile?: number | null;
  onFocused?: () => void;
}

/** "orden": el destino propone el verbo (bloque 12); "capitan": el Capitán va solo, sin tropas, a otra casilla tuya (bloque 4). */
type Mode = "orden" | "capitan";
/**
 * `guest`: salen las tropas de paso de tu casa en esa casilla aliada (bloque 8).
 * `verb`: el elegido (si no, el propuesto). `edit`: la orden ya dada que se está cambiando.
 */
type Compose = { from: number; mode: Mode; target: number | null; verb?: Verb; mix: Units; capitan?: boolean; guest?: boolean; edit?: OrderView; repetir?: boolean };

/** Tus tropas de paso en una casilla aliada (bloque 8). */
const myGuests = (t: TileView | undefined, me: number) => t?.guests?.find((g) => g.house === me);

/** Capas del mapa (bloque 9): qué se pinta encima del terreno. */
type Layer = "territorio" | "recursos" | "defensa" | "alcance";
const LAYERS: { id: Layer; label: string; note: string }[] = [
  { id: "territorio", label: "Territorio", note: "De quién es cada casilla" },
  { id: "recursos", label: "Recursos", note: "Qué da cada casilla cada día" },
  { id: "defensa", label: "Defensa", note: `Lo que suma al +${Math.round(DEFENSE_BONUS.base * 100)}% de todo defensor: terreno, murallas y ríos` },
  { id: "alcance", label: "Alcance", note: "Adónde llegan esta noche tus tropas y las enemigas" },
];
function savedLayer(): Layer {
  try {
    const v = localStorage.getItem("capa-del-mapa");
    return LAYERS.some((l) => l.id === v) ? (v as Layer) : "territorio";
  } catch {
    return "territorio";
  }
}

const ordersText = (n: number) => (n === 0 ? "sin órdenes" : `${n} ${n === 1 ? "orden" : "órdenes"}`);

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

export function MapView({ state, draft, setDraft, act, night, setNight, editOrder, onEditOpened, onOpenTrade, focusTile, onFocused }: Props) {
  const openHouse = useOpenHouse();
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
  // Bloque 9: capa del mapa (se recuerda en este navegador), su menú y la leyenda.
  const [layer, setLayerState] = useState<Layer>(savedLayer);
  const setLayer = (l: Layer) => {
    setLayerState(l);
    try {
      localStorage.setItem("capa-del-mapa", l);
    } catch {
      /* sin almacenamiento: vuelve a Territorio la próxima vez */
    }
  };
  const [layersOpen, setLayersOpen] = useState(false);
  // Bloque 12: la etiqueta de la noche abre la lista rápida de órdenes en la hoja.
  const [ordersList, setOrdersList] = useState(false);
  // «¿Y si atacan?» (bloque 12): las casillas que perderías, marcadas en el mapa hasta que cambien tus órdenes.
  const [whatIf, setWhatIf] = useState<{ key: string; lost: { tile: number; by: number[]; troops: number }[] } | null>(null);
  const [legend, setLegend] = useState(false);
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
  const whatIfKey = JSON.stringify(draft.filter((o) => nightOf(o, next) === next));
  const lostIds = k === 0 && whatIf?.key === whatIfKey ? whatIf.lost.map((w) => w.tile) : [];
  const banners = k === 0 ? lastEvents.filter((e) => e.tipo === "estandartes").map((e) => e.datos as { house: number; tile: number; troops: number; near: number }) : [];
  const bannerNear = new Map(banners.map((b) => [b.near, b]));
  // Bloque 9: casillas con aviso (amenazas y estandartes), sin repetir.
  const threatIds = threatened.map((x) => x.tile);
  const bannerIds = [...new Set(banners.map((b) => b.near))];
  const alertIds = [...new Set([...threatIds, ...bannerIds])];

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
          stage: t.type === "castillo" ? state.casas.find((h) => h.id === t.castleOf)?.etapa : undefined,
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(tiles), JSON.stringify(state.casas.map((h) => [h.id, h.color, h.etapa])), last, [...battles].join()],
  );
  const img = useWorldMeta(world);
  const W = img.width;
  const H = img.height;
  const geo = useMemo(() => geoOf(img), [img]);
  const tileAt = useMemo(() => new Map(tiles.map((t) => [`${t.x},${t.y}`, t])), [tiles]);
  const ownerAt = (x: number, y: number) => tileAt.get(`${x},${y}`)?.owner;
  // Bloque 9: con todo el reino a la vista, un escudo por trozo de territorio (en su
  // castillo si lo tiene; si no, en la casilla más cercana al centro del trozo).
  const shields = useMemo(() => {
    const seen = new Set<number>();
    const out: { tile: TileView; house: number }[] = [];
    for (const start of tiles) {
      if (start.owner == null || seen.has(start.id)) continue;
      const chunk: TileView[] = [];
      const queue = [start];
      seen.add(start.id);
      while (queue.length) {
        const t = queue.pop()!;
        chunk.push(t);
        for (const [nx, ny] of geo.neighbours(t.x, t.y)) {
          const n = tileAt.get(`${nx},${ny}`);
          if (n && n.owner === start.owner && !seen.has(n.id)) {
            seen.add(n.id);
            queue.push(n);
          }
        }
      }
      const centers = chunk.map((t) => geo.center(t.x, t.y));
      const mx = centers.reduce((a, c) => a + c[0], 0) / chunk.length;
      const my = centers.reduce((a, c) => a + c[1], 0) / chunk.length;
      const castle = chunk.find((t) => t.type === "castillo" && t.castleOf === start.owner);
      const middle = chunk.reduce((best, t, i) =>
        Math.hypot(centers[i]![0] - mx, centers[i]![1] - my) < Math.hypot(geo.center(best.x, best.y)[0] - mx, geo.center(best.x, best.y)[1] - my) ? t : best,
      );
      out.push({ tile: castle ?? middle, house: start.owner });
    }
    return out;
  }, [tiles, geo, tileAt]);

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

  // Bloque 9: los avisos llevan a su casilla; si se vuelve a tocar, a la siguiente.
  const [flash, setFlash] = useState<number | null>(null);
  const cycle = useRef<Record<string, number>>({});
  const goTo = (id: number) => {
    const t = byId.get(id);
    const el = viewport.current;
    if (!t || !el) return;
    if (!close) {
      focus.current = { x: t.x, y: t.y };
      setLevel(1);
    } else {
      const [cx, cy] = geo.center(t.x, t.y);
      el.scrollTo({ left: cx * scale - el.clientWidth / 2, top: cy * scale - visibleH(el) / 2, behavior: "smooth" });
    }
    setFlash(id);
  };
  // Desde la ficha de una casa: a su castillo, con un destello.
  useEffect(() => {
    if (focusTile == null) return;
    onFocused?.();
    window.setTimeout(() => goTo(focusTile), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTile]);
  useEffect(() => {
    if (flash == null) return;
    const t = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(t);
  }, [flash]);
  const goNext = (key: string, ids: number[]) => {
    if (!ids.length) return;
    const i = (cycle.current[key] ?? -1) + 1;
    cycle.current[key] = i % ids.length;
    goTo(ids[i % ids.length]!);
  };
  // Lo que se ve del mapa, para las flechas del borde hacia los avisos que quedan fuera.
  const [view, setView] = useState({ left: 0, top: 0, w: 0, h: 0, ox: 0, oy: 0 });
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const br = boardRef.current?.getBoundingClientRect();
      setView({ left: el.scrollLeft, top: el.scrollTop, w: el.clientWidth, h: visibleH(el), ox: br ? r.left - br.left : 0, oy: br ? r.top - br.top : 0 });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, sheetH]);

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

  /** Tropas libres para una orden: al cambiar una ya dada, cuentan también las suyas. */
  const unitsFor = (c: Pick<Compose, "from" | "guest" | "edit">): Units => {
    const free = freeUnits(c.from, c.guest);
    const o = c.edit;
    if (!o) return free;
    const u = unitsOf({ troops: o.tropas, jinetes: o.jinetes, catapultas: o.catapultas });
    return { mesnada: free.mesnada + u.mesnada, jinetes: free.jinetes + u.jinetes, catapultas: free.catapultas + u.catapultas };
  };
  /** Puede marchar un grupo de `c.from` hasta `t` esta noche. */
  const canMarchTo = (c: Pick<Compose, "from" | "guest" | "edit">, t: TileView) => {
    const from = byId.get(c.from)!;
    // Vecinas, y además por camino (dos casillas), por mar (de puerto a puerto)
    // o a la carga (solo jinetes, por lo llano). A la montaña solo sube la Mesnada.
    // Bloque 8: en las casillas aliadas se entra (nunca en su castillo); en las de
    // una alianza en aviso no se entra, salvo para mover por ellas las tropas de paso.
    if (t.id === from.id) return false;
    if (t.type === "castillo" && t.castleOf !== me) return false;
    if (me == null) return false;
    if (t.owner != null && breaking.includes(t.owner) && !c.guest) return false;
    const free = unitsFor(c);
    if (t.type === "montana" && free.mesnada === 0) return false;
    if (marchKind(asTile(from), asTile(t), engineTiles, me, undefined, allies) != null) return true;
    return free.jinetes > 0 && marchKind(asTile(from), asTile(t), engineTiles, me, RIDERS_ONLY(free.jinetes), allies) === "carga";
  };
  /** Ya va esta noche un ataque tuyo a `t` (desde otra casilla, sin contar la orden que se cambia). */
  const attackGoing = (t: TileView, edit?: OrderView) =>
    nightDraft.some((o) => o !== edit && o.tipo === "mover" && o.hacia === t.id && t.owner !== me && !(t.owner != null && bound.includes(t.owner)));
  /** Los verbos posibles de una orden de `c.from` a `t`, el propuesto primero (bloque 12). */
  const verbsTo = (c: Pick<Compose, "from" | "guest" | "edit">, t: TileView): Verb[] => {
    const from = byId.get(c.from);
    if (!from || me == null || t.id === from.id) return [];
    const alliance = c.guest ? state.alianzas?.lista.find((a) => a.casas.includes(me) && a.casas.includes(from.owner ?? -1)) : undefined;
    return verbsFor({
      from,
      target: t,
      me,
      allies,
      bound,
      canMarch: canMarchTo(c, t),
      attackGoing: attackGoing(t, c.edit),
      marchOnly: alliance?.estado === "aviso",
    });
  };
  /** Casillas a las que puede ir una orden desde `c.from`. */
  const isTargetFor = (c: Pick<Compose, "from" | "mode" | "guest" | "edit">, t: TileView) => {
    const from = byId.get(c.from)!;
    if (c.mode === "capitan") {
      return me != null && t.owner === me && t.id !== from.id && marchKind(asTile(from), asTile(t), engineTiles, me, undefined, allies) != null;
    }
    return verbsTo(c, t).length > 0;
  };

  // Bloque 9: al elegir una casilla tuya con tropas libres se marcan solos sus destinos.
  const reachFrom =
    open && me != null && tile && tile.owner === me && Object.values(freeUnits(tile.id)).some((n) => n > 0) ? tile.id : null;
  // Bloque 6: mientras se arrastra desde una casilla, se marcan sus destinos como al mover.
  const isTarget = (t: TileView) =>
    compose
      ? isTargetFor(compose, t)
      : drag
        ? isTargetFor({ from: drag.from, mode: "orden" }, t)
        : reachFrom != null
          ? isTargetFor({ from: reachFrom, mode: "orden" }, t)
          : false;
  // Capa Alcance: todas las casillas a las que llega esta noche alguna de tus casillas con tropas libres.
  const reach = useMemo(() => {
    if (layer !== "alcance" || me == null) return new Set<number>();
    const froms = tiles.filter((t) => t.owner === me && Object.values(freeUnits(t.id)).some((n) => n > 0));
    return new Set(tiles.filter((t) => froms.some((f) => canMarchTo({ from: f.id }, t))).map((t) => t.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, tiles, me, JSON.stringify(nightDraft), allies.join(), breaking.join()]);
  /** Ventaja del defensor en la próxima resolución por encima de la de cualquier casilla, en %, con lo que se ve (capa Defensa). */
  const defenseOf = (t: TileView) => Math.round((defenseMultiplier(asTile(t), next + k, false) - 1 - DEFENSE_BONUS.base) * 100);
  // Lados con río sin puente (capa Defensa): cada par una vez.
  const riverEdges = useMemo(() => {
    if (layer !== "defensa" || !RIVERS.enabled) return [];
    const out: [number, number][][] = [];
    for (const t of tiles) {
      if (!t.river) continue;
      for (const [nx, ny] of geo.neighbours(t.x, t.y)) {
        const n = tileAt.get(`${nx},${ny}`);
        if (!n || n.id < t.id || !riverBetween(t, n) || bridgeBetween(asTile(t), asTile(n), engineTiles)) continue;
        out.push(sharedEdge(geo, t.x, t.y, nx, ny, 0));
      }
    }
    return out;
  }, [layer, tiles, geo, tileAt, engineTiles]);

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
        if (over && over.id !== g.tile.id && isTargetFor({ from: g.tile.id, mode: "orden" }, over)) {
          setCompose({ from: g.tile.id, mode: "orden", target: over.id, mix: freeUnits(g.tile.id) });
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

  /** Bloque 12: abrir una orden ya dada para cambiar tropas, verbo o destino. */
  const editExisting = (o: OrderView) => {
    const t = byId.get(o.hacia);
    if (me == null) return;
    const u = unitsOf({ troops: o.tropas, jinetes: o.jinetes, catapultas: o.catapultas });
    const captainAlone = o.tipo === "mover" && o.tropas === 0 && !!o.capitan;
    setSelected(null);
    setLegend(false);
    setOrdersList(false);
    setCompose({
      from: o.desde,
      mode: captainAlone ? "capitan" : "orden",
      target: o.hacia,
      verb: verbOf(o, t, me, allies, bound),
      mix: u,
      ...(o.capitan ? { capitan: true } : {}),
      ...(o.dePaso ? { guest: true } : {}),
      ...(o.repetir ? { repetir: true } : {}),
      edit: o,
    });
    openSheet();
  };
  // Desde la pestaña Órdenes: abrir esa orden en su noche.
  useEffect(() => {
    if (!editOrder) return;
    const o = draft.find((x) => x === editOrder) ?? draft.find((x) => JSON.stringify(x) === JSON.stringify(editOrder));
    onEditOpened?.();
    if (!o) return;
    const from = byId.get(o.desde);
    editExisting(o);
    if (from) {
      if (!close) {
        focus.current = { x: from.x, y: from.y };
        setLevel(1);
      }
      // Cuando la hoja ya ha subido, la casilla de salida queda a la vista por encima.
      window.setTimeout(() => centerOn(from.x, from.y), 260);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOrder]);

  const onTile = (t: TileView) => {
    setLayersOpen(false);
    setOrdersList(false);
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
    setLegend(false);
    openSheet();
  };
  const openSheet = () => setSheet((s) => (s === "full" ? "full" : "half"));
  const closeSheet = () => {
    setSelected(null);
    setCompose(null);
    setLegend(false);
    setOrdersList(false);
    setSheet("peek");
  };
  const openOrdersList = () => {
    setLayersOpen(false);
    setSelected(null);
    setCompose(null);
    setLegend(false);
    setOrdersList(true);
    setSheet("half");
  };
  const openLegend = () => {
    setLayersOpen(false);
    setSelected(null);
    setCompose(null);
    setLegend(true);
    setSheet("full");
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
        {open && !replay && (
          <div className="night-pick">
            <button
              className={`night-chip${k > 0 ? " planning" : ""}`}
              onClick={() => (ordersList ? closeSheet() : openOrdersList())}
              aria-expanded={ordersList}
              aria-label={`Órdenes para ${nightLabel(state.partida, k, true)}: ${ordersText(nightDraft.length)}. Ver la lista`}
            >
              {k > 0 && "Planeando: "}
              {nightNames[k]} · {ordersText(nightDraft.length)}
              {otherNights.length > 0 && <span className="badge" title="Órdenes en otras noches">{otherNights.length}</span>}
            </button>
          </div>
        )}
        <div className="layers">
          <button
            className="layers-button"
            onClick={() => {
              // La ficha baja para que no tape el menú.
              if (!layersOpen) setSheet("peek");
              setLayersOpen(!layersOpen);
              setOrdersList(false);
            }} aria-expanded={layersOpen} aria-haspopup="menu">
            <Icon name="mapa" size={18} color="#d6a64b" /> {LAYERS.find((l) => l.id === layer)!.label}
          </button>
          {layersOpen && (
            <div className="layers-menu" role="menu" aria-label="Capas del mapa">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  role="menuitemradio"
                  aria-checked={layer === l.id}
                  className={layer === l.id ? "active" : ""}
                  onClick={() => {
                    setLayer(l.id);
                    setLayersOpen(false);
                  }}
                >
                  <strong>{l.label}</strong>
                  <small>{l.note}</small>
                </button>
              ))}
              <button role="menuitem" className="legend-item" onClick={openLegend}>
                <strong>? Leyenda</strong>
                <small>Qué es cada icono y cada borde</small>
              </button>
            </div>
          )}
        </div>
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
            {/* Bloque 9: capas. Recursos apaga lo que no produce; Defensa tiñe según la ventaja del defensor; Alcance, adónde llegas. */}
            {!replay && layer === "recursos" &&
              tiles
                .filter((t) => Object.keys(TILE_PRODUCTION[t.type] ?? {}).length === 0)
                .map((t) => <polygon key={`lr${t.id}`} points={points(t)} className="layer-dim" />)}
            {!replay && layer === "defensa" &&
              tiles.map((t) => (
                <polygon key={`ld${t.id}`} points={points(t)} className="layer-dim" fillOpacity={Math.max(0, 0.55 - defenseOf(t) / 100)} />
              ))}
            {!replay && layer === "defensa" &&
              riverEdges.map(([a, b], i) => <line key={`rv${i}`} x1={a![0]} y1={a![1]} x2={b![0]} y2={b![1]} className="layer-river" />)}
            {!replay && layer === "alcance" &&
              tiles
                .filter((t) => reach.has(t.id))
                .map((t) => (
                  <polygon key={`lc${t.id}`} points={points(t, 2)} className="cell-reach" />
                ))}
            {!replay &&
              tiles
                .filter((t) => threatAt.has(t.id))
                .map((t) => <polygon key={`a${t.id}`} points={points(t, 2.5)} className="cell-threat" />)}
            {!replay &&
              lostIds.map((id) => byId.get(id)).filter((t): t is TileView => !!t).map((t) => (
                <polygon key={`p${t.id}`} points={points(t, 2.5)} className="cell-lost" />
              ))}
            {tiles.filter(isTarget).map((t) => (
              <polygon key={`t${t.id}`} points={points(t, 2)} className="cell-target" />
            ))}
            {compose && byId.get(compose.from) && <polygon points={points(byId.get(compose.from)!, 1.5)} className="cell-source" />}
            {tile && !compose && <polygon points={points(tile, 1.5)} className="cell-selected" />}
            {flash != null && byId.get(flash) && <polygon key={`f${flash}`} points={points(byId.get(flash)!, 1.5)} className="cell-flash" />}
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
                  {t.troops != null && (
                    <span className={`tile-troops${t.owner === me && me != null ? " mine" : ""}`} aria-hidden>
                      {house && <span className="troop-stripe" style={{ background: TERRITORY[house.color] ?? "#fff" }} />}
                      {t.troops}
                      {t.owner === me && committed(t.id) > 0 && <span className="troop-left"> → {t.troops - committed(t.id)}</span>}
                      {(t.jinetes ?? 0) > 0 && <Icon name="jinete" size={12} color="#f1cf7d" />}
                      {(t.catapultas ?? 0) > 0 && <Icon name="catapulta" size={12} color="#f1cf7d" />}
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
                  {!replay && layer === "recursos" && Object.keys(TILE_PRODUCTION[t.type] ?? {}).length > 0 && (
                    <span className="layer-chip" aria-hidden>
                      {(Object.entries(TILE_PRODUCTION[t.type]) as [keyof typeof RESOURCE_LABEL, number][]).map(([r, n]) => (
                        <span key={r}>
                          <ResourceIcon r={r} size={close ? 14 : 10} />
                          {n}
                        </span>
                      ))}
                    </span>
                  )}
                  {!replay && layer === "defensa" && defenseOf(t) > 0 && (
                    <span className="layer-chip" aria-hidden>
                      +{defenseOf(t)}%
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
            {level === 0 &&
              shields.map(({ tile: t, house }) => {
                const h = state.casas.find((c) => c.id === house);
                if (!h) return null;
                const [cx, cy] = geo.center(t.x, t.y);
                const size = Math.max(16, Math.round(cellBox(geo, t.x, t.y)[2] * scale * 0.75));
                return (
                  <button
                    key={`e${t.id}`}
                    className="territory-shield"
                    style={{ left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%` }}
                    aria-label={`Ficha de ${h.nombre}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openHouse?.(h.id);
                    }}
                  >
                    <ShieldIcon color={h.color} escudo={h.escudo} size={size} title="" />
                  </button>
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
                    onClick={open ? () => editExisting(o) : undefined}
                    title={open ? `Cambiar la orden de ${a.nombre} a ${b.nombre}` : undefined}
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
              me={state.yo.casa ?? null}
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
        {/* Bloque 9: flechas en el borde hacia los avisos que quedan fuera de la pantalla. */}
        {close &&
          !replay &&
          alertIds.map((id) => {
            const t = byId.get(id);
            if (!t || view.w === 0) return null;
            const [cx, cy] = geo.center(t.x, t.y);
            const x = cx * scale - view.left;
            const y = cy * scale - view.top;
            const m = 26;
            if (x >= 0 && x <= view.w && y >= 0 && y <= view.h) return null;
            const ex = Math.min(view.w - m, Math.max(m, x));
            const ey = Math.min(view.h - m, Math.max(m + 40, y));
            const angle = (Math.atan2(y - ey, x - ex) * 180) / Math.PI;
            return (
              <button
                key={`edge${id}`}
                className="edge-alert"
                style={{ left: view.ox + ex, top: view.oy + ey }}
                onClick={() => goTo(id)}
                aria-label={`Ir a ${t.nombre}`}
              >
                <span style={{ transform: `rotate(${angle}deg)` }} aria-hidden>
                  <svg viewBox="0 0 12 12" width={14} height={14}>
                    <path d="M2,2 L11,6 L2,10 L4,6 z" fill="#ff4b33" />
                  </svg>
                </span>
              </button>
            );
          })}
      </div>
      {/* Franja de la repetición: fija abajo, encima de las pestañas, para que se lea siempre. */}
      <div className="replay-chrome" ref={setChrome} style={{ bottom: dock }} hidden={!replay} />
      {!replay && (
        <Sheet
          ref={sheetRef}
          state={sheet}
          setState={setSheet}
          onClose={tile || compose || legend || ordersList ? closeSheet : undefined}
          compact={!tile && !compose && !legend && !ordersList && sheet === "peek"}
          label={legend ? "Leyenda del mapa" : tile ? `Ficha de ${tile.nombre}` : ordersList ? "Órdenes de la noche" : "Lo último en el mapa"}
        >
          {legend ? (
            <Legend color={TERRITORY[mine?.color ?? ""] ?? "#f1cf7d"} />
          ) : ordersList && !compose ? (
            <QuickOrders
              state={state}
              nights={nightNames}
              night={k}
              counts={nightNames.map((_, i) => draft.filter((o) => nightOf(o, next) === next + i).length)}
              orders={nightDraft}
              byId={byId}
              allies={allies}
              bound={bound}
              onNight={(i) => {
                setNight(i);
                setCompose(null);
              }}
              onEdit={editExisting}
              whatIf={k === 0 && whatIf?.key === whatIfKey ? whatIf.lost : null}
              onWhatIf={
                k === 0 && me != null
                  ? () => {
                      const lost = whatIfAttacked(state, draft);
                      setWhatIf({ key: whatIfKey, lost });
                      if (lost.length > 0) goTo(lost[0]!.tile);
                    }
                  : undefined
              }
              onGo={goTo}
            />
          ) : compose ? (
            <Composer
              state={state}
              compose={compose}
              setCompose={setCompose}
              byId={byId}
              available={unitsFor(compose)}
              verbs={compose.target != null ? verbsTo(compose, byId.get(compose.target)!) : []}
              engineTiles={engineTiles}
              allies={allies}
              captainHere={
                !compose.guest &&
                !!byId.get(compose.from)?.capitanes?.includes(me ?? -1) &&
                !nightDraft.some((o) => o.capitan && o !== compose.edit)
              }
              onSave={(o) => {
                const order = { ...o, resolucion: next + k, ...(compose.guest ? { dePaso: true } : {}) };
                const i = compose.edit ? draft.indexOf(compose.edit) : -1;
                if (i >= 0) setDraft(draft.map((x, j) => (j === i ? order : x)), "Orden cambiada.");
                else setDraft([...draft, order]);
                setCompose(null);
              }}
              onRemove={
                compose.edit
                  ? () => {
                      setDraft(draft.filter((x) => x !== compose.edit));
                      setCompose(null);
                    }
                  : undefined
              }
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
              orders={open ? nightDraft.filter((o) => o.desde === tile.id) : []}
              onEdit={editExisting}
              onOrder={(mode, guest) => {
                setCompose({ from: tile.id, mode, target: null, mix: freeUnits(tile.id, guest), ...(guest ? { guest: true } : {}) });
                // Mientras eliges el destino, la hoja se encoge para ver el mapa.
                setSheet("peek");
              }}
              onFortify={() => act(() => api.fortify(state.partida.id, tile.id), "Murallas reforzadas.")}
            />
          ) : sheet === "peek" ? (
            <div className="alert-line">
              {threatIds.length > 0 && (
                <button className="alert-chip" onClick={() => goNext("amenazas", threatIds)}>
                  <span className="threat-swatch" aria-hidden />
                  {threatIds.length === 1
                    ? `${byId.get(threatIds[0]!)?.nombre ?? "Una casilla"} amenazada`
                    : `${threatIds.length} casillas amenazadas`}{" "}
                  ›
                </button>
              )}
              {bannerIds.length > 0 && (
                <button className="alert-chip" onClick={() => goNext("estandartes", bannerIds)}>
                  <Icon name="estandarte" size={16} color={TERRITORY[state.casas.find((h) => h.id === banners[0]!.house)?.color ?? ""] ?? "#fff"} />
                  {banners.length === 1 ? "Estandartes a la vista" : `${banners.length} estandartes a la vista`} ›
                </button>
              )}
              {k === 0 && (battles.size > 0 || lastMoves.length > 0) && (
                <button
                  className="alert-chip"
                  onClick={() => {
                    if (replayable) {
                      setReplay(true);
                      showBoard();
                    } else if (battles.size > 0) goNext("batallas", [...battles]);
                    else setShowLast(!showLast);
                  }}
                  aria-pressed={!replayable && battles.size === 0 ? showLast : undefined}
                >
                  <Icon name="ordenes" size={16} color="#f1cf7d" />
                  {battles.size > 0 ? `${battles.size} ${battles.size === 1 ? "batalla" : "batallas"}` : "Movimientos de anoche"}
                  {replayable ? " · Ver la noche" : battles.size === 0 ? (showLast ? " · Ocultar flechas" : " · Ver flechas") : ""}
                </button>
              )}
              {state.subasta?.abierta && onOpenTrade && (
                <button className="alert-chip" onClick={onOpenTrade}>
                  <Icon name="corona" size={16} color="#f1cf7d" />
                  Gran Subasta abierta ›
                </button>
              )}
              {threatIds.length === 0 && bannerIds.length === 0 && !state.subasta?.abierta && !(k === 0 && (battles.size > 0 || lastMoves.length > 0)) && (
                <span className="alert-quiet">Sin avisos. Toca una casilla tuya y arrastra para mover.</span>
              )}
            </div>
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

/** Bloque 12: lista rápida de las órdenes de una noche, con las noches de la cola como pestañas. */
function QuickOrders({
  state,
  nights,
  night,
  counts,
  orders,
  byId,
  allies,
  bound,
  onNight,
  onEdit,
  whatIf,
  onWhatIf,
  onGo,
}: {
  state: GameState;
  nights: string[];
  night: number;
  counts: number[];
  orders: OrderView[];
  byId: Map<number, TileView>;
  allies: number[];
  bound: number[];
  onNight: (i: number) => void;
  onEdit: (o: OrderView) => void;
  /** «¿Y si atacan?»: lo que perderías (null si no se ha probado con estas órdenes). */
  whatIf: { tile: number; by: number[]; troops: number }[] | null;
  onWhatIf?: () => void;
  onGo: (tile: number) => void;
}) {
  const me = state.yo.casa ?? -1;
  const name = (id: number) => byId.get(id)?.nombre ?? "?";
  return (
    <section className="card quick-orders">
      {nights.length > 1 && (
        <div className="night-tabs" role="tablist" aria-label="Noche">
          {nights.map((label, i) => (
            <button key={i} role="tab" aria-selected={night === i} className={night === i ? "active" : ""} onClick={() => onNight(i)}>
              {label}
              {counts[i]! > 0 && <span className="badge">{counts[i]}</span>}
            </button>
          ))}
        </div>
      )}
      <h2>{night === 0 ? `Órdenes para ${nights[0]}` : `En cola para ${nights[night]}`}</h2>
      {night > 0 && (
        <p className="hint">
          El mapa muestra cómo quedaría si todo sale como esperas; las demás casas también mueven, y al llegar la noche cada orden sale con
          las tropas que queden.
        </p>
      )}
      {orders.length === 0 ? (
        <p>Sin órdenes esta noche: tus tropas se quedan donde están. Toca una casilla tuya para dar una, o arrastra desde ella.</p>
      ) : (
        <ul className="tile-orders">
          {orders.map((o, i) => (
            <li key={i}>
              <button className="row-button" onClick={() => onEdit(o)}>
                <span className="grow">
                  {o.tropas === 0 && o.capitan ? (
                    <>
                      El Capitán va solo a <strong>{name(o.hacia)}</strong>
                    </>
                  ) : (
                    <>
                      {VERB_LABEL[verbOf(o, byId.get(o.hacia), me, allies, bound)]} <strong>{name(o.hacia)}</strong>
                      <small className="muted">
                        {" "}
                        · {troopsText(o.tropas, o.jinetes, o.catapultas)}
                        {o.dePaso ? " de paso" : ""} desde {name(o.desde)}
                        {o.capitan ? " · con el Capitán" : ""}
                        {o.repetir ? " · cada noche" : ""}
                      </small>
                    </>
                  )}
                </span>
                <small>Cambiar ›</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {onWhatIf && (
        <div className="what-if">
          <button className="secondary wide" onClick={onWhatIf}>
            ¿Y si atacan?
          </button>
          {whatIf &&
            (whatIf.length === 0 ? (
              <p className="hint">Con lo que ves, ninguna casa podría quitarte una casilla esta noche.</p>
            ) : (
              <ul className="tile-orders">
                {whatIf.map((w) => (
                  <li key={w.tile}>
                    <button className="row-button" onClick={() => onGo(w.tile)}>
                      <span className="grow">
                        Perderías <strong>{name(w.tile)}</strong> si {w.by.map((h) => withArticle(houseName(state.casas, h))).join(" o ")}{" "}
                        {w.by.length === 1 ? "ataca" : "atacan"} con todo ({troopsWord(w.troops)} a la vista)
                      </span>
                      <small>Ver ›</small>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      )}
    </section>
  );
}

/** Leyenda del mapa (bloque 9): cada marca, borde e icono, dibujados como en el mapa. */
function Legend({ color }: { color: string }) {
  // Una casilla de muestra con la misma marca que en el mapa (las mismas clases y grosores).
  const hex = (i: number) => `20,${2 + i} ${38 - i},${12 + i / 2} ${38 - i},${34 - i / 2} 20,${44 - i} ${2 + i},${34 - i / 2} ${2 + i},${12 + i / 2}`;
  const Cell = ({ className, stroke }: { className?: string; stroke?: string }) => (
    <svg viewBox="0 0 40 46" width={34} height={39} aria-hidden>
      <polygon points={hex(0)} fill="#6b8a3e" stroke="#2a2018" strokeWidth={1} />
      <polygon points={hex(2.5)} className={className} fill={className ? undefined : "none"} stroke={stroke} strokeWidth={stroke ? 3 : undefined} />
    </svg>
  );
  const rows: [ReactNode, string][] = [
    [<Cell stroke="#4d86ff" />, "Frontera de una casa: la línea de su color rodea su territorio."],
    [<span className="tile-troops mine legend-troops"><span className="troop-stripe" style={{ background: color }} />6</span>, "Tus tropas: borde de latón y la franja del color de tu casa."],
    [<span className="tile-troops legend-troops"><span className="troop-stripe" style={{ background: "#ec4a33" }} />4</span>, "Tropas de otra casa (su color en la franja) o, sin franja, una guarnición neutral."],
    [<span className="tile-troops mine legend-troops">6<span className="troop-left"> → 2</span></span>, "En la noche que planeas: las que hay y las que quedan tras tus órdenes."],
    [<Icon name="jinete" size={18} color="#f1cf7d" />, "Hay Jinetes en la casilla."],
    [<Icon name="catapulta" size={18} color="#f1cf7d" />, "Hay Catapultas en la casilla."],
    [<span className="tile-guests legend-plain">+3</span>, "Tropas de paso de una casa aliada."],
    [<Icon name="capitan" size={18} color="#f1cf7d" />, "Un Capitán (el tuyo en latón)."],
    [<Icon name="ordenes" size={18} color="#f1cf7d" />, "Hubo batalla en la última resolución."],
    [<Icon name="estandarte" size={18} color="#ec4a33" />, "Se ven estandartes de otra casa al lado."],
    [<Cell className="cell-threat" />, "Casilla tuya al alcance de un enemigo que ves."],
    [<Cell className="cell-target" />, "Destino posible de la orden que preparas."],
    [<Cell className="cell-ally" />, "Casilla de una casa aliada (más apagada si la alianza está en aviso)."],
    [<Cell className="cell-reach" />, "Capa Alcance: adónde llegan esta noche tus tropas."],
    [<Cell className="layer-dim" />, "Capas Recursos y Defensa: lo apagado no produce o no da ventaja al defensor."],
    [<svg viewBox="0 0 40 46" width={34} height={39} aria-hidden><line x1={4} y1={23} x2={36} y2={23} className="layer-river" /></svg>, "Río sin puente: atacar cruzándolo da ventaja al defensor."],
    [<span className="legend-fog" />, "Niebla: no ves las tropas de esa casilla."],
  ];
  return (
    <section className="card legend">
      <h2>Leyenda del mapa</h2>
      <ul>
        {rows.map(([mark, text], i) => (
          <li key={i}>
            <span className="legend-mark">{mark}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p className="hint">Dos toques (o doble clic) acercan el mapa; la pinza también. Mantén pulsada una casilla para ver quién la tiene y su defensa.</p>
    </section>
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
  onClick,
  title,
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
  /** Bloque 12: tocar la flecha abre la orden para cambiarla. */
  onClick?: () => void;
  title?: string;
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
      {onClick && (
        <path d={d} className="arrow-hit" stroke="transparent" strokeWidth={Math.max(14, width * 2 + 8)} fill="none" onClick={onClick}>
          {title && <title>{title}</title>}
        </path>
      )}
      <path d={d} stroke="#1c1410" strokeWidth={width * 2 + 3} fill="none" strokeLinecap="round" strokeDasharray={dashed ? "8 6" : undefined} />
      <path d={d} stroke={color} strokeWidth={width * 2} fill="none" strokeLinecap="round" strokeDasharray={dashed ? "8 6" : undefined} markerEnd="url(#punta)" />
      {label != null && (
        <g transform={`translate(${mx},${my})`} className={onClick ? "arrow-hit" : undefined} onClick={onClick}>
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
  orders,
  onEdit,
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
  /** Bloque 12: las órdenes que salen de aquí esa noche, para cambiarlas. */
  orders: OrderView[];
  onEdit: (o: OrderView) => void;
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
  const name = (id: number) => (state.casillas ?? []).find((t) => t.id === id)?.nombre ?? "?";
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
      {orders.length > 0 && (
        <ul className="tile-orders" aria-label="Órdenes que salen de aquí">
          {orders.map((o, i) => (
            <li key={i}>
              <button className="row-button" onClick={() => onEdit(o)}>
                <span className="grow">
                  {o.tropas === 0 && o.capitan
                    ? `El Capitán va solo a ${name(o.hacia)}`
                    : `${VERB_LABEL[verbOf(o, (state.casillas ?? []).find((t) => t.id === o.hacia), me ?? -1, allies, bound)]}: ${name(o.hacia)} · ${troopsWord(o.tropas)}${o.dePaso ? " de paso" : ""}`}
                </span>
                <small>Cambiar ›</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {mine && open && available > 0 && (
        <button className="primary wide" onClick={() => onOrder("orden")}>
          Dar una orden ({troopsWord(available)} libres)
        </button>
      )}
      {!mine && open && guestsAvailable > 0 && (
        <button className="primary wide" onClick={() => onOrder("orden", true)}>
          Dar una orden a tus tropas de paso ({guestsAvailable})
        </button>
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
  verbs,
  engineTiles,
  allies,
  captainHere,
  onSave,
  onRemove,
}: {
  state: GameState;
  compose: Compose;
  setCompose: (c: Compose | null) => void;
  byId: Map<number, TileView>;
  /** Tropas que pueden ir (al cambiar una orden, también las suyas). */
  available: Units;
  /** Verbos posibles hacia el destino, el propuesto primero (bloque 12). */
  verbs: Verb[];
  engineTiles: Tile[];
  allies: number[];
  /** El Capitán de la casa está en la casilla de salida y aún no va con otra orden. */
  captainHere: boolean;
  onSave: (o: OrderView) => void;
  /** Solo al cambiar una orden ya dada. */
  onRemove?: () => void;
}) {
  const from = byId.get(compose.from)!;
  const target = compose.target != null ? byId.get(compose.target)! : null;
  const me = state.yo.casa;
  const editing = !!compose.edit;
  const closed = state.partida.ordenesAbiertas === false;
  const changeTarget = target && (
    <button className="link" onClick={() => setCompose({ ...compose, target: null, verb: undefined })}>
      Cambiar destino
    </button>
  );
  const footer = (
    <div className="composer-foot">
      {changeTarget}
      {onRemove && (
        <button className="link danger" onClick={onRemove}>
          Quitar la orden
        </button>
      )}
      <button className="link" onClick={() => setCompose(null)}>
        {editing ? "Dejarla como estaba" : "Cancelar"}
      </button>
      {closed && <p className="error">Las órdenes están cerradas.</p>}
    </div>
  );
  if (compose.mode === "capitan") {
    return (
      <section className="card composer">
        <h2>Mover al Capitán desde {from.nombre}</h2>
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
            <div className="composer-go">
              <button
                className="primary wide"
                onClick={() => onSave({ tipo: "mover", desde: from.id, hacia: target.id, apoyaDesde: null, tropas: 0, capitan: true })}
              >
                {editing ? "Guardar: el Capitán va solo" : "El Capitán va solo"}
              </button>
            </div>
          </>
        )}
        {footer}
      </section>
    );
  }
  if (!target) {
    return (
      <section className="card composer">
        <h2>
          Orden desde {from.nombre}
          {compose.guest && " (tropas de paso)"}
        </h2>
        <p>Toca una casilla marcada: tus vecinas y las de al lado para atacar, apoyar, defender o sitiar; más lejos, por un camino tuyo, por mar o a la carga con jinetes.</p>
        {footer}
      </section>
    );
  }
  const verb = compose.verb && verbs.includes(compose.verb) ? compose.verb : verbs[0];
  if (!verb) {
    return (
      <section className="card composer">
        <h2>{target.nombre}</h2>
        <p className="error">Desde {from.nombre} no se puede dar ninguna orden ahí.</p>
        {footer}
      </section>
    );
  }
  const march = verb === "mover" || verb === "atacar" || verb === "entrar";
  const supporting = verb === "apoyar" || verb === "defender";
  // Qué tipos pueden ir: a la carga solo jinetes; a la montaña solo Mesnada; los apoyos, sin catapultas.
  const charge = march && me != null && marchKind(asTile(from), asTile(target), engineTiles, me, undefined, allies) == null;
  const kinds: (keyof Units)[] = charge
    ? ["jinetes"]
    : march && target.type === "montana"
      ? ["mesnada"]
      : supporting
        ? ["mesnada", "jinetes"]
        : ["mesnada", "jinetes", "catapultas"];
  const mix: Units = {
    mesnada: kinds.includes("mesnada") ? Math.min(compose.mix.mesnada, available.mesnada) : 0,
    jinetes: kinds.includes("jinetes") ? Math.min(compose.mix.jinetes, available.jinetes) : 0,
    catapultas: kinds.includes("catapultas") ? Math.min(compose.mix.catapultas, available.catapultas) : 0,
  };
  const total = mix.mesnada + mix.jinetes + mix.catapultas;
  const shown = kinds.filter((u) => available[u] > 0);
  const setMix = (m: Partial<Units>) => setCompose({ ...compose, verb, mix: { ...mix, ...m } });
  const setAll = (part: "ninguna" | "mitad" | "todas") =>
    setCompose({ ...compose, verb, mix: { mesnada: share(available.mesnada, part), jinetes: share(available.jinetes, part), catapultas: share(available.catapultas, part) } });
  const min = verb === "sitiar" ? SIEGE.minTroops : 1;
  const hint: Record<Verb, string> = {
    mover: `Tus tropas pasan a ${target.nombre}.`,
    atacar: target.owner == null ? "Si ganas a su guarnición, la casilla es tuya." : "Si ganas, la casilla es tuya.",
    entrar: "Casilla aliada: entras sin combatir y tus tropas quedan de paso.",
    apoyar: `Tus tropas se quedan en ${from.nombre} y suman al primer ataque que llegue a ${target.nombre}: el tuyo si atacas; si no, el de la casa que dio antes su orden.`,
    defender: `Tus tropas se quedan en ${from.nombre} y suman a la defensa de ${target.nombre} si la atacan.`,
    sitiar:
      (target.type === "castillo"
        ? "Un castillo hay que rodearlo desde dos casillas tuyas a la vez: entonces produce la mitad y tú ganas 1 de Prestigio cada noche."
        : "Cada noche de asedio la fortaleza pierde un 25% de murallas. Se rompe si atacan tu casilla.") +
      ` Tus tropas se quedan en ${from.nombre}. Hacen falta al menos ${SIEGE.minTroops}.`,
  };
  return (
    <section className="card composer">
      <h2>
        {verbTitle(verb, target.nombre)}
      </h2>
      <p className="muted">
        Desde {from.nombre}
        {compose.guest && " (tropas de paso)"}
      </p>
      {verbs.length > 1 && (
        <div className="verb-choice" role="radiogroup" aria-label="Tipo de orden">
          {verbs.map((v) => (
            <button key={v} role="radio" aria-checked={v === verb} className={v === verb ? "active" : ""} onClick={() => setCompose({ ...compose, verb: v })}>
              {VERB_LABEL[v]}
            </button>
          ))}
        </div>
      )}
      <p className="hint">
        {hint[verb]}
        {charge && " A la carga: solo van jinetes."}
        {!charge && march && target.type === "montana" && " A la montaña solo sube la Mesnada."}
      </p>
      {shown.length === 0 ? (
        <p className="error">No te quedan tropas que puedan ir ahí.</p>
      ) : (
        <>
          {shown.map((u) => (
            <Stepper key={u} label={UNIT_LABEL[u]} value={mix[u]} max={available[u]} onChange={(n) => setMix({ [u]: n })} />
          ))}
          <div className="troop-shortcuts">
            <button onClick={() => setAll("ninguna")}>Ninguna</button>
            <button onClick={() => setAll("mitad")}>La mitad</button>
            <button onClick={() => setAll("todas")}>Todas</button>
          </div>
        </>
      )}
      {(verb === "sitiar" || verb === "defender") && (
        <label className="check">
          <input type="checkbox" checked={!!compose.repetir} onChange={(e) => setCompose({ ...compose, verb, repetir: e.target.checked })} />
          Repetir cada noche, hasta que la quites o deje de ser posible
        </label>
      )}
      {march && captainHere && (
        <label className="check">
          <input type="checkbox" checked={!!compose.capitan} onChange={(e) => setCompose({ ...compose, verb, capitan: e.target.checked })} />
          Con el Capitán: +2 de fuerza. Si el ataque fracasa contra otra casa, cae preso.
        </label>
      )}
      <div className="composer-go">
        <button
          className="primary wide"
          disabled={total < min || closed}
          onClick={() =>
            onSave({
              ...orderOf(verb),
              desde: from.id,
              hacia: target.id,
              tropas: total,
              ...(mix.jinetes > 0 ? { jinetes: mix.jinetes } : {}),
              ...(mix.catapultas > 0 ? { catapultas: mix.catapultas } : {}),
              ...(march && captainHere && compose.capitan ? { capitan: true } : {}),
              ...((verb === "sitiar" || verb === "defender") && compose.repetir ? { repetir: true } : {}),
            })
          }
        >
          {editing ? "Guardar: " : ""}
          {VERB_LABEL[verb]} con {troopsWord(total)}
        </button>
      </div>
      {footer}
    </section>
  );
}

/** Bloque 12: «−» y «+» de 48x48; mantener pulsado acelera. */
function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (n: number) => void }) {
  const latest = useRef(value);
  latest.current = value;
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const step = (d: number) => {
    const n = Math.max(0, Math.min(max, latest.current + d));
    if (n !== latest.current) {
      latest.current = n;
      onChange(n);
    }
    return n;
  };
  const hold = (d: number) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    stop();
    step(d);
    let wait = 420;
    const again = () => {
      const n = step(d);
      if (n === 0 || n === max) return stop();
      wait = Math.max(60, wait * 0.7);
      timer.current = window.setTimeout(again, wait);
    };
    timer.current = window.setTimeout(again, wait);
  };
  const keys = (d: number) => (e: { detail: number }) => {
    // El clic de teclado (sin puntero) avanza uno; el del dedo ya lo hizo al pulsar.
    if (e.detail === 0) step(d);
  };
  return (
    <div className="stepper">
      <span className="grow">
        {label} <small className="muted">de {max}</small>
      </span>
      <button aria-label={`Una menos de ${label}`} disabled={value <= 0} onPointerDown={hold(-1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onClick={keys(-1)} onContextMenu={(e) => e.preventDefault()}>
        −
      </button>
      <strong aria-live="polite">{value}</strong>
      <button aria-label={`Una más de ${label}`} disabled={value >= max} onPointerDown={hold(1)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onClick={keys(1)} onContextMenu={(e) => e.preventDefault()}>
        +
      </button>
    </div>
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
