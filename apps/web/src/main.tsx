import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// Letras recortadas a lo que usa el juego (scripts/recortar-letras.mjs, bloque 6).
import "./fonts/letras.css";
import "./styles.css";
import { registerServiceWorker } from "./push";
import { installTapHints } from "./tapHints";

registerServiceWorker();
installTapHints();
// Bloque 6: solo el mapa hace zoom (useMapZoom.ts). Android lo respeta con el viewport
// de index.html; Safari en iPhone no, así que se le quita aquí la pinza de la página.
document.addEventListener("gesturestart", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
