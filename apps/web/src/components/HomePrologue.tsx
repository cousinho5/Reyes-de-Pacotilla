// Bloque 7: el prólogo en la portada, para quien aún no juega. Es el del bloque 13
// con las siete casas inventadas de la partida de muestra.

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { samplePrologue } from "../cinematics";
import { sampleGame } from "../sampleGame";
import { CinematicPlayer } from "./CinematicPlayer";

export default function HomePrologue({ onClose }: { onClose: () => void }) {
  const cinematic = useMemo(() => samplePrologue(sampleGame()), []);
  // Fuera de la página: la portada anima sus piezas al entrar y eso encerraría el reproductor.
  return createPortal(<CinematicPlayer cinematic={cinematic} onClose={onClose} doneLabel="Volver" />, document.body);
}
