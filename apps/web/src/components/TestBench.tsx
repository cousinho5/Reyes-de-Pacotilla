import { Suspense, useState } from "react";
import { EVENTS, EVENT_LINES, PHRASES } from "@reyes/engine";
import { api, type CinematicItem, type GameState } from "../api";
import { navigate } from "../App";
import { ShieldIcon } from "../art";
import { formatShort } from "../ui";
import { Player } from "./CinematicList";

type Act = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;

/** Bloque 13: ver cualquier cinemática sin esperar a su semana (no cuenta como vista). */
function CinematicBench({ state, act }: { state: GameState; act: Act }) {
  const items: CinematicItem[] = [
    { clave: "prologo", tipo: "prologo", semana: 1, orden: 10, vista: true, sola: false },
    ...(Object.keys(EVENTS) as (keyof typeof EVENTS)[]).map((k, i) => ({
      clave: `evento:${i + 1}`,
      tipo: "evento" as const,
      semana: 1,
      orden: 12,
      vista: true,
      sola: false,
      datos: { clave: k, nombre: EVENTS[k].nombre, texto: EVENTS[k].texto.replace("{recurso}", "Pan"), linea: EVENT_LINES[k][0]!.replace(/\{[^}]+\}/g, state.casas[0]?.nombre ?? "") },
    })),
    { clave: "ultima", tipo: "ultima", semana: state.partida.semanas, orden: 60, vista: true, sola: false },
    { clave: "fantasma:1", tipo: "fantasma", semana: 1, orden: 16, vista: true, sola: false, datos: { como: "fantasma", linea: PHRASES["rey.fantasma"][1] } },
    { clave: "fantasma:2", tipo: "fantasma", semana: 2, orden: 26, vista: true, sola: false, datos: { como: "muerte", linea: PHRASES["rey.muerte"][1] } },
  ];
  const name = (it: CinematicItem) =>
    it.tipo === "prologo"
      ? "Prólogo"
      : it.tipo === "evento"
        ? `Evento: ${String(it.datos!.nombre)}`
        : it.tipo === "ultima"
          ? "La última semana"
          : it.datos?.como === "muerte"
            ? "Aniversario de la muerte del rey"
            : "El fantasma de Aldric";
  const [pick, setPick] = useState(0);
  const [open, setOpen] = useState<CinematicItem | null>(null);
  return (
    <div className="actions">
      <label>
        Cinemática
        <select value={pick} onChange={(e) => setPick(Number(e.target.value))}>
          {items.map((it, i) => (
            <option key={it.clave} value={i}>
              {name(it)}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => setOpen(items[pick]!)}>Ver</button>
      {open && (
        <Suspense fallback={null}>
          <Player item={open} state={state} act={act} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </div>
  );
}

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
      <details>
        <summary>
          <strong>Prueba</strong> · ahora es <span className="when">{formatShort(t.ahora)}</span> · más opciones
        </summary>
        <div className="testbench-houses">
          {(t.casas ?? []).map((h) => (
            <button
              key={h.id}
              className={h.id === t.jugandoComo ? "chosen" : ""}
              aria-pressed={h.id === t.jugandoComo}
              disabled={busy}
              onClick={() => run(() => api.testPlayAs(gameId, h.id), `Ahora juegas como ${h.nombre}.`)}
            >
              <ShieldIcon color={h.color} escudo={h.escudo} size={18} title="" />
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
        <CinematicBench state={state} act={act} />
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
    </section>
  );
}
