// Bloque 13: las cinemáticas que salen solas al entrar, una tras otra. Las que
// se pasan por alto (había demasiadas) se apuntan como no vistas para que no
// vuelvan a salir y la lista de Reino las marque como nuevas.

import { useEffect, useState } from "react";
import { api, type CinematicItem, type GameState } from "../api";
import { buildCinematic } from "../cinematics";
import { markSeenHere } from "../cinematicQueue";
import { CinematicPlayer } from "./CinematicPlayer";

export function CinematicQueue({
  state,
  play: given,
  skip,
  onDone,
}: {
  state: GameState;
  play: CinematicItem[];
  skip: CinematicItem[];
  onDone: () => void;
}) {
  const game = state.partida.id;
  const [index, setIndex] = useState(0);
  // La cola se fija al empezar: las recargas de cada minuto no la cambian a medias.
  const [play] = useState(given);

  useEffect(() => {
    if (skip.length === 0) return;
    markSeenHere(game, skip.map((i) => i.clave));
    skip.forEach((i) => api.seeCinematic(game, i.clave, false).catch(() => {}));
    if (play.length === 0) onDone();
    // Una vez por cola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = play[index];
  const cinematic = item ? buildCinematic(item, state) : null;
  const close = () => {
    if (item) {
      markSeenHere(game, [item.clave]);
      api.seeCinematic(game, item.clave).catch(() => {});
    }
    if (index + 1 >= play.length) onDone();
    else setIndex(index + 1);
  };
  if (!cinematic) return null;
  return <CinematicPlayer key={item!.clave} cinematic={cinematic} onClose={close} />;
}
