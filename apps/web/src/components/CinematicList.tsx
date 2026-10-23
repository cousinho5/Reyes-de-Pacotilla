// Bloque 13: volver a ver las cinemáticas de la partida, en Reino, debajo de la
// crónica. Las que aún no se han visto llevan «Nueva».

import { Suspense, lazy, useState } from "react";
import { api, type CinematicItem, type GameState } from "../api";
import { canPlay, cinematicTitle, markSeenHere, seenHere } from "../cinematicQueue";
import { AmbitionSheet, ambitionPending } from "./AmbitionSheet";

type Act = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;

// El reproductor y los dibujos se bajan al tocar una (también desde la mesa de pruebas).
export const Player = lazy(() =>
  Promise.all([import("./CinematicPlayer"), import("../cinematics")]).then(([p, c]) => ({
    default: ({ item, state, act, onClose }: { item: CinematicItem; state: GameState; act: Act; onClose: () => void }) => {
      const cinematic = c.buildCinematic(item, state);
      const [ambition] = useState(() => item.tipo === "prologo" && ambitionPending(state));
      const epilogue = ambition ? (end: () => void) => <AmbitionSheet state={state} act={act} onLater={end} onEnter={end} /> : undefined;
      return cinematic ? <p.CinematicPlayer cinematic={cinematic} onClose={onClose} epilogue={epilogue} /> : null;
    },
  })),
);

export function CinematicList({ state, act }: { state: GameState; act: Act }) {
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
          <Player item={open} state={state} act={act} onClose={close} />
        </Suspense>
      )}
    </section>
  );
}
