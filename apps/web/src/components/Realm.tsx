import { useState } from "react";
import { BulletinPanel } from "./BulletinPanel";
import type { GameState } from "../api";
import { ShieldIcon } from "../art";
import { describeEvent, withArticle } from "../ui";
import { PrestigeChart } from "./PrestigeChart";
import { Standings } from "./Standings";

/** Pestaña Reino (bloque 11): clasificación, gráfica, boletín, crónica y diplomacia, en ese orden. */
export function Realm({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const events = (state.eventos ?? [])
    .map((e) => ({ e, text: describeEvent(e, state.casas, state.casillas ?? []) }))
    .filter((x) => x.text && x.e.tipo !== "movimiento");

  const final = state.partida.final;
  const winner = final?.winner != null ? state.casas.find((h) => h.id === final.winner) : null;
  const chosen = open != null ? state.casas.find((h) => h.id === open) : null;

  return (
    <div>
      {winner && (
        <section className="card coronation">
          <ShieldIcon color={winner.color} escudo={winner.escudo} size={72} />
          <h2>¡Larga vida a {withArticle(winner.nombre)}!</h2>
          <p>Fin del interregno. Fray Abundio, que siempre creyó en {withArticle(winner.nombre)}, ya ha corregido sus crónicas.</p>
        </section>
      )}
      <Standings state={state} onPick={(id) => setOpen(open === id ? null : id)}>
        {chosen?.prestigio && (
          <p className="breakdown">
            <strong>{chosen.nombre}:</strong> Territorio {chosen.prestigio.territorio} · Edificios {chosen.prestigio.edificios} · Riqueza{" "}
            {chosen.prestigio.riqueza} · Comercio {chosen.prestigio.comercio} · Logros {chosen.prestigio.logros}
            {(chosen.prestigio.asedios ?? 0) > 0 && ` · Asedios ${chosen.prestigio.asedios}`}
            {(chosen.prestigio.gloria ?? 0) > 0 && ` · Gloria ${chosen.prestigio.gloria}`}
            {chosen.objetivo && (
              <>
                <br />
                Objetivo secreto: {chosen.objetivo.texto} {chosen.objetivo.cumplido ? "(cumplido, +6)" : "(sin cumplir)"}
              </>
            )}
          </p>
        )}
      </Standings>
      <PrestigeChart state={state} />
      <BulletinPanel state={state} act={act} />

      <section className="card chronicle">
        <h2>Crónica del reino</h2>
        {events.length === 0 ? (
          <p className="muted">Aún no ha pasado nada digno de mención. Fray Abundio bosteza.</p>
        ) : (
          <ul className="list">
            {events.map(({ e, text }) => (
              <li key={e.id}>
                {e.resolucion != null && <small className="muted">Resolución {e.resolucion} · </small>}
                {text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
