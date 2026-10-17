import { useEffect, useState } from "react";
import { bulletinText, type Bulletin } from "@reyes/engine";
import { api, type GameState } from "../api";

/** Boletín semanal de Fray Abundio, en pergamino, y el soborno al cronista. */
export function BulletinPanel({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const list = state.boletines ?? [];
  const [week, setWeek] = useState<number | null>(list[0]?.semana ?? null);
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = list[0]?.semana ?? null;

  // Al publicarse un boletín nuevo, se muestra ese.
  useEffect(() => setWeek(latest), [latest]);
  useEffect(() => {
    if (week == null) return;
    let alive = true;
    api
      .bulletin(state.partida.id, week)
      .then((b) => alive && (setBulletin(b), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [state.partida.id, week]);

  return (
    <>
      {list.length === 0 ? (
        <section className="card">
          <h2>Boletín del Reino</h2>
          <p className="muted">El primer boletín sale el domingo, tras la resolución. Fray Abundio ya afila la pluma.</p>
        </section>
      ) : (
        <section className="bulletin-wrap">
          {list.length > 1 && (
            <div className="bulletin-weeks" role="tablist" aria-label="Boletines">
              {list.map((b) => (
                <button key={b.semana} role="tab" aria-selected={b.semana === week} className={b.semana === week ? "chosen" : ""} onClick={() => setWeek(b.semana)}>
                  Semana {b.semana}
                </button>
              ))}
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {bulletin && bulletin.week === week && <Parchment bulletin={bulletin} gameName={state.partida.nombre} />}
        </section>
      )}
      <BribeCard state={state} act={act} />
    </>
  );
}

function Parchment({ bulletin: b, gameName }: { bulletin: Bulletin; gameName: string }) {
  const share = `https://wa.me/?text=${encodeURIComponent(bulletinText(b, gameName))}`;
  return (
    <article className="parchment">
      <header>
        <p className="parchment-kicker">Boletín del Reino · {gameName} · semana {b.week}</p>
        <h2>{b.headline}</h2>
      </header>
      {b.margin.length > 0 && (
        <aside className="margin-notes" aria-label="Notas al margen">
          {b.margin.map((m, i) => (
            <p key={i}>✎ {m}</p>
          ))}
        </aside>
      )}
      {b.sections.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </section>
      ))}
      {b.sponsors.length > 0 && (
        <footer className="sponsors">
          {b.sponsors.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </footer>
      )}
      <p className="signature">Fray Abundio de la Pluma Larga, Cronista Mayor del Reino</p>
      <a className="button share" href={share} target="_blank" rel="noreferrer">
        Compartir en WhatsApp
      </a>
    </article>
  );
}

function BribeCard({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const s = state.soborno;
  const [choice, setChoice] = useState(0);
  if (!s) return null;
  const oro = state.yo.recursos?.oro ?? 0;
  return (
    <section className="card">
      <h2>Sobornar al cronista</h2>
      {s.pagado != null ? (
        <p>
          Pagado. El domingo saldrá: <em>«{s.frases[s.pagado]}»</em>
        </p>
      ) : (
        <>
          <p className="muted">
            Por {s.coste} de Oro, Fray Abundio incluye una frase halagadora sobre tu casa en el boletín del domingo y te nombra
            patrocinador. No da Prestigio. Una vez por semana.
          </p>
          <label>
            Frase
            <select value={choice} onChange={(e) => setChoice(Number(e.target.value))}>
              {s.frases.map((f, i) => (
                <option key={i} value={i}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={oro < s.coste || state.partida.ordenesAbiertas === false}
            onClick={() => act(() => api.bribe(state.partida.id, choice), "El cronista guarda el Oro con una discreción sospechosa.")}
          >
            Pagar {s.coste} de Oro
          </button>
        </>
      )}
    </section>
  );
}
