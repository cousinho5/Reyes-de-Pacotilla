// Bloque 7: tus partidas en la portada. Arriba y grande, la que más te necesita
// (cuenta atrás, avisos, clasificación en escudos y mini mapa); debajo, las demás,
// la vitrina de coronas y la tarjeta para instalar el juego.

import { useEffect, useMemo, useRef, useState } from "react";
import { GRID } from "@reyes/engine";
import type { HouseInfo, MyGame } from "../api";
import { navigate } from "../App";
import { Crown, FrayAbundio, Pixels, ShieldIcon } from "../art";
import { makeGeo } from "../art/grid";
import { corona } from "../art/portadaIconos";
import { bulletinKey, bulletinSeen } from "../bulletinSeen";
import { attackLines, closeLine, closingSoon, showcase, startText, timeLeft } from "../home";
import { HOUSE_COLORS, TERRITORY } from "../ui";

const open = (g: MyGame, tab?: string) => navigate(`/partida/${g.id}${tab ? `?pestana=${tab}` : ""}`);

/** Si el último boletín de la partida aún no se ha leído en este móvil. */
function newBulletin(g: MyGame) {
  const b = g.resumen?.boletin;
  if (!b) return false;
  const seen = bulletinSeen(g.id);
  return seen !== "?" && seen !== bulletinKey(b);
}

/** El reino entero en pequeño: cada casilla del color de su casa, las tuyas con borde de latón. */
function MiniMap({ g }: { g: MyGame }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const map = g.resumen?.mapa;
  const geo = useMemo(() => (map ? makeGeo(GRID.kind, map.columnas, map.filas, 2) : null), [map]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !map || !geo) return;
    const color = new Map((g.casas ?? []).map((h) => [h.id, h.color]));
    ctx.clearRect(0, 0, geo.width, geo.height);
    const path = (x: number, y: number, inset: number) => {
      const pts = geo.outline(x, y, inset);
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
    };
    for (const [x, y, owner] of map.casillas) {
      const c = owner ? color.get(owner) : undefined;
      ctx.fillStyle = c ? (owner === g.casaId ? (TERRITORY[c] ?? "#d6a64b") : (HOUSE_COLORS[c]?.hex ?? "#666")) : "#56703a";
      path(x, y, 0.5);
      ctx.fill();
    }
    ctx.strokeStyle = "#f1cf7d";
    ctx.lineWidth = 1.5;
    for (const [x, y, owner] of map.casillas) {
      if (owner !== g.casaId) continue;
      path(x, y, 1.5);
      ctx.stroke();
    }
    for (const [x, y, owner, castle] of map.casillas) {
      if (!castle) continue;
      const [cx, cy] = geo.center(x, y);
      ctx.fillStyle = "#1c1410";
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
      ctx.fillStyle = owner === g.casaId ? "#f1cf7d" : "#e6e1d6";
      ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
    }
  }, [map, geo, g]);
  if (!map || !geo) return null;
  const mine = map.casillas.filter((t) => t[2] === g.casaId).length;
  return (
    <div className="home-realm">
      <canvas ref={canvas} width={geo.width} height={geo.height} role="img" aria-label={`El reino: ${mine} casillas son tuyas`} />
      <p>
        <b>Tu reino</b>
        <span>
          {mine} {mine === 1 ? "casilla" : "casillas"} de {map.casillas.length}
        </span>
      </p>
    </div>
  );
}

function Standing({ g }: { g: MyGame }) {
  const r = g.resumen!;
  const houses = new Map((g.casas ?? []).map((h) => [h.id, h]));
  if (r.clasificacion.length === 0 || !r.puesto) return null;
  const mine = r.clasificacion.find((x) => x.casa === g.casaId);
  const moved = r.puestoAntes ? r.puestoAntes - r.puesto : 0;
  return (
    <div className="home-standing">
      <ol>
        {r.clasificacion.map((x, i) => {
          const h = houses.get(x.casa);
          return (
            <li key={x.casa} className={x.casa === g.casaId ? "me" : undefined}>
              {h && <ShieldIcon color={h.color} escudo={h.escudo} size={x.casa === g.casaId ? 30 : 24} title={h.nombre} />}
              <b>{i + 1}.º</b>
            </li>
          );
        })}
      </ol>
      <p>
        <b>
          {r.puesto}.º de {r.clasificacion.length}
        </b>{" "}
        · {mine?.total ?? 0} de Prestigio
        {moved !== 0 && (
          <span className={moved > 0 ? "up" : "down"}>
            {" "}
            · {moved > 0 ? "▲" : "▼"} {Math.abs(moved)} {Math.abs(moved) === 1 ? "puesto" : "puestos"}
          </span>
        )}
      </p>
    </div>
  );
}

function Alert({ kind, icon, children, onClick }: { kind?: string; icon: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <li>
      <button className={`home-alert${kind ? ` ${kind}` : ""}`} onClick={onClick}>
        <span className="ico" aria-hidden>
          {icon}
        </span>
        <span>{children}</span>
        <i aria-hidden>›</i>
      </button>
    </li>
  );
}

const subline = (g: MyGame) => {
  const r = g.resumen;
  if (g.estado === "lobby") return `${g.casa} · sala de espera`;
  if (g.estado === "finished") return `${g.casa} · terminada`;
  return r?.noche ? `${g.casa} · semana ${r.semana}, noche ${r.noche} de ${r.totalNoches}` : g.casa;
};

function Head({ g, size }: { g: MyGame; size: number }) {
  return (
    <header>
      <ShieldIcon color={g.color} escudo={g.escudo} size={size} />
      <div>
        <h3>{g.nombre}</h3>
        <p>
          {subline(g)}
          {g.prueba && " · prueba"}
        </p>
      </div>
    </header>
  );
}

/** Los escudos de quienes ya están y los huecos que quedan (8 como mucho). */
function Court({ casas }: { casas: HouseInfo[] }) {
  return (
    <div className="home-court">
      {casas.map((h) => (
        <ShieldIcon key={h.id} color={h.color} escudo={h.escudo} size={22} title={h.nombre} />
      ))}
      {Array.from({ length: Math.max(0, 8 - casas.length) }, (_, i) => (
        <i key={i} className="gap" aria-hidden />
      ))}
    </div>
  );
}

/** Invitar a más gente a tu partida en la sala de espera (el menú de compartir del móvil). */
function InviteMore({ g }: { g: MyGame }) {
  const [copied, setCopied] = useState(false);
  if (!g.codigoInvitacion) return null;
  const url = `${window.location.origin}/unirse/${g.codigoInvitacion}`;
  return (
    <button
      className="ghost-ink"
      onClick={async () => {
        const text = `Te invito a «${g.nombre}» en Reyes de Pacotilla.`;
        try {
          if (navigator.share) await navigator.share({ title: "Reyes de Pacotilla", text, url });
          else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }
        } catch {
          /* cancelado */
        }
      }}
    >
      {copied ? "Enlace copiado" : "Invitar a más"}
    </button>
  );
}

const startLine = (g: MyGame) => (
  <>
    {g.casas?.length ?? 0} de 8 casas · {startText(g.inicio)}
  </>
);

export function MainGame({ g, now }: { g: MyGame; now: Date }) {
  const r = g.resumen;
  const urgent = !!r?.faltanOrdenes;
  const soon = closingSoon(r?.cierre, now);
  return (
    <article className={`home-card main${urgent ? " urgent" : ""}`}>
      {urgent && <span className="seal">Te toca</span>}
      <Head g={g} size={56} />
      {g.estado === "active" && r?.cierre && (
        <div className={`home-clock${soon ? " soon" : ""}`}>
          <span className="sand" aria-hidden>
            <i />
          </span>
          <div>
            <b>{r.ordenesAbiertas ? `Órdenes: cierran en ${timeLeft(r.cierre, now)}` : "Órdenes cerradas: esta noche se resuelve"}</b>
            <small>{r.ordenesAbiertas ? closeLine(r.cierre, now) : `Mañana, la noche ${r.noche} en la repetición.`}</small>
          </div>
        </div>
      )}
      {g.estado === "active" && r && (
        <ul className="home-alerts">
          {urgent && (
            <Alert kind="urgent" icon="!" onClick={() => open(g, "ordenes")}>
              <b>Aún no has dado órdenes</b> para esta noche
            </Alert>
          )}
          {attackLines(r.ataques).map((line) => (
            <Alert key={line} icon="⚔" onClick={() => open(g)}>
              {line}
            </Alert>
          ))}
          {newBulletin(g) && (
            <Alert icon="✉" onClick={() => open(g, "reino")}>
              Boletín nuevo de Fray Abundio
            </Alert>
          )}
          {r.ofertas > 0 && (
            <Alert icon="⚖" onClick={() => open(g, "comercio")}>
              {r.ofertas === 1 ? "Una oferta de comercio" : `${r.ofertas} ofertas de comercio`} para ti
            </Alert>
          )}
        </ul>
      )}
      {g.estado === "lobby" && (
        <>
          <Court casas={g.casas ?? []} />
          <p className="note">{startLine(g)}</p>
        </>
      )}
      {g.estado === "finished" && r?.final && <FinalLine g={g} />}
      {r && <Standing g={g} />}
      {r && g.estado !== "lobby" && <MiniMap g={g} />}
      <div className="home-card-actions">
        <button className="primary big wide" onClick={() => open(g, g.estado === "finished" ? "reino" : undefined)}>
          {g.estado === "finished" ? "Ver la coronación" : g.estado === "lobby" ? "Ir a la sala de espera" : "Entrar en mi castillo"}
        </button>
        {g.estado === "lobby" && <InviteMore g={g} />}
      </div>
    </article>
  );
}

function FinalLine({ g }: { g: MyGame }) {
  const f = g.resumen!.final!;
  const won = f.ganador != null && f.ganador === g.casaId;
  return (
    <p className="note">
      {won ? <b>¡Ganaste la corona!</b> : f.puesto ? `Quedaste ${f.puesto}.º.` : "Partida terminada."}
      {g.titulo && (
        <>
          {" "}
          Título: <i>{g.titulo}</i>
        </>
      )}
    </p>
  );
}

export function SmallGame({ g, now }: { g: MyGame; now: Date }) {
  const r = g.resumen;
  const won = g.estado === "finished" && r?.final?.ganador != null && r.final.ganador === g.casaId;
  return (
    <article className={`home-card${won ? " won" : ""}`}>
      <button className="home-card-open" onClick={() => open(g, g.estado === "finished" ? "reino" : undefined)}>
        <Head g={g} size={40} />
        {won && (
          <span className="medal" aria-hidden>
            <Pixels grid={corona.grid} palette={corona.palette} size={34} />
          </span>
        )}
        <i aria-hidden>›</i>
      </button>
      {g.estado === "lobby" && (
        <>
          <Court casas={g.casas ?? []} />
          <p className="note">{startLine(g)}</p>
          <InviteMore g={g} />
        </>
      )}
      {g.estado === "active" && r?.cierre && (
        <p className={`note${r.faltanOrdenes ? " late" : ""}`}>
          {r.faltanOrdenes ? "Te faltan órdenes · " : ""}
          {r.ordenesAbiertas ? `cierran en ${timeLeft(r.cierre, now)}` : "órdenes cerradas"}
          {r.puesto ? ` · ${r.puesto}.º de ${r.clasificacion.length}` : ""}
        </p>
      )}
      {g.estado === "finished" && r?.final && <FinalLine g={g} />}
    </article>
  );
}

/** Coronas ganadas, partidas jugadas y el título de la última. */
export function Showcase({ games }: { games: MyGame[] }) {
  const s = showcase(games);
  if (s.jugadas === 0) return null;
  return (
    <section className="home-showcase">
      <h4>Tu vitrina</h4>
      <div className="shelf">
        {Array.from({ length: s.coronas }, (_, i) => (
          <Crown key={i} size={40} shine={i === s.coronas - 1} />
        ))}
        {Array.from({ length: Math.max(0, 3 - s.coronas) }, (_, i) => (
          <i key={i} className="empty" aria-hidden />
        ))}
      </div>
      <p>
        {s.coronas} {s.coronas === 1 ? "corona" : "coronas"} · {s.jugadas} {s.jugadas === 1 ? "partida jugada" : "partidas jugadas"}
        {s.titulo && (
          <>
            {" "}
            · última: <i>{s.titulo}</i>
          </>
        )}
      </p>
    </section>
  );
}

// ------------------------------------------------------------------ instalar

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}
let deferred: InstallPrompt | null = null;
if (typeof window !== "undefined")
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
  });

const DISMISS_KEY = "instalar:cerrado";
const DISMISS_DAYS = 30;
const installed = () =>
  (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function dismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

/** 11.11 del banco: instalar el juego para recibir avisos. En el iPhone, cómo hacerlo a mano. */
export function InstallCard() {
  const [hidden, setHidden] = useState(() => installed() || dismissed());
  const [help, setHelp] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (hidden || (!deferred && !isIos())) return null;
  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* sin almacenamiento: vuelve a salir la próxima vez */
    }
    setHidden(true);
  };
  return (
    <section className="home-install">
      <FrayAbundio mood="monedas" size={40} />
      <p>Añade Reyes de Pacotilla a tu pantalla de inicio para recibir avisos. El cronista no puede ir a buscarte.</p>
      <div>
        <button
          className="ghost-ink"
          onClick={async () => {
            if (deferred) {
              await deferred.prompt();
              deferred = null;
              setHidden(true);
            } else setHelp((h) => !h);
          }}
        >
          Instalar
        </button>
        <button className="link" onClick={close} aria-label="No mostrar en 30 días">
          Ahora no
        </button>
      </div>
      {help && (
        <ol className="ios-steps">
          <li>
            Toca <b>Compartir</b> (el cuadrado con la flecha hacia arriba).
          </li>
          <li>
            Elige <b>Añadir a pantalla de inicio</b>.
          </li>
          <li>Abre el juego desde el icono nuevo y acepta los avisos.</li>
        </ol>
      )}
    </section>
  );
}
