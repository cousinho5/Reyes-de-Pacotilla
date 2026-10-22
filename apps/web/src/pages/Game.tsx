import { useCallback, useEffect, useRef, useState } from "react";
import { RESOURCES } from "@reyes/engine";
import { api, ApiError, type GameState, type HouseForm, type OrderView } from "../api";
import { FrayAbundio, Icon, ResourceIcon, ShieldIcon } from "../art";
import { HouseEditor } from "../components/HouseEditor";
import { navigate } from "../App";
import { CastlePanel } from "../components/CastlePanel";
import { MapView } from "../components/MapView";
import { OrdersPanel } from "../components/OrdersPanel";
import { Realm } from "../components/Realm";
import { TestBench } from "../components/TestBench";
import { TradePanel } from "../components/TradePanel";
import { RESOURCE_LABEL, formatDay, formatShort, timeLeft } from "../ui";
import { nextResolution, nightOf, pruneQueue } from "../plan";

type Tab = "mapa" | "castillo" | "ordenes" | "comercio" | "reino";

export function Game({ id }: { id: number }) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mapa");
  const [draft, setDraft] = useState<OrderView[]>([]);
  // Noche de la cola que se planea en el mapa (0 = la próxima resolución).
  const [night, setNight] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  // Bloque 6: en el Mapa, el reloj y el evento se abren desde una etiqueta de la barra fina.
  const [statusOpen, setStatusOpen] = useState(false);
  // Mientras se guarda una orden, las recargas no pisan lo que se ve.
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const s = await api.game(id);
      setState(s);
      setError(null);
      if (!savingRef.current) setDraft(s.ordenes ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) navigate("/entrar");
      else setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** Ejecuta una acción y recarga; los errores se muestran como aviso. */
  const act = useCallback(
    async (fn: () => Promise<unknown>, ok?: string) => {
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
    return <Lobby state={state} onStart={() => act(() => api.start(id), ok)} act={act} />;
  }

  const me = state.casas.find((h) => h.id === state.yo.casa)!;
  // En Comercio: ofertas para ti y propuestas de alianza que esperan respuesta (bloque 8).
  const offersForMe =
    (state.ofertas ?? []).filter((o) => o.estado === "open" && o.para === state.yo.casa).length +
    (state.alianzas?.propuestas ?? []).filter((p) => p.para === state.yo.casa).length;
  const p = state.partida;
  const rank = [...state.casas]
    .sort((x, y) => (y.prestigio?.total ?? 0) - (x.prestigio?.total ?? 0))
    .findIndex((h) => h.id === me.id) + 1;

  // Cada cambio de órdenes se guarda al momento (no hay que "sellar").
  // Al quitar una orden, las de la cola que dependían de ella se quitan también.
  const updateDraft = async (wanted: OrderView[]) => {
    const removed = wanted.length < draft.length;
    const { draft: orders, dropped } = pruneQueue(state, wanted);
    const next = nextResolution(state);
    const added = removed ? null : wanted[wanted.length - 1];
    const queued = !!added && nightOf(added, next) > next;
    setDraft(orders);
    savingRef.current = true;
    try {
      await api.saveOrders(id, orders);
      setToast(
        removed
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

      {!mapMode && (
        <>
          {status}
          {state.prueba?.ahora && <TestBench state={state} gameId={id} act={act} />}
        </>
      )}

      <main className="game-body" onPointerDown={statusOpen ? () => setStatusOpen(false) : undefined}>
        {tab === "mapa" && <MapView state={state} draft={draft} setDraft={updateDraft} act={act} night={night} setNight={setNight} />}
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
          />
        )}
        {tab === "comercio" && <TradePanel state={state} act={act} />}
        {tab === "reino" && <Realm state={state} act={act} />}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <nav className="tabs" aria-label="Secciones">
        {(
          [
            ["mapa", "Mapa", 0],
            ["castillo", "Castillo", 0],
            ["ordenes", "Órdenes", draft.length],
            ["comercio", "Comercio", offersForMe],
            ["reino", "Reino", 0],
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
  );
}

function Lobby({
  state,
  onStart,
  act,
}: {
  state: GameState;
  onStart: () => void;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const p = state.partida;
  const mine = state.casas.find((h) => h.id === state.yo.casa);
  const others = state.casas.filter((h) => h.id !== state.yo.casa);
  const [form, setForm] = useState<HouseForm | null>(null);
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
              <span>
                <strong>{h.nombre}</strong>
                {h.lema && (
                  <>
                    <br />
                    <small>«{h.lema}»</small>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
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
          <button className="primary" onClick={onStart}>
            Empezar la prueba
          </button>
        </section>
      ) : p.esCreador ? (
        <section className="card">
          <p>Hacen falta al menos 4 casas. La partida empezará el lunes siguiente.</p>
          <button className="primary" disabled={state.casas.length < 4} onClick={onStart}>
            Empezar la partida
          </button>
        </section>
      ) : (
        <p>Esperando a que quien creó la partida la ponga en marcha.</p>
      )}
    </main>
  );
}
