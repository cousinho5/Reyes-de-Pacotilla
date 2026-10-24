import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOT_LEVEL_NAMES, PERSONALITY_NAMES, RESOURCES } from "@reyes/engine";
import { api, ApiError, isOffline, saveGame, savedGame, type GameState, type HouseForm, type OrderView } from "../api";
import { OpenHouse } from "../houseSheet";
import { BotMark, FrayAbundio, Icon, ResourceIcon, ShieldIcon } from "../art";
import { HouseEditor } from "../components/HouseEditor";
import { navigate } from "../App";
import { MapView } from "../components/MapView";
import { TestBench } from "../components/TestBench";
import { RESOURCE_LABEL, formatDay, formatShort, timeLeft } from "../ui";
import { nextResolution, nightOf, pruneQueue } from "../plan";
import { vibrate } from "../haptics";
import { unreadBulletins } from "../bulletinSeen";
import { autoQueue, canPlay, seenHere } from "../cinematicQueue";

type Tab = "mapa" | "castillo" | "ordenes" | "comercio" | "reino";

// Bloque 6: cada pestaña, salvo el Mapa, en su propio trozo de JS que se baja al abrirla.
const loadCastle = () => import("../components/CastlePanel");
const loadOrders = () => import("../components/OrdersPanel");
const loadTrade = () => import("../components/TradePanel");
const loadRealm = () => import("../components/Realm");
const CastlePanel = lazy(() => loadCastle().then((m) => ({ default: m.CastlePanel })));
const OrdersPanel = lazy(() => loadOrders().then((m) => ({ default: m.OrdersPanel })));
const TradePanel = lazy(() => loadTrade().then((m) => ({ default: m.TradePanel })));
const Realm = lazy(() => loadRealm().then((m) => ({ default: m.Realm })));
const HouseSheet = lazy(() => import("../components/HouseSheet").then((m) => ({ default: m.HouseSheet })));
// Bloque 3: la ventana del boletín recién publicado, solo cuando hay uno sin leer.
const BulletinPopup = lazy(() => import("../components/BulletinPopup").then((m) => ({ default: m.BulletinPopup })));
// Bloque 13: las cinemáticas que salen solas (con sus dibujos), solo si hay alguna.
const CinematicQueue = lazy(() => import("../components/CinematicQueue").then((m) => ({ default: m.CinematicQueue })));
const OFFLINE_TOAST = "Sin conexión: podrás dar órdenes cuando vuelva la red.";

/**
 * Con el mapa ya en pantalla (unos segundos después, para no quitarle red), se bajan
 * las demás pestañas para tenerlas también sin conexión.
 */
function preloadTabs() {
  const idle = (window as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 0));
  setTimeout(() => idle(() => [loadCastle, loadOrders, loadTrade, loadRealm].forEach((f) => f().catch(() => {}))), 4000);
}

export function Game({ id }: { id: number }) {
  // Bloque 6: se abre con lo último que se vio y se pone al día en cuanto llega la red.
  const [state, setState] = useState<GameState | null>(() => savedGame(id)?.state ?? null);
  /** Lo que se ve viene de la red (si no, es lo guardado y no se pueden dar órdenes). */
  const [fresh, setFresh] = useState(false);
  /** Hora de lo guardado, si la red ha fallado. */
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const preloaded = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Bloque 7: los avisos de la portada abren su pestaña (?pestana=ordenes).
  const [tab, setTab] = useState<Tab>(() => {
    const want = new URLSearchParams(window.location.search).get("pestana");
    return want === "castillo" || want === "ordenes" || want === "comercio" || want === "reino" ? want : "mapa";
  });
  const [draft, setDraft] = useState<OrderView[]>([]);
  // Noche de la cola que se planea en el mapa (0 = la próxima resolución).
  const [night, setNight] = useState(0);
  // Bloque 12: orden que abrir en el mapa para cambiarla (desde la pestaña Órdenes).
  const [editOrder, setEditOrder] = useState<OrderView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** Cuántas veces se ha cerrado la ventana del boletín (para volver a mirar si queda alguno sin leer). */
  const [popupClosed, setPopupClosed] = useState(0);
  // Bloque 12: al quitar una orden, el aviso lleva «Deshacer» unos segundos (las órdenes de antes).
  const [undo, setUndo] = useState<OrderView[] | null>(null);
  // Bloque 6: en el Mapa, el reloj y el evento se abren desde una etiqueta de la barra fina.
  const [statusOpen, setStatusOpen] = useState(false);
  // Bloque 11: ficha de casa abierta (desde cualquier pestaña) y casilla a la que llevar el mapa.
  const [houseOpen, setHouseOpen] = useState<number | null>(null);
  const [mapFocus, setMapFocus] = useState<number | null>(null);
  // Mientras se guarda una orden, las recargas no pisan lo que se ve.
  const savingRef = useRef(false);
  const freshRef = useRef(false);
  freshRef.current = fresh;

  const load = useCallback(async () => {
    try {
      const s = await api.game(id);
      setState(s);
      setFresh(true);
      setOfflineAt(null);
      setError(null);
      saveGame(id, s);
      if (!savingRef.current) setDraft(s.ordenes ?? []);
      if (!preloaded.current) {
        preloaded.current = true;
        preloadTabs();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) navigate("/entrar");
      else if (isOffline(err) && savedGame(id)) {
        setFresh(false);
        setOfflineAt(savedGame(id)!.at);
      } else setError(isOffline(err) ? "Sin conexión, y en este móvil no hay nada guardado de esta partida." : (err as Error).message);
    }
  }, [id]);

  // Las órdenes guardadas se ven al momento, aunque aún no haya llegado la red.
  useEffect(() => {
    const saved = savedGame(id);
    if (saved) setDraft(saved.state.ordenes ?? []);
    const back = () => load();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [id, load]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => {
      setToast(null);
      setUndo(null);
    }, undo ? 5000 : 3500);
    return () => window.clearTimeout(t);
  }, [toast, undo]);

  // Bloque 13: cinemáticas pendientes, con lo que ha llegado del servidor. Se
  // calcula de nuevo al acabar la cola (por si llegó otra mientras tanto).
  const [cineDone, setCineDone] = useState(0);
  const cineQueue = useMemo(
    () =>
      state && fresh && state.partida.estado !== "lobby"
        ? autoQueue(state.cinematicas ?? [], canPlay, seenHere(id), state.yo.cinematicas === "esenciales")
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fresh, JSON.stringify(state?.cinematicas ?? null), cineDone, id, state?.yo.cinematicas],
  );
  const cinePlaying = !!cineQueue && cineQueue.play.length > 0;

  /** Ejecuta una acción y recarga; los errores se muestran como aviso. */
  const act = useCallback(
    async (fn: () => Promise<unknown>, ok?: string) => {
      if (!freshRef.current) {
        setToast(OFFLINE_TOAST);
        return;
      }
      try {
        await fn();
        if (ok) setToast(ok);
        await load();
      } catch (err) {
        setToast((err as Error).message);
      }
    },
    [load],
  );

  if (error && !state) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <button className="link" onClick={() => navigate("/")}>
          Volver
        </button>
      </main>
    );
  }
  if (!state) return <main className="page">Cargando el reino…</main>;
  if (state.partida.estado === "lobby") {
    const ok = state.prueba ? "Empieza la prueba. El reloj solo avanza cuando tú quieras." : "¡La partida empieza el lunes!";
    return <Lobby state={state} onStart={(rellenar) => act(() => api.start(id, undefined, rellenar), ok)} act={act} />;
  }

  const me = state.casas.find((h) => h.id === state.yo.casa)!;
  // En Comercio, las ofertas para ti; en Reino, las propuestas de alianza que esperan respuesta (bloque 11).
  const offersForMe = (state.ofertas ?? []).filter((o) => o.estado === "open" && o.para === state.yo.casa).length;
  const proposalsForMe = (state.alianzas?.propuestas ?? []).filter((p) => p.para === state.yo.casa).length;
  const p = state.partida;
  const rank = [...state.casas]
    .sort((x, y) => (y.prestigio?.total ?? 0) - (x.prestigio?.total ?? 0))
    .findIndex((h) => h.id === me.id) + 1;

  // Cada cambio de órdenes se guarda al momento (no hay que "sellar").
  // Al quitar una orden, las de la cola que dependían de ella se quitan también.
  const updateDraft = async (wanted: OrderView[], note?: string) => {
    if (!fresh) {
      setToast(OFFLINE_TOAST);
      return;
    }
    const removed = wanted.length < draft.length;
    const before = draft;
    const { draft: orders, dropped } = pruneQueue(state, wanted);
    const next = nextResolution(state);
    const added = removed ? null : wanted[wanted.length - 1];
    const queued = !!added && nightOf(added, next) > next;
    setDraft(orders);
    savingRef.current = true;
    try {
      await api.saveOrders(id, orders);
      if (!removed) vibrate("orden");
      setUndo(removed && note == null ? before : null);
      setToast(
        note ?? removed
          ? dropped > 0
            ? `Orden quitada, y ${dropped} ${dropped === 1 ? "orden en cola que dependía" : "órdenes en cola que dependían"} de ella.`
            : "Orden quitada."
          : queued
            ? "Orden en cola. Saldrá esa noche con las tropas que queden."
            : "Orden guardada. Se cumplirá en la resolución.",
      );
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      savingRef.current = false;
      await load();
    }
  };

  const mapMode = tab === "mapa";
  const countdown = p.ordenesAbiertas
    ? timeLeft(p.cierre, state.prueba?.ahora ? Date.parse(state.prueba.ahora) : undefined).replace("faltan ", "")
    : "cerradas";
  const resources = (
    <div className={`resources${mapMode ? " thin" : ""}`} aria-label="Recursos">
      {RESOURCES.map((r) => (
        <span key={r} className="res" title={RESOURCE_LABEL[r]}>
          <ResourceIcon r={r} size={mapMode ? 16 : 20} />
          {state.yo.recursos?.[r] ?? 0}
          <span className="sr-only"> de {RESOURCE_LABEL[r]}</span>
        </span>
      ))}
    </div>
  );
  const status = (
    <div className="status">
      {p.estado === "active" && p.proximaResolucion && (
        <div className="clock">
          <Icon name="reloj" size={18} color="#d6a64b" />
          {p.haEmpezado ? (
            <>
              <span>
                Resolución {p.proximaResolucion} de {p.totalResoluciones}: <strong>{formatShort(p.resolucion)}</strong>
              </span>
              <span className={`countdown ${p.ordenesAbiertas ? "" : "closed"}`} title="Tiempo para dar órdenes">
                {countdown}
              </span>
            </>
          ) : (
            <span>La partida empieza el {formatDay(p.inicio)}. Ya puedes preparar tus órdenes.</span>
          )}
        </div>
      )}
      {p.estado === "finished" && <div className="clock">Partida terminada. ¡Larga vida al nuevo rey!</div>}
      {p.estado === "active" && state.evento && (
        <details className="event-banner" open={mapMode || undefined}>
          <summary>
            <strong>{state.evento.nombre}.</strong> {state.evento.texto}
          </summary>
          <p className="event-line">
            <FrayAbundio mood="solemne" size={44} />
            <span>
              <em>«{state.evento.linea}»</em>
            </span>
          </p>
        </details>
      )}
    </div>
  );

  return (
    <OpenHouse.Provider value={setHouseOpen}>
    <div className={`game${mapMode ? " map-mode" : ""}`}>
      <header className="topbar">
        {mapMode ? (
          // Mapa a toda pantalla: una barra fina con los recursos y una etiqueta para el reloj y el evento.
          <div className="topbar-thin">
            <button className="back" onClick={() => navigate("/")} aria-label="Volver al inicio">
              ‹
            </button>
            <ShieldIcon color={me.color} escudo={me.escudo} size={24} />
            {resources}
            <button
              className={`status-chip${p.ordenesAbiertas ? "" : " closed"}`}
              onClick={() => setStatusOpen(!statusOpen)}
              aria-expanded={statusOpen}
              aria-label={`Reloj${state.evento ? " y evento" : ""}: ${p.estado === "active" ? countdown : "partida terminada"}`}
            >
              <Icon name="reloj" size={16} color="#2c1d12" />
              {p.estado === "active" && p.haEmpezado ? countdown.replace(/^(\d+ h) \d+ min$/, "$1") : p.estado === "finished" ? "Fin" : "Empieza"}
              {state.evento && <span className="status-dot" aria-hidden />}
            </button>
            {statusOpen && (
              <div className="status-pop">
                {status}
                {state.prueba?.ahora && <TestBench state={state} gameId={id} act={act} />}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="topbar-title">
              <button className="back" onClick={() => navigate("/")} aria-label="Volver al inicio">
                ‹
              </button>
              <ShieldIcon color={me.color} escudo={me.escudo} size={34} />
              <div className="grow">
                <strong>{me.nombre}</strong>
                <span className="standing">
                  <Icon name="corona" size={16} color="#d6a64b" />
                  <b>{me.prestigio?.total ?? 0}</b> de Prestigio
                  {rank > 0 && <> · {rank}.º de {state.casas.length}</>}
                </span>
              </div>
            </div>
            {resources}
          </>
        )}
      </header>

      {offlineAt != null && (
        <p className="offline-note" role="status">
          Sin conexión. Ves la partida como estaba {formatSavedAt(offlineAt)}; podrás dar órdenes cuando vuelva la red.
        </p>
      )}
      {!mapMode && (
        <>
          {status}
          {state.prueba?.ahora && <TestBench state={state} gameId={id} act={act} />}
        </>
      )}

      <main className="game-body" onPointerDown={statusOpen ? () => setStatusOpen(false) : undefined}>
        <Suspense fallback={<p className="hint">Abriendo…</p>}>
        {tab === "mapa" && (
          <MapView
            state={state}
            draft={draft}
            setDraft={updateDraft}
            act={act}
            night={night}
            setNight={setNight}
            editOrder={editOrder}
            onEditOpened={() => setEditOrder(null)}
            onOpenTrade={() => setTab("comercio")}
            focusTile={mapFocus}
            onFocused={() => setMapFocus(null)}
            paused={cinePlaying}
          />
        )}
        {tab === "castillo" && <CastlePanel state={state} act={act} gameId={id} />}
        {tab === "ordenes" && (
          <OrdersPanel
            state={state}
            draft={draft}
            setDraft={updateDraft}
            onPlan={(n) => {
              setNight(n);
              setTab("mapa");
            }}
            onEdit={(o, n) => {
              setNight(n);
              setEditOrder(o);
              setTab("mapa");
            }}
          />
        )}
        {tab === "comercio" && <TradePanel state={state} act={act} onGoRealm={() => setTab("reino")} />}
        {tab === "reino" && <Realm state={state} act={act} />}
        </Suspense>
      </main>

      {houseOpen != null && (
        <Suspense fallback={null}>
          <HouseSheet
            key={houseOpen}
            state={state}
            house={houseOpen}
            act={act}
            onClose={() => setHouseOpen(null)}
            onShowMap={(tile) => {
              setHouseOpen(null);
              setMapFocus(tile);
              setTab("mapa");
            }}
          />
        </Suspense>
      )}

      {cineQueue && (cineQueue.play.length > 0 || cineQueue.skip.length > 0) && (
        <Suspense fallback={null}>
          <CinematicQueue
            key={cineDone}
            state={state}
            play={cineQueue.play}
            skip={cineQueue.skip}
            onDone={() => setCineDone((n) => n + 1)}
            act={act}
            onCastle={() => setTab("castillo")}
          />
        </Suspense>
      )}

      {!cinePlaying && tab !== "reino" && unreadBulletins(state).length > 0 && (
        <Suspense fallback={null}>
          <BulletinPopup key={popupClosed} state={state} onClose={() => setPopupClosed((n) => n + 1)} />
        </Suspense>
      )}

      {toast && (
        <div className={`toast${undo ? " with-action" : ""}`} role="status">
          {toast}
          {undo && (
            <button
              className="toast-action"
              onClick={() => {
                const back = undo;
                setUndo(null);
                void updateDraft(back, "Orden recuperada.");
              }}
            >
              Deshacer
            </button>
          )}
        </div>
      )}

      <nav className="tabs" aria-label="Secciones">
        {(
          [
            ["mapa", "Mapa", 0],
            ["castillo", "Castillo", 0],
            ["ordenes", "Órdenes", draft.length],
            ["comercio", "Comercio", offersForMe],
            ["reino", p.estado === "finished" ? "Coronación" : "Reino", proposalsForMe],
          ] as [Tab, string, number][]
        ).map(([key, label, count]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} aria-current={tab === key}>
            <Icon name={key} size={28} color={tab === key ? "#d6a64b" : "#8a7560"} />
            {label}
            {count > 0 && (
              <span className="badge" aria-label={`(${count})`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
    </OpenHouse.Provider>
  );
}

/** «a las 18:05», o «el lunes a las 18:05» si no es de hoy. */
function formatSavedAt(at: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? `a las ${time}` : `el ${d.toLocaleDateString("es-ES", { weekday: "long" })} a las ${time}`;
}

/** Niveles de los bots (docs/bots.md), con su nombre para la sala de espera. */
const LEVEL_LABEL: Record<string, string> = Object.fromEntries(BOT_LEVEL_NAMES.map((l) => [l, l[0]!.toUpperCase() + l.slice(1)]));

function Lobby({
  state,
  onStart,
  act,
}: {
  state: GameState;
  onStart: (rellenar?: boolean) => void;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const p = state.partida;
  const mine = state.casas.find((h) => h.id === state.yo.casa);
  const others = state.casas.filter((h) => h.id !== state.yo.casa);
  const [form, setForm] = useState<HouseForm | null>(null);
  const [botPick, setBotPick] = useState({ personalidad: "azar", nivel: "normal" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canBots = p.esCreador && !state.prueba;
  const missing = Math.max(0, 4 - state.casas.length);
  const link = p.codigoInvitacion ? `${window.location.origin}/unirse/${p.codigoInvitacion}` : null;
  const share = link
    ? `https://wa.me/?text=${encodeURIComponent(`Te invito a Reyes de Pacotilla, partida «${p.nombre}». Elige tu casa aquí: ${link}`)}`
    : null;
  return (
    <main className="page">
      <h1>{p.nombre}</h1>
      <p className="subtitle">Sala de espera · partida de {p.semanas} semanas</p>
      <section className="card">
        <h2>Casas en la corte ({state.casas.length} de 8)</h2>
        <ul className="list">
          {state.casas.map((h) => (
            <li key={h.id} className="house-row">
              <ShieldIcon color={h.color} escudo={h.escudo} size={32} />
              <span className="grow">
                {h.bot && <BotMark size={16} />}
                <strong>{h.nombre}</strong>
                {h.bot && h.personalidad && (
                  <small className="bot-line">
                    {" "}
                    · bot {h.personalidad}, {LEVEL_LABEL[h.nivel ?? "normal"] ?? h.nivel}
                  </small>
                )}
                {h.lema && (
                  <>
                    <br />
                    <small>«{h.lema}»</small>
                  </>
                )}
              </span>
              {canBots && h.bot && (
                <button className="link" onClick={() => act(() => api.removeBot(p.id, h.id), `${h.nombre} se va de la corte.`)}>
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {canBots && state.casas.length < 8 && (
        <section className="card">
          <h2>Bots</h2>
          <p>Si faltan personas, rellena la partida con bots. Juegan con el mismo calendario que vosotros y se nota quiénes son.</p>
          <div className="bot-picker">
            <label>
              Personalidad
              <select value={botPick.personalidad} onChange={(e) => setBotPick({ ...botPick, personalidad: e.target.value })}>
                <option value="azar">Al azar</option>
                {PERSONALITY_NAMES.map((x) => (
                  <option key={x} value={x}>
                    {x[0]!.toUpperCase() + x.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nivel
              <select value={botPick.nivel} onChange={(e) => setBotPick({ ...botPick, nivel: e.target.value })}>
                {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button onClick={() => act(() => api.addBot(p.id, botPick.personalidad, botPick.nivel), "Un bot se une a la corte.")}>Añadir bot</button>
        </section>
      )}
      {mine && (
        <section className="card">
          {form ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await act(() => api.editHouse(p.id, form), "Escudo guardado.");
                setForm(null);
              }}
            >
              <h2>Tu casa</h2>
              <HouseEditor value={form} onChange={setForm} taken={others} />
              <button className="primary" type="submit">
                Guardar
              </button>
              <button type="button" className="link" onClick={() => setForm(null)}>
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <p>Hasta que empiece la partida puedes cambiar el nombre, el lema y el escudo de tu casa.</p>
              <button
                onClick={() =>
                  setForm({
                    casa: mine.nombre,
                    lema: mine.lema ?? "",
                    color: mine.color,
                    forma: mine.escudo?.forma ?? "espanol",
                    division: mine.escudo?.division ?? "pleno",
                    color2: mine.escudo?.color2 ?? null,
                    simbolo: mine.escudo?.simbolo ?? "leon",
                    metal: mine.escudo?.metal ?? "oro",
                  })
                }
              >
                Retocar mi casa y mi escudo
              </button>
            </>
          )}
        </section>
      )}
      {link && (
        <section className="card">
          <h2>Invitar</h2>
          <p className="mono">{link}</p>
          <a className="button" href={share!} target="_blank" rel="noreferrer">
            Compartir en WhatsApp
          </a>
          <button className="link" onClick={() => navigator.clipboard?.writeText(link)}>
            Copiar enlace
          </button>
        </section>
      )}
      {p.esCreador && state.prueba ? (
        <section className="card">
          <p>
            Partida de prueba: al empezar se añaden {state.prueba.bots} bots y el reloj solo avanza cuando tú lo
            decidas.
          </p>
          <button className="primary" onClick={() => onStart()}>
            Empezar la prueba
          </button>
        </section>
      ) : p.esCreador ? (
        <section className="card">
          <p>Hacen falta al menos 4 casas. La partida empezará el lunes siguiente.</p>
          {missing > 0 ? (
            <button className="primary" onClick={() => onStart(true)}>
              Empezar con {missing} {missing === 1 ? "bot" : "bots"} más
            </button>
          ) : (
            <button className="primary" onClick={() => onStart()}>
              Empezar la partida
            </button>
          )}
        </section>
      ) : (
        <p>Esperando a que quien creó la partida la ponga en marcha.</p>
      )}
      {p.esCreador && !state.prueba && (
        <section className="card">
          {confirmDelete ? (
            <>
              <p>
                ¿Borrar «{p.nombre}»? Se van con ella las casas apuntadas y sus bots, y el enlace de invitación deja de
                servir. No se puede deshacer.
              </p>
              <div className="actions">
                <button
                  className="danger"
                  onClick={async () => {
                    try {
                      await api.deleteGame(p.id);
                      navigate("/");
                    } catch (err) {
                      // Para el aviso de error, sin volver a cargar una partida que quizá ya no existe.
                      await act(() => Promise.reject(err));
                    }
                  }}
                >
                  Sí, borrarla
                </button>
                <button onClick={() => setConfirmDelete(false)}>Cancelar</button>
              </div>
            </>
          ) : (
            <button className="link" onClick={() => setConfirmDelete(true)}>
              Borrar partida
            </button>
          )}
        </section>
      )}
    </main>
  );
}
