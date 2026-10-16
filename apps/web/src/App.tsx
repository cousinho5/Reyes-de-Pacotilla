import { useEffect, useState } from "react";
import { Create } from "./pages/Create";
import { Game } from "./pages/Game";
import { Home } from "./pages/Home";
import { Join } from "./pages/Join";
import { Login } from "./pages/Login";

/** Enrutador mínimo: /, /entrar, /crear, /unirse/:codigo, /partida/:id */
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
  if (join) return <Join code={decodeURIComponent(join[1]!)} />;
  if (game) return <Game id={Number(game[1])} />;
  if (path === "/entrar") return <Login />;
  if (path === "/crear") return <Create />;
  return <Home />;
}
