import { useEffect, useRef, useState } from "react";
import { api, type GameState } from "../api";
import { FrayAbundio } from "../art";
import { HOUSE_COLORS } from "../ui";
import { BulletinReader } from "./BulletinPopup";
import { Sheet, type SheetState } from "./Sheet";

type Sheetful = "soborno" | "proclama" | null;

/**
 * Bloque 11: el boletín en Reino es una tarjeta de pergamino con Fray Abundio,
 * el titular del último, «Leer el boletín» (la ventana con los anteriores),
 * «Sobornar» y «Tu proclama», estas dos en una hoja que sube desde abajo.
 */
export function BulletinPanel({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  // La Crónica Definitiva (semana 0), si la hay, va la primera.
  const latest = [...(state.boletines ?? [])].sort((a, b) => (a.semana === 0 ? -1 : b.semana === 0 ? 1 : 0))[0];
  const [reading, setReading] = useState(false);
  const [open, setOpen] = useState<Sheetful>(null);
  const [sheet, setSheet] = useState<SheetState>("half");
  const s = state.soborno;
  const p = state.proclama;
  const edition = !latest
    ? null
    : latest.semana === 0
      ? "La Crónica Definitiva"
      : latest.edicion === "miercoles"
        ? `Hoja volandera · miércoles ${latest.semana}`
        : `Boletín del Reino · domingo ${latest.semana}`;
  const show = (what: Sheetful) => (setOpen(what), setSheet("half"));

  return (
    <>
      <section className="card bulletin-card">
        <div className="bulletin-card-head">
          <FrayAbundio mood={latest ? "solemne" : "dormido"} size={64} anim={latest ? "habla" : "cabecea"} />
          <div>
            <small className="muted">{edition ?? "Boletín del Reino"}</small>
            <p className="bulletin-card-headline">
              {latest ? latest.titular : "Fray Abundio publica la hoja volandera del miércoles y el boletín del domingo. Ya afila la pluma."}
            </p>
          </div>
        </div>
        <div className="bulletin-card-actions">
          {latest && (
            <button className="primary" onClick={() => setReading(true)}>
              Leer el boletín
            </button>
          )}
          {s &&
            (s.pagado != null ? (
              <button onClick={() => show("soborno")}>Patrocinador ✓</button>
            ) : (
              <button onClick={() => show("soborno")}>Sobornar · {s.coste} Oro</button>
            ))}
          {p && <button onClick={() => show("proclama")}>{p.texto ? "Tu proclama ✓" : "Tu proclama"}</button>}
        </div>
      </section>
      {reading && <BulletinReader state={state} onClose={() => setReading(false)} />}
      {open && (
        <div className="sheet-layer">
          <Sheet state={sheet} setState={setSheet} onClose={() => setOpen(null)} label={open === "soborno" ? "Sobornar al cronista" : "Tu proclama"}>
            {open === "soborno" ? <BribeCard state={state} act={act} /> : <ProclamationCard state={state} act={act} />}
          </Sheet>
        </div>
      )}
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
export function ErrataCard({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
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
