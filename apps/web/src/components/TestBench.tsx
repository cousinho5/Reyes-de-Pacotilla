import { useState } from "react";
import { api, type GameState } from "../api";
import { navigate } from "../App";
import { HOUSE_COLORS, formatWhen } from "../ui";

/**
 * Mesa de pruebas: solo aparece en las partidas de prueba, para quien las creó.
 * El reloj de la partida es simulado y solo avanza con estos botones.
 */
export function TestBench({
  state,
  gameId,
  act,
}: {
  state: GameState;
  gameId: number;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const t = state.prueba!;
  const p = state.partida;
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const active = p.estado === "active";

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await act(fn, ok);
    } finally {
      setBusy(false);
    }
  };

  const toEnd = async () => {
    for (let i = 0; i < 40; i++) {
      const r = await api.testAdvance(gameId, "resolucion");
      if (r.estado !== "active") break;
    }
  };

  return (
    <section className="testbench" aria-label="Mesa de pruebas">
      <div className="testbench-head">
        <strong>Prueba</strong>
        <span>{formatWhen(t.ahora)}</span>
      </div>
      {active && (
        <div className="testbench-buttons">
          <button disabled={busy} onClick={() => run(() => api.testAdvance(gameId, "paso"))}>
            Siguiente paso
          </button>
          <button disabled={busy} onClick={() => run(() => api.testAdvance(gameId, "resolucion"), "Resolución hecha. Mira la crónica en Reino.")}>
            Resolver
          </button>
          <button disabled={busy} onClick={() => run(toEnd, "Fin de la prueba. Clasificación final en Reino.")}>
            Hasta el final
          </button>
        </div>
      )}
      <details>
        <summary>Jugar como otra casa · borrar</summary>
        <div className="testbench-houses">
          {(t.casas ?? []).map((h) => (
            <button
              key={h.id}
              className={h.id === t.jugandoComo ? "chosen" : ""}
              aria-pressed={h.id === t.jugandoComo}
              disabled={busy}
              onClick={() => run(() => api.testPlayAs(gameId, h.id), `Ahora juegas como ${h.nombre}.`)}
            >
              <span className="swatch" style={{ background: HOUSE_COLORS[h.color]?.hex }} />
              {h.nombre}
              {h.bot && <small> ({h.personalidad ?? "bot"})</small>}
            </button>
          ))}
        </div>
        <p className="hint">
          «Siguiente paso» lleva a la mañana siguiente (producción) o a la resolución de las 22:00; «Resolver»
          avanza hasta pasar la próxima resolución. Cada bot tiene personalidad (entre paréntesis): construye,
          recluta, ataca con apoyos, defiende, publica ofertas y acepta las tuyas si le salen a cuenta.
        </p>
        {confirmDelete ? (
          <div className="actions">
            <button
              className="danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.deleteGame(gameId);
                  navigate("/");
                })
              }
            >
              Sí, borrarla
            </button>
            <button onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="link" onClick={() => setConfirmDelete(true)}>
            Borrar esta prueba
          </button>
        )}
      </details>
    </section>
  );
}
