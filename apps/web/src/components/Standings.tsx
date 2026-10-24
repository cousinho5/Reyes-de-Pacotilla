// Bloque 11: clasificación con podio para los tres primeros y el resto en
// lista, con flechas desde la noche anterior y una barra de distancia al primero.
// Al llegar una noche nueva, las cifras suben, las flechas aparecen una a una y
// la corona brilla un momento; con «reducir movimiento», nada se mueve.

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BotMark, Crown, Podium, ShieldIcon, still } from "../art";
import type { GameState } from "../api";
import { chaserLine, podiumLine, standings, type Standing } from "../realm";
import { ACHIEVEMENT_LABEL } from "../ui";
import { useOpenHouse } from "../houseSheet";

/** Sitio de cada puesto sobre el dibujo del podio (72x26): izquierda, ancho y alto del escalón. */
const SPOTS: Record<number, { x: number; w: number; top: number }> = {
  2: { x: 0, w: 24, top: 8 },
  1: { x: 23, w: 26, top: 2 },
  3: { x: 48, w: 24, top: 13 },
};

function Move({ move, i }: { move: number | null; i: number }) {
  if (move == null) return null;
  const style = { "--i": i } as CSSProperties;
  if (move === 0)
    return (
      <span className="move same" style={style} title="Igual que anoche">
        =
      </span>
    );
  const up = move > 0;
  return (
    <span className={`move ${up ? "up" : "down"}`} style={style} title={`${up ? "Sube" : "Baja"} ${Math.abs(move)} desde anoche`}>
      {up ? "▲" : "▼"}
      {Math.abs(move)}
    </span>
  );
}

/** Una cifra que sube desde `from` hasta `to` en un momento (o se queda quieta). */
function CountUp({ from, to }: { from: number | undefined; to: number }) {
  const [n, setN] = useState(from ?? to);
  useEffect(() => {
    if (from == null || from === to || still()) return setN(to);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setN(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return <>{n}</>;
}

/**
 * Lo que esta casa vio la última vez en Reino (en este navegador). Si desde
 * entonces ha habido otra noche, devuelve el Prestigio de entonces para que las
 * cifras suban desde ahí.
 */
function useNewNight(state: GameState): Record<number, number> | null {
  const key = `reino-visto:${state.partida.id}`;
  const night = state.partida.resolucionActual;
  const [from] = useState<Record<number, number> | null>(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(key) ?? "null") as { noche: number; totales: Record<number, number> } | null;
      return seen && seen.noche < night ? seen.totales : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ noche: night, totales: Object.fromEntries(standings(state).map((r) => [r.house.id, r.total])) }));
    } catch {
      /* sin almacenamiento: sin animación la próxima vez */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, night]);
  return from;
}

export function Standings({ state, children }: { state: GameState; children?: ReactNode }) {
  // Al tocar una casa, su ficha (bloque 11).
  const onPick = useOpenHouse();
  const rows = standings(state);
  const me = state.yo.casa;
  const final = !!state.partida.final;
  const top = Math.max(1, rows[0]?.total ?? 0);
  const from = useNewNight(state);
  const fresh = from != null;
  // El podio, en el orden de siempre: segundo, primero, tercero.
  const podium = [rows[1], rows[0], rows[2]].filter((r): r is Standing => !!r);
  const line = podiumLine(rows, me);
  const chaser = final ? null : chaserLine(rows, me);

  return (
    <section className={`card standings${fresh ? " fresh" : ""}${final ? " final" : ""}`}>
      <h2>{final ? "Clasificación final" : "Clasificación de Prestigio"}</h2>
      <div className="podium" role="list" aria-label="Podio">
        <div className="podium-stage">
          <Podium />
          {podium.map((r) => {
            const spot = SPOTS[r.place]!;
            return (
              <div
                key={r.house.id}
                role="listitem"
                className={`podium-spot p${r.place}${r.house.id === me ? " me" : ""}`}
                style={{ left: `${(spot.x / 72) * 100}%`, width: `${(spot.w / 72) * 100}%`, top: `${(spot.top / 26) * 100}%` }}
              >
                <button className="podium-house" onClick={() => onPick?.(r.house.id)} aria-label={`${r.place}.º ${r.house.nombre}, ${r.total} de Prestigio`}>
                  {r.place === 1 && (
                    <span className="podium-crown">
                      <Crown size={final ? 48 : 32} shine={fresh || final} />
                    </span>
                  )}
                  <ShieldIcon color={r.house.color} escudo={r.house.escudo} size={r.place === 1 ? (final ? 80 : 64) : 48} />
                  <strong className="podium-name">
                    {r.house.bot && <BotMark size={14} />}
                    {r.house.nombre}
                  </strong>
                  <span className="podium-total">
                    <CountUp from={from?.[r.house.id]} to={r.total} />
                    <Move move={r.move} i={r.place - 1} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {line && <p className="podium-line">{line}</p>}
      {chaser && <p className="podium-line chaser">{chaser}</p>}
      {rows.length > 3 && (
        <ol className="ranking" start={4}>
          {rows.slice(3).map((r) => (
            <li key={r.house.id} className={r.house.id === me ? "me" : ""}>
              <button className="row-button" onClick={() => onPick?.(r.house.id)}>
                <span className="rank">{r.place}</span>
                <ShieldIcon color={r.house.color} escudo={r.house.escudo} size={28} />
                <span className="grow">
                  {r.house.bot && <BotMark size={16} />}
                  <strong>{r.house.nombre}</strong>
                  {(r.house.logros ?? []).map((l) => (
                    <span key={l.clave} className="chip achievement">
                      {ACHIEVEMENT_LABEL[l.clave] ?? l.clave}
                      {l.veces > 1 && ` x${l.veces}`}
                    </span>
                  ))}
                  <span className="gap-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((100 * Math.max(0, r.total)) / top)}%` }} />
                  </span>
                  {r.behind > 0 && <small className="muted">a {r.behind} del primero</small>}
                </span>
                <Move move={r.move} i={r.place - 1} />
                <strong>
                  <CountUp from={from?.[r.house.id]} to={r.total} />
                </strong>
              </button>
            </li>
          ))}
        </ol>
      )}
      {children}
    </section>
  );
}
