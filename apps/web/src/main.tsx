import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// Letras recortadas a lo que usa el juego (scripts/recortar-letras.mjs, bloque 6).
import "./fonts/letras.css";
import "./styles.css";
import { registerServiceWorker } from "./push";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
