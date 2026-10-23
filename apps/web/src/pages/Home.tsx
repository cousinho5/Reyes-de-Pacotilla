// Bloque 7: la portada. Arriba, Aldricia viva según la hora del móvil; debajo,
// según quién llega: la bienvenida con los tres pasos y el prólogo (sin entrar)
// o las partidas (con sesión). El código se escribe en una hoja, sin salir de aquí.

import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { api, type Me } from "../api";
import { navigate } from "../App";
import { FrayAbundio, Pixels, still, type FrayMood } from "../art";
import { bandera, brillo, carreta, corona } from "../art/portadaIconos";
import type { Sprite } from "../art/sprites";
import { CodeSheet } from "../components/CodeSheet";
import { InstallCard, MainGame, Showcase, SmallGame } from "../components/HomeGames";
import { greeting, hourAt, hourFromUrl, insideLines, mainGame, sortGames, toDeviceClock, welcomeLines, type HomeHour } from "../home";

// El dibujo y el prólogo van en su propio trozo de JS: la portada sale al momento
// con el cielo y el título, y la escena aparece encima en cuanto llega.
const Panorama = lazy(() => import("../components/Panorama"));
const HomePrologue = lazy(() => import("../components/HomePrologue"));

/** La hora del cielo: la del reloj del móvil, mirada cada minuto. */
function useHour(): HomeHour {
  const forced = useMemo(() => hourFromUrl(window.location.search), []);
  const [hour, setHour] = useState(() => forced ?? hourAt(new Date()));
  useEffect(() => {
    if (forced) return;
    const id = setInterval(() => setHour(hourAt(new Date())), 60_000);
    return () => clearInterval(id);
  }, [forced]);
  return hour;
}

/** Un dibujo animado pequeño (los iconos de los pasos y el brillo de la corona). */
function Anim({ frames, fps, size, className }: { frames: Sprite[]; fps: number; size: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still()) return;
    const id = setInterval(() => document.visibilityState === "visible" && setI((n) => (n + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps]);
  const s = frames[i]!;
  return <Pixels grid={s.grid} palette={s.palette} size={size} className={className} />;
}

function Hero({ hour, small }: { hour: HomeHour; small: boolean }) {
  return (
    <header className="home-hero" data-hora={hour}>
      <Suspense fallback={null}>
        <Panorama hour={hour} />
      </Suspense>
      <div className={`home-title${small ? " small" : ""}`}>
        <h1>
          <span className="home-crown" aria-hidden>
            <Pixels grid={corona.grid} palette={corona.palette} size={small ? 36 : 46} />
            <Anim frames={brillo} fps={10} size={18} className="home-shine" />
          </span>
          <span className="r1">Reyes de</span>
          <span className="r2">Pacotilla</span>
        </h1>
        <p className="sub">Aldricia, el Reino Más o Menos Unido</p>
      </div>
    </header>
  );
}

/** Fray Abundio con un bocadillo que cambia de frase cada pocos segundos. */
function FrayCard({ lines, mood }: { lines: string[]; mood: FrayMood }) {
  const [i, setI] = useState(0);
  const key = lines.join("\n");
  useEffect(() => {
    setI(0);
    if (lines.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), 6500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="home-fray">
      <FrayAbundio mood={mood} size={64} />
      <p key={i} className="bubble" aria-live="polite">
        {lines[i % lines.length]}
      </p>
    </div>
  );
}

/** Cómo se juega, en tres pasos. */
function Steps() {
  return (
    <section className="home-steps">
      <h2>Un trono vacío y demasiados aspirantes</h2>
      <p className="motto">Para 4 a 8 amigos · 6 semanas · 5 minutos al día</p>
      <ol>
        <li>
          <span className="icon">
            <Anim frames={carreta} fps={6} size={60} />
          </span>
          <span>
            <b>De día, das órdenes</b>
            Cosecha, construye, comercia y mueve tus tropas. Con cinco minutos basta.
          </span>
        </li>
        <li>
          <span className="icon">
            <Anim frames={bandera} fps={8} size={52} />
          </span>
          <span>
            <b>De noche, todo se resuelve</b>
            Las órdenes de todas las casas se cumplen a la vez. Por la mañana, Fray Abundio lo cuenta en su boletín.
          </span>
        </li>
        <li>
          <span className="icon">
            <Pixels grid={corona.grid} palette={corona.palette} size={52} />
          </span>
          <span>
            <b>En seis semanas, una corona</b>
            Gana quien acabe con más Prestigio. Las alianzas se firman y, a veces, se rompen.
          </span>
        </li>
      </ol>
    </section>
  );
}

/** Pegar un enlace o un código de invitación. */
function InviteField({ autoFocus }: { autoFocus?: boolean }) {
  const [invite, setInvite] = useState("");
  return (
    <form
      className="home-invite"
      onSubmit={(e) => {
        e.preventDefault();
        const code = invite.trim().split("/").filter(Boolean).pop();
        if (code) navigate(`/unirse/${code}`);
      }}
    >
      <label htmlFor="home-invite">¿Tienes una invitación?</label>
      <span>
        <input id="home-invite" placeholder="Código o enlace" value={invite} autoFocus={autoFocus} onChange={(e) => setInvite(e.target.value)} />
        <button type="submit" disabled={!invite.trim()}>
          Ir
        </button>
      </span>
    </form>
  );
}

function Outside({ hour, onCode }: { hour: HomeHour; onCode: () => void }) {
  const [invite, setInvite] = useState(false);
  const [prologue, setPrologue] = useState(false);
  const lines = useMemo(() => welcomeLines(hour), [hour]);
  return (
    <>
      <FrayCard lines={lines} mood="adulador" />
      <div className="home-actions">
        <button className="primary big" onClick={onCode}>
          Entrar con mi código
        </button>
        {invite ? (
          <InviteField autoFocus />
        ) : (
          <button className="ghost" onClick={() => setInvite(true)}>
            Tengo una invitación
          </button>
        )}
        <button className="home-prologue" onClick={() => setPrologue(true)}>
          <i aria-hidden>▶</i> Ver el prólogo <small>45 s</small>
        </button>
      </div>
      <Steps />
      <footer className="home-foot">Reyes de Pacotilla · un juego para amigos con paciencia y poca vergüenza</footer>
      {prologue && (
        <Suspense fallback={null}>
          <HomePrologue onClose={() => setPrologue(false)} />
        </Suspense>
      )}
    </>
  );
}

/** La hora para las cuentas atrás, al minuto. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Inside({ me, hour, onLogout }: { me: Me; hour: HomeHour; onLogout: () => void }) {
  const now = useNow();
  const sorted = useMemo(() => sortGames(me.partidas, now), [me.partidas, now]);
  const main = mainGame(sorted);
  const rest = sorted.filter((g) => g !== main);
  const lines = useMemo(() => insideLines(main, now), [main, now]);
  // Con el juego instalado, el icono lleva cuántas partidas te piden órdenes.
  const pending = me.partidas.filter((g) => g.resumen?.faltanOrdenes).length;
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    (pending ? nav.setAppBadge?.(pending) : nav.clearAppBadge?.())?.catch(() => {});
  }, [pending]);
  return (
    <>
      <h2 className="home-hello">
        {greeting(hour)}, {me.usuario!.nombre}
      </h2>
      <FrayCard lines={lines} mood={main?.resumen?.faltanOrdenes ? "escandalizado" : "solemne"} />
      {main && <MainGame g={main} now={now} />}
      {rest.length > 0 && (
        <>
          <h4 className="home-sep">Tus otras partidas</h4>
          {rest.map((g) => (
            <SmallGame key={g.id} g={g} now={now} />
          ))}
        </>
      )}
      <Showcase games={me.partidas} />
      <InstallCard />
      <InviteField />
      <button className="link home-logout" onClick={onLogout}>
        Salir
      </button>
    </>
  );
}

export function Home({ askCode = false }: { askCode?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [code, setCode] = useState(askCode);
  const hour = useHour();

  const load = () =>
    api
      .me()
      .then((m) => setMe({ ...m, partidas: m.partidas.map((g) => toDeviceClock(g, new Date())) }))
      .catch(() => setMe({ usuario: null, partidas: [] }));
  useEffect(() => void load(), []);

  const inside = !!me?.usuario;
  return (
    <main className="home">
      <Hero hour={hour} small={inside} />
      <div className="home-body">
        {me &&
          (inside ? (
            <Inside
              me={me}
              hour={hour}
              onLogout={async () => {
                await api.logout();
                setMe({ usuario: null, partidas: [] });
              }}
            />
          ) : (
            <Outside hour={hour} onCode={() => setCode(true)} />
          ))}
      </div>
      {code && (
        <CodeSheet
          onClose={() => {
            setCode(false);
            if (window.location.pathname === "/entrar") window.history.replaceState(null, "", "/");
          }}
          onDone={() => {
            setCode(false);
            if (window.location.pathname === "/entrar") window.history.replaceState(null, "", "/");
            void load();
          }}
        />
      )}
    </main>
  );
}
