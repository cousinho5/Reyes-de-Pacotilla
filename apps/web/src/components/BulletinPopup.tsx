// Bloque 3: al publicarse un boletín, sale una vez en una ventana encima de
// cualquier pestaña, con una cruceta para cerrarla. Si hay dos sin leer, sale
// el último con un enlace al anterior. Queda guardado en Reino.

import { useEffect, useState } from "react";
import { api, type GameState } from "../api";
import { bulletinKey, markBulletinSeen, unreadBulletins } from "../bulletinSeen";
import { Parchment, type Shown } from "./Parchment";

export function BulletinPopup({ state, onClose }: { state: GameState; onClose: () => void }) {
  const unread = unreadBulletins(state);
  const [index, setIndex] = useState(0);
  const [bulletin, setBulletin] = useState<Shown | null>(null);
  // La repetición de la noche va antes: la ventana espera a que acabe.
  const [replaying, setReplaying] = useState(() => !!document.querySelector(".replay"));
  useEffect(() => {
    const t = setInterval(() => setReplaying(!!document.querySelector(".replay")), 800);
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
