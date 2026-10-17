import { useCallback, useEffect, useRef, useState } from "react";
import { RESOURCES } from "@reyes/engine";
import { api, ApiError, type GameState, type HouseForm, type OrderView } from "../api";
import { FrayAbundio, ResourceIcon, ShieldIcon } from "../art";
import { HouseEditor } from "../components/HouseEditor";
import { navigate } from "../App";
import { CastlePanel } from "../components/CastlePanel";
import { MapView } from "../components/MapView";
import { OrdersPanel } from "../components/OrdersPanel";
import { Realm } from "../components/Realm";
import { TestBench } from "../components/TestBench";
import { TradePanel } from "../components/TradePanel";
import { HOUSE_COLORS, RESOURCE_LABEL, formatDay, formatWhen, timeLeft } from "../ui";

type Tab = "mapa" | "castillo" | "ordenes" | "comercio" | "reino";

export function Game({ id }: { id: number }) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mapa");
  const [draft, setDraft] = useState<OrderView[]>([]);
  const [toast, setToast] = useState<string | null>(null);
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
  const offersForMe = (state.ofertas ?? []).filter((o) => o.estado === "open" && o.para === state.yo.casa).length;
  const p = state.partida;

  // Cada cambio de órdenes se guarda al momento (no hay que "sellar").
  const updateDraft = async (orders: OrderView[]) => {
    const removed = orders.length < draft.length;
    setDraft(orders);
    savingRef.current = true;
    try {
      await api.saveOrders(id, orders);
      setToast(removed ? "Orden quitada." : "Orden guardada. Se cumplirá en la resolución.");
    } catch (err) {
      setToast((err as Error).message);
    } finally {
      savingRef.current = false;
      await load();
    }
  };

  return (
    <div className="game">
      <header className="topbar" style={{ borderColor: HOUSE_COLORS[me.color]?.hex }}>
        <div className="topbar-title">
          <button className="link" onClick={() => navigate("/")} aria-label="Volver al inicio">
            ‹
          </button>
          <ShieldIcon color={me.color} escudo={me.escudo} size={22} />
          <strong>{me.nombre}</strong>
          <span className="muted">· {me.prestigio?.total ?? 0} de Prestigio</span>
        </div>
        <div className="resources" aria-label="Recursos">
          {RESOURCES.map((r) => (
            <span key={r} className={`res res-${r}`} title={RESOURCE_LABEL[r]}>
              <ResourceIcon r={r} /> {state.yo.recursos?.[r] ?? 0}
              <span className="sr-only"> de {RESOURCE_LABEL[r]}</span>
            </span>
          ))}
        </div>
        {p.estado === "active" && p.proximaResolucion && (
          <div className="clock">
            {p.haEmpezado ? (
              <>
                Resolución {p.proximaResolucion} de {p.totalResoluciones}: {formatWhen(p.resolucion)} ·{" "}
                <strong>{p.ordenesAbiertas ? `órdenes: ${timeLeft(p.cierre, state.prueba?.ahora ? Date.parse(state.prueba.ahora) : undefined)}` : "órdenes cerradas"}</strong>
              </>
            ) : (
              <>La partida empieza el {formatDay(p.inicio)}. Ya puedes preparar tus órdenes.</>
            )}
          </div>
        )}
        {p.estado === "finished" && <div className="clock">Partida terminada. ¡Larga vida al nuevo rey!</div>}
        {p.estado === "active" && state.evento && (
          <details className="event-banner">
            <summary>
              <strong>{state.evento.nombre}</strong> · {state.evento.texto}
            </summary>
            <p className="event-line">
              <FrayAbundio mood="solemne" size={40} />
              <span>
                <em>«{state.evento.linea}»</em> — Fray Abundio
              </span>
            </p>
          </details>
        )}
      </header>

      {state.prueba?.ahora && <TestBench state={state} gameId={id} act={act} />}

      <main className="game-body">
        {tab === "mapa" && <MapView state={state} draft={draft} setDraft={updateDraft} act={act} />}
        {tab === "castillo" && <CastlePanel state={state} act={act} gameId={id} />}
        {tab === "ordenes" && (
          <OrdersPanel state={state} draft={draft} setDraft={updateDraft} />
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
            ["mapa", "Mapa"],
            ["castillo", "Castillo"],
            ["ordenes", draft.length > 0 ? `Órdenes (${draft.length})` : "Órdenes"],
            ["comercio", offersForMe > 0 ? `Comercio (${offersForMe})` : "Comercio"],
            ["reino", "Reino"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} aria-current={tab === key}>
            {label}
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
