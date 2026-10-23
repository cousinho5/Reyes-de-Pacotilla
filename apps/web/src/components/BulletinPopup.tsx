// Bloque 3: al publicarse un boletín, sale una vez en una ventana encima de
// cualquier pestaña, con una cruceta para cerrarla. Si hay dos sin leer, sale
// el último con un enlace al anterior. Queda guardado en Reino.

import { useEffect, useRef, useState } from "react";
import { api, type GameState } from "../api";
import { bulletinKey, markBulletinSeen, unreadBulletins } from "../bulletinSeen";
import { Parchment, type Shown } from "./Parchment";

export function BulletinPopup({ state, onClose }: { state: GameState; onClose: () => void }) {
  const unread = unreadBulletins(state);
  const [index, setIndex] = useState(0);
  const [bulletin, setBulletin] = useState<Shown | null>(null);
  // La repetición de la noche va antes: la ventana espera a que acabe.
  const [replaying, setReplaying] = useState(() => !!document.querySelector(".replay, .cinematic"));
  useEffect(() => {
    const t = setInterval(() => setReplaying(!!document.querySelector(".replay, .cinematic")), 800);
    return () => clearInterval(t);
  }, []);

  const current = unread[index];
  useEffect(() => {
    if (!current) return;
    let alive = true;
    api
      .bulletin(state.partida.id, current.semana, current.edicion ?? "domingo")
      .then((b) => alive && setBulletin(b))
      .catch(() => alive && setBulletin(null));
    return () => {
      alive = false;
    };
  }, [state.partida.id, current?.semana, current?.edicion]);

  const close = () => {
    if (unread[0]) markBulletinSeen(state.partida.id, bulletinKey(unread[0]));
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current || !bulletin || replaying) return null;
  const previous = unread[index + 1];
  return (
    <div className="bulletin-popup" role="dialog" aria-modal="true" aria-label={bulletin.headline} onClick={close}>
      <div className="bulletin-popup-body" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={close} aria-label="Cerrar">
          ✕
        </button>
        <Parchment bulletin={bulletin} gameName={state.partida.nombre} houses={state.casas} />
        {previous && (
          <button className="link popup-previous" onClick={() => (setBulletin(null), setIndex(index + 1))}>
            Leer también {previous.semana === 0 ? "la Crónica Definitiva" : previous.edicion === "miercoles" ? `la hoja del miércoles ${previous.semana}` : `el boletín del domingo ${previous.semana}`} ›
          </button>
        )}
      </div>
    </div>
  );
}

type Listed = NonNullable<GameState["boletines"]>[number];
const listedName = (b: Listed) =>
  b.semana === 0 ? "Crónica Definitiva" : b.edicion === "miercoles" ? `Hoja volandera del miércoles ${b.semana}` : `Boletín del domingo ${b.semana}`;

/**
 * Bloque 11: «Leer el boletín» desde Reino. La misma ventana de pergamino, con
 * el último boletín y, debajo, los anteriores para leerlos.
 */
export function BulletinReader({ state, onClose }: { state: GameState; onClose: () => void }) {
  const list = [...(state.boletines ?? [])].sort((a, b) => (a.semana === 0 ? -1 : b.semana === 0 ? 1 : 0));
  const [chosen, setChosen] = useState(list[0] ? bulletinKey(list[0]) : null);
  const [bulletin, setBulletin] = useState<Shown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chosen) return;
    const [week, edition] = chosen.split(":") as [string, "domingo" | "miercoles"];
    let alive = true;
    api
      .bulletin(state.partida.id, Number(week), edition)
      .then((b) => alive && (setBulletin(b), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // La fe de erratas cambia el pie de la Crónica: se vuelve a leer.
  }, [state.partida.id, chosen, state.feDeErratas?.texto]);
  // Leer el último cuenta como leído: no sale después en la ventana emergente.
  useEffect(() => {
    if (bulletin && list[0] && chosen === bulletinKey(list[0])) markBulletinSeen(state.partida.id, chosen);
  }, [bulletin, chosen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = bulletin && chosen === `${bulletin.week}:${bulletin.edition ?? "domingo"}` ? bulletin : null;
  const others = list.filter((b) => bulletinKey(b) !== chosen);
  const pick = (b: Listed) => {
    setChosen(bulletinKey(b));
    body.current?.closest(".bulletin-popup")?.scrollTo({ top: 0 });
  };
  return (
    <div className="bulletin-popup" role="dialog" aria-modal="true" aria-label={shown?.headline ?? "Boletín del Reino"} onClick={onClose}>
      <div className="bulletin-popup-body" ref={body} onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        {error && <p className="error">{error}</p>}
        {shown ? <Parchment bulletin={shown} gameName={state.partida.nombre} houses={state.casas} /> : !error && <p className="popup-loading">Fray Abundio busca el pliego…</p>}
        {others.length > 0 && (
          <nav className="bulletin-archive" aria-label="Boletines anteriores">
            <h3>Boletines anteriores</h3>
            <ul>
              {others.map((b) => (
                <li key={bulletinKey(b)}>
                  <button className="link" onClick={() => pick(b)}>
                    <span>{listedName(b)}</span>
                    <small>{b.titular}</small>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
