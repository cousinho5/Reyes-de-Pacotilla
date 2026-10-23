import { Suspense, lazy, useEffect, useState } from "react";
import { Game } from "./pages/Game";
import { Home } from "./pages/Home";

// Bloque 6: las páginas que se usan poco, en su propio trozo de JS.
const Create = lazy(() => import("./pages/Create").then((m) => ({ default: m.Create })));
const Join = lazy(() => import("./pages/Join").then((m) => ({ default: m.Join })));
const Coronation = lazy(() => import("./pages/Coronation").then((m) => ({ default: m.Coronation })));

/** Enrutador mínimo: /, /entrar, /crear, /unirse/:codigo, /partida/:id, /coronacion/:clave */
export function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const on = () => setPath(window.location.pathname);
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return path;
}

export function App() {
  const path = usePath();
  const join = path.match(/^\/unirse\/([^/]+)/);
  const game = path.match(/^\/partida\/(\d+)/);
  const crowned = path.match(/^\/coronacion\/([^/]+)/);
  if (game) return <Game id={Number(game[1])} />;
  const page = crowned ? (
    <Coronation clave={decodeURIComponent(crowned[1]!)} />
  ) : join ? (
    <Join code={decodeURIComponent(join[1]!)} />
  ) : path === "/crear" ? <Create /> : null;
  if (page) return <Suspense fallback={<main className="page">Cargando…</main>}>{page}</Suspense>;
  // Bloque 7: /entrar es la portada con la hoja del código abierta (los enlaces de antes siguen valiendo).
  return <Home key={path} askCode={path === "/entrar"} />;
}
