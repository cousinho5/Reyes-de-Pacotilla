import { useState } from "react";
import type { GameState } from "../api";
import { ACHIEVEMENT_LABEL, HOUSE_COLORS, describeEvent, withArticle } from "../ui";

export function Realm({ state }: { state: GameState }) {
  const [open, setOpen] = useState<number | null>(null);
  const events = (state.eventos ?? [])
    .map((e) => ({ e, text: describeEvent(e, state.casas, state.casillas ?? []) }))
    .filter((x) => x.text && x.e.tipo !== "movimiento");

  const final = state.partida.final;
  const finalTotal = (id: number) => final?.ranking.find((r) => r.house === id)?.total;
  const houses = final
    ? [...state.casas].sort((a, b) => final.ranking.findIndex((r) => r.house === a.id) - final.ranking.findIndex((r) => r.house === b.id))
    : state.casas;
  const winner = final?.winner != null ? state.casas.find((h) => h.id === final.winner) : null;

  return (
    <div>
      {winner && (
        <section className="card coronation">
          <h2>¡Larga vida a {withArticle(winner.nombre)}!</h2>
          <p>Fin del interregno. Fray Abundio, que siempre creyó en {withArticle(winner.nombre)}, ya ha corregido sus crónicas.</p>
        </section>
      )}
      <section className="card">
        <h2>{final ? "Clasificación final" : "Clasificación de Prestigio"}</h2>
        <ol className="ranking">
          {houses.map((h, i) => (
            <li key={h.id} className={h.id === state.yo.casa ? "me" : ""}>
              <button className="row-button" onClick={() => setOpen(open === h.id ? null : h.id)} aria-expanded={open === h.id}>
                <span className="rank">{i + 1}</span>
                <span className="swatch" style={{ background: HOUSE_COLORS[h.color]?.hex }} />
                <span className="grow">
                  <strong>{h.nombre}</strong>
                  {i === 0 && (h.prestigio?.total ?? 0) > (state.casas[1]?.prestigio?.total ?? 0) && (
                    <small> · favorito del cronista</small>
                  )}
                  {h.lema && (
                    <>
                      <br />
                      <small>«{h.lema}»</small>
                    </>
                  )}
                  {(h.logros ?? []).map((l) => (
                    <span key={l.clave} className="chip achievement">
                      {ACHIEVEMENT_LABEL[l.clave] ?? l.clave}
                      {l.veces > 1 && ` x${l.veces}`}
                    </span>
                  ))}
                </span>
                <strong>{finalTotal(h.id) ?? h.prestigio?.total ?? 0}</strong>
              </button>
              {open === h.id && h.prestigio && (
                <p className="breakdown">
                  Territorio {h.prestigio.territorio} · Edificios {h.prestigio.edificios} · Riqueza {h.prestigio.riqueza} · Comercio{" "}
                  {h.prestigio.comercio} · Logros {h.prestigio.logros}
                  {h.objetivo && (
                    <>
                      <br />
                      Objetivo secreto: {h.objetivo.texto} {h.objetivo.cumplido ? "(cumplido, +6)" : "(sin cumplir)"}
                    </>
                  )}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

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
