import { useEffect, useState } from "react";
import { bulletinText, type Bulletin } from "@reyes/engine";
import { api, type GameState } from "../api";
import { FrayAbundio } from "../art";

type Edition = "domingo" | "miercoles";
const keyOf = (b: { semana: number; edicion?: Edition }) => `${b.semana}:${b.edicion ?? "domingo"}`;

/** Boletines de Fray Abundio (domingo y hoja volandera del miércoles), en pergamino; la proclama y el soborno al cronista. */
export function BulletinPanel({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const list = state.boletines ?? [];
  const latest = list[0] ? keyOf(list[0]) : null;
  const [chosen, setChosen] = useState<string | null>(latest);
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Al publicarse un boletín nuevo, se muestra ese.
  useEffect(() => setChosen(latest), [latest]);
  useEffect(() => {
    if (chosen == null) return;
    const [week, edition] = chosen.split(":") as [string, Edition];
    let alive = true;
    api
      .bulletin(state.partida.id, Number(week), edition)
      .then((b) => alive && (setBulletin(b), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [state.partida.id, chosen]);
  const shown = bulletin && chosen === `${bulletin.week}:${bulletin.edition ?? "domingo"}` ? bulletin : null;

  return (
    <>
      {list.length === 0 ? (
        <section className="card">
          <h2>Boletín del Reino</h2>
          <p className="muted">
            Fray Abundio publica dos por semana: la hoja volandera del miércoles y el boletín del domingo, tras la resolución. Ya afila la
            pluma.
          </p>
        </section>
      ) : (
        <section className="bulletin-wrap">
          {list.length > 1 && (
            <div className="bulletin-weeks" role="tablist" aria-label="Boletines">
              {list.map((b) => (
                <button
                  key={keyOf(b)}
                  role="tab"
                  aria-selected={keyOf(b) === chosen}
                  className={keyOf(b) === chosen ? "chosen" : ""}
                  onClick={() => setChosen(keyOf(b))}
                  title={b.titular}
                >
                  {b.edicion === "miercoles" ? `Miércoles ${b.semana}` : `Domingo ${b.semana}`}
                </button>
              ))}
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {shown && <Parchment bulletin={shown} gameName={state.partida.nombre} />}
        </section>
      )}
      <ProclamationCard state={state} act={act} />
      <BribeCard state={state} act={act} />
    </>
  );
}

function Parchment({ bulletin: b, gameName }: { bulletin: Bulletin; gameName: string }) {
  const share = `https://wa.me/?text=${encodeURIComponent(bulletinText(b, gameName))}`;
  return (
    <article className="parchment">
      <header>
        <FrayAbundio mood={b.mood ?? "solemne"} size={64} />
        <div>
          <p className="parchment-kicker">
            {b.edition === "miercoles" ? "Hoja volandera" : "Boletín del Reino"} · {gameName} · semana {b.week}
          </p>
          <h2>{b.headline}</h2>
        </div>
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
            // Las proclamas, entre comillas, como citas; la entradilla y la nota del cronista, como el resto.
            <p key={i} className={s.verbatim && l.startsWith("«") ? "proclama" : undefined}>
              {l}
            </p>
          ))}
        </section>
      ))}
      {b.sponsors.length > 0 && (
        <footer className="sponsors">
          <FrayAbundio mood="monedas" size={40} />
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

/** Bloque 3: una frase propia por semana, firmada en el boletín del domingo. Se cambia hasta el cierre. */
function ProclamationCard({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const p = state.proclama;
  const [text, setText] = useState(p?.texto ?? "");
  useEffect(() => setText(p?.texto ?? ""), [p?.texto, p?.semana]);
  if (!p) return null;
  const letters = [...text].length;
  const closed = state.partida.ordenesAbiertas === false;
  const changed = text.trim() !== (p.texto ?? "");
  return (
    <section className="card proclamation-card">
      <h2>Tu proclama</h2>
      <p className="muted">
        Una frase de tu casa, firmada, en el boletín del domingo. Fray Abundio la publica tal cual. Puedes cambiarla hasta el cierre.
      </p>
      <label>
        Proclama
        <textarea value={text} maxLength={p.max * 2} rows={3} onChange={(e) => setText(e.target.value)} placeholder="Que tiemblen los Pocapena…" />
      </label>
      <p className={letters > p.max ? "error" : "muted"} aria-live="polite">
        {letters} de {p.max} letras
      </p>
      <div className="actions">
        <button
          className="primary"
          disabled={closed || !changed || letters > p.max || text.trim() === ""}
          onClick={() => act(() => api.proclaim(state.partida.id, text), "El cronista la guarda para el domingo.")}
        >
          {p.texto ? "Cambiar" : "Proclamar"}
        </button>
        {p.texto && (
          <button disabled={closed} onClick={() => act(() => api.proclaim(state.partida.id, ""), "Proclama retirada. El cronista finge no haberla leído.")}>
            Retirar
          </button>
        )}
      </div>
    </section>
  );
}
