import { useState } from "react";
import { RESOURCES, type Resources } from "@reyes/engine";
import { api, type GameState, type OfferInfo } from "../api";
import { HOUSE_COLORS, RESOURCE_LABEL, RESOURCE_MARK, houseName } from "../ui";

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
          <span aria-hidden>{RESOURCE_MARK[k]}</span> {r[k]} <span className="sr-only">{RESOURCE_LABEL[k]}</span>
        </span>
      ))}
    </>
  );
}

const empty = (): Record<keyof Resources, number> => ({ pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 });

export function TradePanel({ state, act }: Props) {
  const me = state.yo.casa;
  const gameId = state.partida.id;
  const offers = state.ofertas ?? [];
  const open = offers.filter((o) => o.estado === "open");
  const forMe = open.filter((o) => o.para === me);
  const market = open.filter((o) => o.para === null && o.de !== me);
  const mine = open.filter((o) => o.de === me);
  const closed = offers.filter((o) => o.estado !== "open");
  const [draft, setDraft] = useState<{ para: number | null; da: Record<keyof Resources, number>; pide: Record<keyof Resources, number>; contra?: OfferInfo } | null>(null);
  const active = state.partida.estado === "active";
  const color = (id: number) => HOUSE_COLORS[state.casas.find((h) => h.id === id)?.color ?? ""]?.hex;

  const startCounter = (o: OfferInfo) =>
    setDraft({ para: o.de, da: { ...o.pide }, pide: { ...o.da }, contra: o });

  const OfferCard = ({ o, children }: { o: OfferInfo; children?: React.ReactNode }) => (
    <li className="offer">
      <div>
        <span className="swatch small" style={{ background: color(o.de) }} />{" "}
        <strong>{o.de === me ? "Tú" : houseName(state.casas, o.de)}</strong>
        {o.para != null && o.de === me && <> → {houseName(state.casas, o.para)}</>}
        {o.contraofertaDe != null && <small className="muted"> · contraoferta</small>}
        <div className="offer-terms">
          <span>
            Da: <Bundle r={o.da} />
          </span>
          <span>
            Pide: <Bundle r={o.pide} />
          </span>
        </div>
      </div>
      {active && <div className="actions">{children}</div>}
    </li>
  );

  return (
    <div>
      {draft ? (
        <OfferForm
          state={state}
          draft={draft}
          setDraft={setDraft}
          onSubmit={() =>
            act(async () => {
              await api.createOffer(gameId, {
                para: draft.para,
                da: draft.da,
                pide: draft.pide,
                contraofertaDe: draft.contra?.id,
              });
              setDraft(null);
            }, draft.para == null ? "Oferta publicada en el mercado." : "Oferta enviada.")
          }
        />
      ) : (
        active && (
          <button className="primary wide" onClick={() => setDraft({ para: null, da: empty(), pide: empty() })}>
            Nueva oferta
          </button>
        )
      )}

      <section className="card">
        <h2>Para ti ({forMe.length})</h2>
        {forMe.length === 0 ? (
          <p className="muted">Nadie te ha hecho una oferta directa. De momento.</p>
        ) : (
          <ul className="list">
            {forMe.map((o) => (
              <OfferCard key={o.id} o={o}>
                <button className="primary" onClick={() => act(() => api.acceptOffer(gameId, o.id), "Trato cerrado. Ambas partes creen haber ganado.")}>
                  Aceptar
                </button>
                <button onClick={() => startCounter(o)}>Contraofertar</button>
                <button className="link" onClick={() => act(() => api.rejectOffer(gameId, o.id), "Oferta rechazada.")}>
                  Rechazar
                </button>
              </OfferCard>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Mercado ({market.length})</h2>
        {market.length === 0 ? (
          <p className="muted">No hay ofertas. El mercado está más vacío que el tesoro real.</p>
        ) : (
          <ul className="list">
            {market.map((o) => (
              <OfferCard key={o.id} o={o}>
                <button className="primary" onClick={() => act(() => api.acceptOffer(gameId, o.id), "Trato cerrado. Ambas partes creen haber ganado.")}>
                  Aceptar
                </button>
                <button onClick={() => startCounter(o)}>Contraofertar</button>
              </OfferCard>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Tus ofertas abiertas ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="muted">No tienes ofertas abiertas. Puedes tener hasta 3 públicas.</p>
        ) : (
          <ul className="list">
            {mine.map((o) => (
              <OfferCard key={o.id} o={o}>
                <button className="link" onClick={() => act(() => api.cancelOffer(gameId, o.id), "Oferta retirada.")}>
                  Retirar
                </button>
              </OfferCard>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="card">
          <h2>Tus ofertas recientes</h2>
          <ul className="list">
            {closed.slice(0, 8).map((o) => (
              <li key={o.id}>
                <Bundle r={o.da} /> por <Bundle r={o.pide} /> ·{" "}
                <small>
                  {o.estado === "accepted"
                    ? `aceptada${o.aceptadaPor && o.aceptadaPor !== me ? ` por ${houseName(state.casas, o.aceptadaPor)}` : ""}`
                    : o.estado === "rejected"
                      ? "rechazada"
                      : o.estado === "countered"
                        ? "contraofertada"
                        : "retirada"}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Tratos del reino</h2>
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
      </section>
    </div>
  );
}

function OfferForm({
  state,
  draft,
  setDraft,
  onSubmit,
}: {
  state: GameState;
  draft: { para: number | null; da: Record<keyof Resources, number>; pide: Record<keyof Resources, number>; contra?: OfferInfo };
  setDraft: (d: typeof draft | null) => void;
  onSubmit: () => void;
}) {
  const have = state.yo.recursos!;
  const others = state.casas.filter((h) => h.id !== state.yo.casa);
  const set = (side: "da" | "pide", r: keyof Resources, v: number) =>
    setDraft({ ...draft, [side]: { ...draft[side], [r]: Math.max(0, Math.min(500, v)) } });
  const total = (b: Record<string, number>) => Object.values(b).reduce((a, x) => a + x, 0);
  const overlap = RESOURCES.some((r) => draft.da[r] > 0 && draft.pide[r] > 0);
  const short = RESOURCES.some((r) => draft.da[r] > have[r]);

  const row = (side: "da" | "pide", r: keyof Resources) => (
    <div className="stepper" key={`${side}-${r}`}>
      <span className={`res res-${r}`}>
        <span aria-hidden>{RESOURCE_MARK[r]}</span> {RESOURCE_LABEL[r]}
      </span>
      <button aria-label={`Menos ${RESOURCE_LABEL[r]}`} onClick={() => set(side, r, draft[side][r] - 5)}>
        −
      </button>
      <input
        inputMode="numeric"
        aria-label={`${side === "da" ? "Das" : "Pides"} ${RESOURCE_LABEL[r]}`}
        value={draft[side][r]}
        onChange={(e) => set(side, r, Number(e.target.value.replace(/\D/g, "")) || 0)}
      />
      <button aria-label={`Más ${RESOURCE_LABEL[r]}`} onClick={() => set(side, r, draft[side][r] + 5)}>
        +
      </button>
    </div>
  );

  return (
    <section className="card">
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
      <h3>Das</h3>
      {RESOURCES.map((r) => row("da", r))}
      <h3>Pides</h3>
      {RESOURCES.map((r) => row("pide", r))}
      {overlap && <p className="error">No tiene sentido dar y pedir el mismo recurso.</p>}
      {short && <p className="error">No tienes todo lo que ofreces.</p>}
      {total(draft.da) > 0 && total(draft.pide) > 0 && (total(draft.da) < 10 || total(draft.pide) < 10) && (
        <p className="muted">Con menos de 10 por lado, el trato no cuenta para el Prestigio de comercio.</p>
      )}
      <div className="actions">
        <button className="primary" disabled={overlap || short || total(draft.da) === 0 || total(draft.pide) === 0} onClick={onSubmit}>
          {draft.para == null ? "Publicar" : "Enviar"}
        </button>
        <button className="link" onClick={() => setDraft(null)}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
