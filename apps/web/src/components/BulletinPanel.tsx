import { useEffect, useRef, useState } from "react";
import { api, type GameState } from "../api";
import { FrayAbundio } from "../art";
import { HOUSE_COLORS } from "../ui";
import { markBulletinSeen } from "../bulletinSeen";
import { Parchment, type Shown } from "./Parchment";

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
  // La Crónica Definitiva (semana 0), si la hay, va la primera.
  const list = [...(state.boletines ?? [])].sort((a, b) => (a.semana === 0 ? -1 : b.semana === 0 ? 1 : 0));
  const latest = list[0] ? keyOf(list[0]) : null;
  const [chosen, setChosen] = useState<string | null>(latest);
  const [bulletin, setBulletin] = useState<Shown | null>(null);
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
    // La fe de erratas cambia el pie de la Crónica: se vuelve a leer.
  }, [state.partida.id, chosen, state.feDeErratas?.texto]);
  const shown = bulletin && chosen === `${bulletin.week}:${bulletin.edition ?? "domingo"}` ? bulletin : null;
  // Leerlo aquí cuenta como leído: no sale después en la ventana emergente.
  useEffect(() => {
    if (shown && latest && latest === chosen) markBulletinSeen(state.partida.id, latest);
  }, [shown, latest, chosen, state.partida.id]);

  return (
    <>
      {list.length === 0 ? (
        <section className="card">
          <h2>Boletín del Reino</h2>
          <FrayAbundio mood="solemne" anim="moja" size={64} />
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
                  {b.semana === 0 ? "Crónica Definitiva" : b.edicion === "miercoles" ? `Miércoles ${b.semana}` : `Domingo ${b.semana}`}
                </button>
              ))}
            </div>
          )}
          {error && <p className="error">{error}</p>}
          {shown && <Parchment bulletin={shown} gameName={state.partida.nombre} houses={state.casas} />}
        </section>
      )}
      <ErrataCard state={state} act={act} />
      <ProclamationCard state={state} act={act} />
      <BribeCard state={state} act={act} />
    </>
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
  const [caret, setCaret] = useState(0);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setText(p?.texto ?? ""), [p?.texto, p?.semana]);
  if (!p) return null;
  // Como en WhatsApp: al escribir «@» salen las demás casas para nombrarlas.
  const typed = /@([^@\n]{0,30})$/.exec(text.slice(0, caret));
  const plain = (t: string) => t.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const others = state.casas.filter((h) => h.id !== state.yo.casa);
  const options = typed ? others.filter((h) => plain(h.nombre).startsWith(plain(typed[1]!))) : [];
  const mention = (nombre: string) => {
    const start = caret - typed![0].length;
    const next = `${text.slice(0, start)}@${nombre} ${text.slice(caret)}`;
    setText(next);
    const at = start + nombre.length + 2;
    setCaret(at);
    requestAnimationFrame(() => {
      box.current?.focus();
      box.current?.setSelectionRange(at, at);
    });
  };
  const letters = [...text].length;
  const closed = state.partida.ordenesAbiertas === false;
  const changed = text.trim() !== (p.texto ?? "");
  return (
    <section className="card proclamation-card">
      <h2>Tu proclama</h2>
      <p className="muted">
        Una frase de tu casa, firmada, en el boletín del domingo. Fray Abundio la publica tal cual. Puedes cambiarla hasta el cierre.
        Escribe «@» para nombrar a otra casa.
      </p>
      <label>
        Proclama
        <textarea
          ref={box}
          value={text}
          maxLength={p.max * 2}
          rows={3}
          onChange={(e) => (setText(e.target.value), setCaret(e.target.selectionStart))}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
          placeholder="Que tiemblen los de @…"
        />
      </label>
      {options.length > 0 && (
        <ul className="mention-list" role="listbox" aria-label="Nombrar a una casa">
          {options.map((h) => (
            <li key={h.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => mention(h.nombre)}>
                <span className="mention-dot" style={{ background: HOUSE_COLORS[h.color]?.hex ?? "#666" }} aria-hidden="true" />
                {h.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
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

/** Bloque 3: al acabar la partida, quien no ganó puede dejar una línea al pie de la Crónica Definitiva. */
function ErrataCard({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const f = state.feDeErratas;
  const [text, setText] = useState(f?.texto ?? "");
  useEffect(() => setText(f?.texto ?? ""), [f?.texto]);
  if (!f) return null;
  const letters = [...text].length;
  return (
    <section className="card proclamation-card">
      <h2>Fe de erratas</h2>
      <p className="muted">
        La Crónica Definitiva la escribe el ganador, o casi. Deja una línea al pie con tu versión de los hechos (hasta {f.max} letras).
      </p>
      <label>
        Tu versión
        <textarea value={text} maxLength={f.max * 2} rows={3} onChange={(e) => setText(e.target.value)} placeholder="Donde dice «repliegue genial», léase…" />
      </label>
      <p className={letters > f.max ? "error" : "muted"} aria-live="polite">
        {letters} de {f.max} letras
      </p>
      <div className="actions">
        <button
          className="primary"
          disabled={text.trim() === (f.texto ?? "") || letters > f.max || text.trim() === ""}
          onClick={() => act(() => api.errata(state.partida.id, text), "Fray Abundio la añade al pie, con letra pequeña.")}
        >
          {f.texto ? "Cambiar" : "Añadir al pie"}
        </button>
        {f.texto && <button onClick={() => act(() => api.errata(state.partida.id, ""), "Retirada. La Crónica queda como estaba.")}>Retirar</button>}
      </div>
    </section>
  );
}
