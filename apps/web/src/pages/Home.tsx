// Bloque 7: la portada. Arriba, Aldricia viva según la hora del móvil; debajo,
// según quién llega: la bienvenida con los tres pasos (sin entrar) o las
// partidas (con sesión). El código se escribe en una hoja, sin salir de aquí.
// Abre al momento con lo último que se vio y, sin conexión, lo dice.

import { useEffect, useMemo, useState } from "react";
import { api, savedMe, type Me } from "../api";
import { navigate } from "../App";
import { CodeSheet } from "../components/CodeSheet";
import { FrayCard, Hero, Steps, useSky } from "../components/HomeParts";
import { InstallCard, MainGame, Showcase, SmallGame } from "../components/HomeGames";
import { CROWN_LINES, agoText, greeting, insideLines, mainGame, sortGames, toDeviceClock, welcomeLines, type HomeHour } from "../home";

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

function Outside({ hour, crown, onCode }: { hour: HomeHour; crown: string | null; onCode: () => void }) {
  const [invite, setInvite] = useState(false);
  const lines = useMemo(() => withCrown(crown, welcomeLines(hour)), [crown, hour]);
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
      </div>
      <Steps />
      <footer className="home-foot">Reyes de Pacotilla · un juego para amigos con paciencia y poca vergüenza</footer>
    </>
  );
}

/** Lo que dice Fray Abundio de la corona, delante de lo de siempre. */
const withCrown = (crown: string | null, lines: string[]) => (crown ? [crown, ...lines] : lines);

/** La hora para las cuentas atrás, al minuto. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Inside({ me, hour, crown, onLogout }: { me: Me; hour: HomeHour; crown: string | null; onLogout: () => void }) {
  const now = useNow();
  const sorted = useMemo(() => sortGames(me.partidas, now), [me.partidas, now]);
  const main = mainGame(sorted);
  const rest = sorted.filter((g) => g !== main);
  const lines = useMemo(() => withCrown(crown, insideLines(main, now)), [crown, main, now]);
  return (
    <>
      <h2 className="home-hello">
        {greeting(hour)}, {me.usuario!.nombre}
      </h2>
      {me.guardadoA != null && (
        <p className="home-offline" role="status">
          Sin conexión: es lo que viste {agoText(me.guardadoA, now)}.
        </p>
      )}
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

const deviceClock = (m: Me): Me => ({ ...m, partidas: m.partidas.map((g) => toDeviceClock(g, new Date())) });

export function Home({ askCode = false }: { askCode?: boolean }) {
  // Lo último que se vio sale al momento; la red lo pone al día en cuanto llega.
  const [me, setMe] = useState<Me | null>(() => {
    const saved = savedMe();
    return saved ? deviceClock(saved) : null;
  });
  const [code, setCode] = useState(askCode);
  const [crown, setCrown] = useState<string | null>(null);
  const sky = useSky();
  const hour = sky.hour;
  const onCrown = () => setCrown((c) => CROWN_LINES[(CROWN_LINES.indexOf(c ?? "") + 1) % CROWN_LINES.length]!);

  const load = () =>
    api
      .me()
      .then((m) => setMe(deviceClock(m)))
      .catch(() => setMe((m) => m ?? { usuario: null, partidas: [] }));
  useEffect(() => void load(), []);

  const inside = !!me?.usuario;
  return (
    <main className="home">
      <Hero sky={sky} small={inside} onCrown={onCrown} />
      <div className="home-body">
        {me &&
          (inside ? (
            <Inside
              me={me}
              hour={hour}
              crown={crown}
              onLogout={async () => {
                await api.logout();
                setMe({ usuario: null, partidas: [] });
              }}
            />
          ) : (
            <Outside hour={hour} crown={crown} onCode={() => setCode(true)} />
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
