// Bloque 13: volver a ver las cinemáticas de la partida, en Reino, debajo de la
// crónica. Las que aún no se han visto llevan «Nueva».

import { Suspense, lazy, useState } from "react";
import { api, type CinematicItem, type GameState } from "../api";
import { canPlay, cinematicTitle, markSeenHere, seenHere } from "../cinematicQueue";

// El reproductor y los dibujos se bajan al tocar una.
const Player = lazy(() =>
  Promise.all([import("./CinematicPlayer"), import("../cinematics")]).then(([p, c]) => ({
    default: ({ item, state, onClose }: { item: CinematicItem; state: GameState; onClose: () => void }) => {
      const cinematic = c.buildCinematic(item, state);
      return cinematic ? <p.CinematicPlayer cinematic={cinematic} onClose={onClose} /> : null;
    },
  })),
);

export function CinematicList({ state }: { state: GameState }) {
  const [open, setOpen] = useState<CinematicItem | null>(null);
  // Las vistas aquí mismo, hasta que llegue la recarga del servidor.
  const [watched, setWatched] = useState<Set<string>>(() => new Set());
  const items = (state.cinematicas ?? []).filter(canPlay);
  if (items.length === 0) return null;
  const here = seenHere(state.partida.id);
  const close = () => {
    if (open) {
      markSeenHere(state.partida.id, [open.clave]);
      api.seeCinematic(state.partida.id, open.clave).catch(() => {});
    }
    setOpen(null);
    if (open) setWatched(new Set([...watched, open.clave]));
  };
  return (
    <section className="card cine-list">
      <h2>Cinemáticas</h2>
      <ul>
        {[...items].reverse().map((i) => {
          const fresh = !watched.has(i.clave) && ((!i.vista && !here.has(i.clave)) || !!i.sinVer);
          return (
            <li key={i.clave}>
              <button onClick={() => setOpen(i)}>
                <span aria-hidden="true" className="cine-play" />
                <span className="cine-name">{cinematicTitle(i)}</span>
                {fresh && <span className="badge">Nueva</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <Suspense fallback={null}>
          <Player item={open} state={state} onClose={close} />
        </Suspense>
      )}
    </section>
  );
}
