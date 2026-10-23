// Bloque 13 (punto 10): la página pública de la coronación, para compartirla.
// Se abre sin cuenta con la clave del enlace; solo existe con la partida
// acabada y no enseña nada privado. Sale la cinemática y, al cerrarla, la
// clasificación con los títulos.

import { Suspense, lazy, useEffect, useState } from "react";
import { api, type GameState, type PublicCoronation } from "../api";
import { navigate } from "../App";
import { ShieldIcon } from "../art";

const Player = lazy(() =>
  Promise.all([import("../components/CinematicPlayer"), import("../cinematics")]).then(([p, c]) => ({
    default: ({ data, onClose }: { data: PublicCoronation; onClose: () => void }) => (
      <p.CinematicPlayer
        cinematic={c.coronationCinematic("coronacion", `La coronación de ${data.partida.nombre}`, {
          // El mapa lee lo mismo que en la partida; aquí nadie mira desde una casa.
          partida: data.partida as GameState["partida"],
          casas: data.casas,
          casillas: data.casillas,
          yo: { casa: -1 },
          coronacion: data.coronacion,
        })}
        onClose={onClose}
      />
    ),
  })),
);

export function Coronation({ clave }: { clave: string }) {
  const [data, setData] = useState<PublicCoronation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    api.publicCoronation(clave).then(setData, (e) => setError((e as Error).message));
  }, [clave]);

  if (error) {
    return (
      <main className="page">
        <h1>La coronación</h1>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Ir a Reyes de Pacotilla</button>
      </main>
    );
  }
  if (!data) return <main className="page">Cargando…</main>;
  const c = data.coronacion;
  const winner = data.casas.find((h) => h.id === c.ganador);
  return (
    <main className="page coronation-page">
      <h1>La coronación de {data.partida.nombre}</h1>
      {winner && <p className="lead">¡Larga vida a {winner.nombre}!</p>}
      <ol className="coronation-list">
        {c.clasificacion.map((r) => {
          const h = data.casas.find((x) => x.id === r.casa);
          const t = c.titulos.find((x) => x.casa === r.casa);
          if (!h) return null;
          return (
            <li key={h.id}>
              <ShieldIcon color={h.color} escudo={h.escudo} size={36} />
              <div>
                <b>{h.nombre}</b> <span className="muted">{r.total} de Prestigio</span>
                {t && (
                  <p>
                    <strong>{t.nombre}</strong>
                    {t.rey && <em> y Futuro Rey, según el cronista</em>}. {t.linea}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="actions">
        <button className="primary" onClick={() => setPlaying(true)}>
          Volver a verla
        </button>
        <button onClick={() => navigate("/")}>Ir a Reyes de Pacotilla</button>
      </div>
      {playing && (
        <Suspense fallback={null}>
          <Player data={data} onClose={() => setPlaying(false)} />
        </Suspense>
      )}
    </main>
  );
}
