import { ResourceIcon, ShieldIcon } from "../art";
import { AuctionPanel } from "./AuctionPanel";
import { CrownPanel } from "./CrownPanel";
import { DiplomacyPanel } from "./DiplomacyPanel";
import { useState } from "react";
import { RESOURCES, TRADE, fairAmount, referenceValue, totalOf, type Resource, type Resources } from "@reyes/engine";
import { api, type GameState, type OfferInfo } from "../api";
import { HOUSE_COLORS, RESOURCE_LABEL, houseName } from "../ui";

interface Props {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

function Bundle({ r }: { r: Partial<Resources> }) {
  const items = RESOURCES.filter((k) => (r[k] ?? 0) > 0);
  if (items.length === 0) return <span className="muted">nada</span>;
  return (
    <>
      {items.map((k) => (
        <span key={k} className={`res res-${k}`}>
          <ResourceIcon r={k} size={14} /> {r[k]} <span className="sr-only">{RESOURCE_LABEL[k]}</span>
        </span>
      ))}
    </>
  );
}

/** Valor en Oro de un lado con el precio de referencia (bloque 10): sin etiquetas. */
function Worth({ r, prices }: { r: Partial<Resources>; prices?: Partial<Resources> }) {
  if (!prices) return null;
  return (
    <small className="offer-worth" title="Lo que vale en Oro con los precios de la Corona, sin su recargo">
      ≈ {referenceValue(r, prices)} de Oro
    </small>
  );
}

/** Lo que te falta para aceptar una oferta: «5 de Hierro y 2 de Oro», o null si llega. */
export function missingFor(have: Resources | undefined, want: Resources): string | null {
  if (!have) return null;
  const short = RESOURCES.filter((r) => want[r] > have[r]);
  return short.length === 0 ? null : short.map((r) => `${want[r] - have[r]} de ${RESOURCE_LABEL[r]}`).join(" y ");
}

/** Cuenta atrás de una oferta abierta (bloque 10). */
function expiryText(o: OfferInfo, current: number): string | null {
  if (o.estado !== "open" || o.caducaTras == null) return null;
  const left = o.caducaTras - current;
  return left <= 1 ? "Se retira esta noche" : `Se retira en ${left} noches`;
}

/** Las ofertas de las que sale esta, de la primera a la última (bloque 10: hilo del trato). */
function threadOf(offers: OfferInfo[], o: OfferInfo): OfferInfo[] {
  const byId = new Map(offers.map((x) => [x.id, x]));
  const chain: OfferInfo[] = [];
  for (let p = o.contraofertaDe != null ? byId.get(o.contraofertaDe) : undefined; p && !chain.includes(p); ) {
    chain.unshift(p);
    p = p.contraofertaDe != null ? byId.get(p.contraofertaDe) : undefined;
  }
  return chain;
}

function OfferCard({
  state,
  o,
  nested,
  replies,
  children,
}: {
  state: GameState;
  o: OfferInfo;
  /** Va debajo de su oferta madre: no repite el hilo. */
  nested?: boolean;
  /** Contraofertas que cuelgan de esta oferta. */
  replies?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const me = state.yo.casa;
  const house = state.casas.find((h) => h.id === o.de);
  const expiry = expiryText(o, state.partida.resolucionActual);
  const thread = nested ? [] : threadOf(state.ofertas ?? [], o);
  return (
    <li className={nested ? "offer offer-reply" : "offer"}>
      {thread.length > 0 && (
        <ol className="offer-thread" aria-label="Antes en este trato">
          {thread.map((t) => (
            <li key={t.id}>
              <strong>{t.de === me ? "Tú" : houseName(state.casas, t.de)}:</strong> <Bundle r={t.da} /> por <Bundle r={t.pide} />
              {t.frase && (
                <>
                  {" "}
                  <q className="offer-note-text">{t.frase}</q>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="offer-who">
        <ShieldIcon color={house?.color ?? ""} escudo={house?.escudo} size={26} />
        <span>
          <strong>{o.de === me ? "Tú" : houseName(state.casas, o.de)}</strong>
          {o.para != null && o.de === me && <> a {houseName(state.casas, o.para)}</>}
          {o.contraofertaDe != null && <small className="muted"> · contraoferta</small>}
        </span>
        {expiry && <small className="offer-expiry">{expiry}</small>}
      </div>
      {o.frase && <q className="offer-note-text">{o.frase}</q>}
      <div className="offer-terms">
        <span>
          <em>{o.de === me ? "Das" : "Te da"}</em> <Bundle r={o.da} />
          <Worth r={o.da} prices={state.corona?.precios} />
        </span>
        <span>
          <em>{o.de === me ? "Pides" : "A cambio de"}</em> <Bundle r={o.pide} />
          <Worth r={o.pide} prices={state.corona?.precios} />
        </span>
      </div>
      {state.partida.estado === "active" && children && <div className="actions">{children}</div>}
      {replies}
    </li>
  );
}

const STATUS: Record<OfferInfo["estado"], string> = {
  open: "abierta",
  accepted: "aceptada",
  rejected: "rechazada",
  countered: "contraofertada",
  cancelled: "retirada",
};

/**
 * Pestaña Comercio (bloque 10). Arriba lo que pide respuesta: Para ti, Mercado y
 * tus ofertas (las propuestas de alianza que te hacen, en Para ti). Después la
 * subasta (en una línea si está cerrada) y la Corona; al final, plegados, lo
 * reciente, las alianzas y los tratos del reino.
 */
export function TradePanel({ state, act }: Props) {
  const me = state.yo.casa;
  const gameId = state.partida.id;
  const offers = state.ofertas ?? [];
  const open = offers.filter((o) => o.estado === "open");
  // Las contraofertas a tus ofertas públicas van debajo de ellas, en Tus ofertas.
  const repliesTo = (o: OfferInfo) => open.filter((x) => x.contraofertaDe === o.id && x.para === me);
  const forMe = open.filter((o) => o.para === me && !open.some((p) => p.id === o.contraofertaDe && p.de === me && p.para == null));
  const market = open.filter((o) => o.para === null && o.de !== me);
  const mine = open.filter((o) => o.de === me);
  const closed = offers.filter((o) => o.estado !== "open");
  const proposals = state.alianzas?.activas ? state.alianzas.propuestas.filter((p) => p.para === me).length : 0;
  const [draft, setDraft] = useState<Draft | null>(null);
  const active = state.partida.estado === "active";

  const startCounter = (o: OfferInfo) => setDraft({ para: o.de, da: toLines(o.pide), pide: toLines(o.da), frase: "", contra: o });
  const answer = (o: OfferInfo) => (
    <>
      {acceptButton(o)}
      <button onClick={() => startCounter(o)}>Contraofertar</button>
      <button className="link" onClick={() => act(() => api.rejectOffer(gameId, o.id), "Oferta rechazada.")}>
        Rechazar
      </button>
    </>
  );
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const shown = onlyAffordable ? market.filter((o) => missingFor(state.yo.recursos, o.pide) == null) : market;
  // Aceptar en gris si te falta algo, con lo que falta debajo (bloque 10).
  const acceptButton = (o: OfferInfo) => {
    const missing = missingFor(state.yo.recursos, o.pide);
    return (
      <>
        <button className="primary" disabled={missing != null} onClick={() => act(() => api.acceptOffer(gameId, o.id), "Trato cerrado. Ambas partes creen haber ganado.")}>
          Aceptar
        </button>
        {missing && <small className="offer-missing">Te faltan {missing}.</small>}
      </>
    );
  };

  return (
    <div className="trade">
      {draft ? (
        <OfferForm
          state={state}
          draft={draft}
          setDraft={setDraft}
          onSubmit={() =>
            act(async () => {
              await api.createOffer(gameId, {
                para: draft.para,
                da: toBundle(draft.da),
                pide: toBundle(draft.pide),
                contraofertaDe: draft.contra?.id,
                frase: draft.frase.trim() || undefined,
              });
              setDraft(null);
            }, draft.para == null ? "Oferta publicada en el mercado." : "Oferta enviada.")
          }
        />
      ) : (
        active && (
          <button className="primary wide" onClick={() => setDraft(newDraft(state.yo.recursos!))}>
            Nueva oferta
          </button>
        )
      )}

      <section className="card">
        <h2>Para ti ({forMe.length + proposals})</h2>
        {forMe.length + proposals === 0 ? (
          <p className="muted">Nadie te ha hecho una oferta directa. De momento.</p>
        ) : (
          <ul className="list">
            <DiplomacyPanel state={state} act={act} part="propuestas" />
            {forMe.map((o) => (
              <OfferCard key={o.id} state={state} o={o}>
                {answer(o)}
              </OfferCard>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Mercado ({market.length})</h2>
        {market.length > 0 && (
          <label className="check">
            <input type="checkbox" checked={onlyAffordable} onChange={(e) => setOnlyAffordable(e.target.checked)} />
            Solo las que puedo aceptar
          </label>
        )}
        {market.length === 0 ? (
          <p className="muted">No hay ofertas. El mercado está más vacío que el tesoro real.</p>
        ) : shown.length === 0 ? (
          <p className="muted">Ninguna está a tu alcance. Habrá que vender algo primero.</p>
        ) : (
          <ul className="list">
            {shown.map((o) => (
              <OfferCard key={o.id} state={state} o={o}>
                {acceptButton(o)}
                <button onClick={() => startCounter(o)}>Contraofertar</button>
              </OfferCard>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Tus ofertas ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="muted">No tienes ofertas abiertas. Puedes tener hasta 3 públicas.</p>
        ) : (
          <ul className="list">
            {mine.map((o) => (
              <OfferCard
                key={o.id}
                state={state}
                o={o}
                replies={
                  repliesTo(o).length > 0 && (
                    <ul className="list offer-replies">
                      {repliesTo(o).map((r) => (
                        <OfferCard key={r.id} state={state} o={r} nested>
                          {answer(r)}
                        </OfferCard>
                      ))}
                    </ul>
                  )
                }
              >
                <button className="link" onClick={() => act(() => api.cancelOffer(gameId, o.id), "Oferta retirada.")}>
                  Retirar
                </button>
              </OfferCard>
            ))}
          </ul>
        )}
      </section>

      <AuctionPanel state={state} act={act} />

      <CrownPanel state={state} act={act} />

      {closed.length > 0 && (
        <details className="card fold">
          <summary>
            <h2>Tus ofertas recientes ({closed.length})</h2>
          </summary>
          <ul className="list">
            {closed.slice(0, 8).map((o) => (
              <li key={o.id}>
                {o.de !== me && <strong>{houseName(state.casas, o.de)}: </strong>}
                <Bundle r={o.da} /> por <Bundle r={o.pide} /> ·{" "}
                <small>
                  {o.caducada ? "caducada" : STATUS[o.estado]}
                  {o.estado === "accepted" && o.aceptadaPor && o.aceptadaPor !== me ? ` por ${houseName(state.casas, o.aceptadaPor)}` : ""}
                </small>
                {active && o.de === me && o.estado === "cancelled" && (
                  <button
                    className="link"
                    onClick={() => {
                      setDraft({ para: o.para, da: toLines(o.da), pide: toLines(o.pide), frase: o.frase ?? "" });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Volver a publicar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Bloque 8: las alianzas, plegadas aquí hasta que el bloque 11 las lleve a Reino. */}
      <DiplomacyPanel state={state} act={act} />

      <details className="card fold">
        <summary>
          <h2>Tratos del reino ({(state.tratos ?? []).length})</h2>
        </summary>
        <p className="muted">
          Cada casa distinta con la que cierras un trato de al menos 10 recursos por lado en los últimos 7 días da 2 de Prestigio
          (máximo 6).
        </p>
        {(state.tratos ?? []).length === 0 ? (
          <p className="muted">Aún no se ha cerrado ningún trato.</p>
        ) : (
          <ul className="list">
            {(state.tratos ?? []).map((t) => (
              <li key={t.id}>
                {houseName(state.casas, t.casas[0])} y {houseName(state.casas, t.casas[1])}
                {t.cantidades && ` (${t.cantidades[0]} por ${t.cantidades[1]})`}
                {!t.valido && <small className="muted"> · no cuenta para el Prestigio</small>}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

/** Una línea del formulario: un recurso y su cantidad (bloque 10). */
interface Line {
  r: Resource;
  n: number;
}

interface Draft {
  para: number | null;
  da: Line[];
  pide: Line[];
  /** Frase corta (bloque 10), opcional. */
  frase: string;
  contra?: OfferInfo;
}

const toBundle = (lines: Line[]): Resources => {
  const out: Resources = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };
  for (const l of lines) out[l.r] += l.n;
  return out;
};

const toLines = (b: Partial<Resources>): Line[] => RESOURCES.filter((r) => (b[r] ?? 0) > 0).map((r) => ({ r, n: b[r]! }));

/** Oferta nueva: das de lo que más tienes y pides de lo que menos. */
function newDraft(have: Resources): Draft {
  const sorted = [...RESOURCES].sort((a, b) => have[b] - have[a]);
  return { para: null, da: [{ r: sorted[0]!, n: 0 }], pide: [{ r: sorted[sorted.length - 1]!, n: 0 }], frase: "" };
}

const STEPS = [1, 5, 10];

function OfferForm({
  state,
  draft,
  setDraft,
  onSubmit,
}: {
  state: GameState;
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  onSubmit: () => void;
}) {
  const have = state.yo.recursos!;
  const prices = state.corona?.precios;
  const others = state.casas.filter((h) => h.id !== state.yo.casa);
  const give = toBundle(draft.da);
  const want = toBundle(draft.pide);
  const used = new Set([...draft.da, ...draft.pide].map((l) => l.r));
  const short = RESOURCES.filter((r) => give[r] > have[r]);
  const ready = totalOf(give) > 0 && totalOf(want) > 0 && short.length === 0;
  const setLine = (side: "da" | "pide", i: number, l: Partial<Line>) =>
    setDraft({ ...draft, [side]: draft[side].map((x, j) => (j === i ? { ...x, ...l, n: Math.max(0, Math.min(500, l.n ?? x.n)) } : x)) });
  const addLine = (side: "da" | "pide") => {
    const free = RESOURCES.find((r) => !used.has(r));
    if (free) setDraft({ ...draft, [side]: [...draft[side], { r: free, n: 0 }] });
  };
  const dropLine = (side: "da" | "pide", i: number) => setDraft({ ...draft, [side]: draft[side].filter((_, j) => j !== i) });
  // «Precio justo»: rellena lo que pides (una sola línea) con lo que vale lo que das.
  const fair = prices && draft.pide.length === 1 && totalOf(give) > 0 ? fairAmount(give, prices, draft.pide[0]!.r) : 0;

  const side = (key: "da" | "pide") => (
    <div className="offer-side">
      <h3>
        {key === "da" ? "Das" : "Pides"}
        {prices && <small className="offer-worth"> ≈ {referenceValue(key === "da" ? give : want, prices)} de Oro</small>}
      </h3>
      {draft[key].map((l, i) => (
        <div className="offer-line" key={i}>
          <div className="res-pick" role="radiogroup" aria-label={`Recurso que ${key === "da" ? "das" : "pides"}`}>
            {RESOURCES.map((r) => (
              <button
                key={r}
                role="radio"
                aria-checked={l.r === r}
                aria-label={RESOURCE_LABEL[r]}
                title={RESOURCE_LABEL[r]}
                className={l.r === r ? "on" : ""}
                disabled={l.r !== r && used.has(r)}
                onClick={() => setLine(key, i, { r })}
              >
                <ResourceIcon r={r} size={20} />
              </button>
            ))}
          </div>
          <div className="offer-amount">
            <button aria-label={`5 menos de ${RESOURCE_LABEL[l.r]}`} onClick={() => setLine(key, i, { n: l.n - 5 })}>
              −5
            </button>
            <input
              inputMode="numeric"
              aria-label={`${key === "da" ? "Das" : "Pides"}: ${RESOURCE_LABEL[l.r]}`}
              value={l.n}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setLine(key, i, { n: Number(e.target.value.replace(/\D/g, "")) || 0 })}
            />
            {STEPS.map((k) => (
              <button key={k} aria-label={`${k} más de ${RESOURCE_LABEL[l.r]}`} onClick={() => setLine(key, i, { n: l.n + k })}>
                +{k}
              </button>
            ))}
          </div>
          <div className="offer-line-foot">
            <small className="muted">
              {RESOURCE_LABEL[l.r]}
              {key === "da" && ` · tienes ${have[l.r]}`}
            </small>
            {draft[key].length > 1 && (
              <button className="link" onClick={() => dropLine(key, i)}>
                Quitar
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="actions">
        {used.size < RESOURCES.length && (
          <button className="secondary" onClick={() => addLine(key)}>
            + otro recurso
          </button>
        )}
        {key === "pide" && prices && (
          <button
            className="secondary"
            disabled={fair === 0}
            title="Pide lo que vale lo que das, con los precios de la Corona sin su recargo"
            onClick={() => setLine("pide", 0, { n: fair })}
          >
            Precio justo
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section className="card offer-form">
      <h2>{draft.contra ? "Contraoferta" : "Nueva oferta"}</h2>
      {!draft.contra && (
        <label>
          ¿Para quién?
          <select value={draft.para ?? ""} onChange={(e) => setDraft({ ...draft, para: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Todo el reino (mercado público)</option>
            {others.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {draft.contra && <p className="muted">Para {state.casas.find((h) => h.id === draft.para)?.nombre}.</p>}
      {side("da")}
      {side("pide")}
      <label className="offer-note">
        Una frase, si quieres
        <input
          maxLength={TRADE.noteMax}
          placeholder={draft.contra ? "Mi última palabra, majestad." : "Busco Madera para la muralla."}
          value={draft.frase}
          onChange={(e) => setDraft({ ...draft, frase: e.target.value.slice(0, TRADE.noteMax) })}
        />
      </label>
      {short.length > 0 && (
        <p className="error">
          No tienes todo lo que ofreces: te {short.length === 1 && give[short[0]!] - have[short[0]!] === 1 ? "falta" : "faltan"}{" "}
          {short.map((r) => `${give[r] - have[r]} de ${RESOURCE_LABEL[r]}`).join(" y ")}.
        </p>
      )}
      {totalOf(give) > 0 && totalOf(want) > 0 && (totalOf(give) < 10 || totalOf(want) < 10) && (
        <p className="muted">Con menos de 10 por lado, el trato no cuenta para el Prestigio de comercio.</p>
      )}
      <div className="actions">
        <button className="primary" disabled={!ready} onClick={onSubmit}>
          {draft.para == null ? "Publicar" : "Enviar"}
        </button>
        <button className="link" onClick={() => setDraft(null)}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
