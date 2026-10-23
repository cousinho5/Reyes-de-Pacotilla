import { useEffect, useMemo, useRef, useState } from "react";
import { api, type AuctionInfo, type GameState } from "../api";
import { ENAMEL, shieldArt } from "../art";
import type { AuctionLotArt } from "../art/auctionScene";
import { AuctionScene } from "./AuctionScene";
import { Sheet, type SheetState } from "./Sheet";
import { formatWhen, houseName } from "../ui";

type Lot = AuctionInfo["lotes"][number];

const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const envelopes = (n: number) => (n === 0 ? "Sin sobres" : n === 1 ? "1 sobre" : `${n} sobres`);
const lotName = (l: Lot) => (l.carta ? `Carta: ${l.carta.nombre}` : l.nombre);

/** Resultado ya visto en este navegador: la escena del mazo se cuenta solo la primera vez. */
function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}
function markSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* sin almacenamiento: se contará otra vez */
  }
}

/**
 * Gran Subasta del miércoles: tres lotes y pujas ciegas en Oro (bloque 10, extra).
 * Abierta, una escena con el subastador, la vela «a la candela» que se consume
 * hasta el cierre y los sobres lacrados de cada lote; tocar un lote sube la hoja
 * para pujar. Cerrada, una línea con el resultado plegado: el mazo y los escudos
 * de quien ganó (la primera vez, contado: se apaga la vela, cae el mazo y salen los escudos).
 */
export function AuctionPanel({
  state,
  act,
}: {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}) {
  const a = state.subasta;
  const me = state.casas.find((h) => h.id === state.yo.casa);
  const color = ENAMEL[me?.color ?? ""] ?? "#b3291d";
  const now = state.prueba?.ahora ? Date.parse(state.prueba.ahora) : Date.now();
  const [picked, setPicked] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetState>("full");
  const [sheetTop, setSheetTop] = useState(0);
  const scene = useRef<HTMLDivElement>(null);

  // El resultado contado: 0 vela apagada, 1 cae el mazo, 2 a 4 sale el escudo de cada lote.
  const seenKey = a ? `subasta-vista:${state.partida.id}:${a.semana}` : "";
  const [fresh] = useState(() => !!a && !a.abierta && !seen(seenKey));
  const [step, setStep] = useState(fresh && !still() ? 0 : 9);
  useEffect(() => {
    if (!fresh) return;
    markSeen(seenKey);
    if (still()) return;
    const id = setInterval(() => setStep((s) => Math.min(9, s + 1)), 700);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);

  const lots: AuctionLotArt[] = useMemo(
    () =>
      (a?.lotes ?? []).map((l, i) => {
        const winner = !a?.abierta && l.ganador != null && step >= 2 + i ? state.casas.find((h) => h.id === l.ganador) : null;
        return {
          recursos: l.carta ? null : (l.recursos ?? null),
          sobres: l.sobres ?? 0,
          tuyo: l.miPuja != null,
          ganador: winner ? shieldArt(winner.color, winner.escudo) : null,
        };
      }),
    [a, step, state.casas],
  );

  if (!a) {
    return (
      <p className="card auction-line">
        <strong>Gran Subasta:</strong> lotes el martes a las 22:00.
      </p>
    );
  }

  const oro = state.yo.recursos?.oro ?? 0;
  const names = a.lotes.map(lotName);

  if (!a.abierta) {
    return (
      <details className="card fold auction-line" open={fresh || undefined}>
        <summary>
          <strong>Gran Subasta:</strong> resultado de la semana {a.semana}; lotes nuevos el martes a las 22:00.
        </summary>
        <AuctionScene
          lots={lots}
          names={names}
          candle={0}
          color={color}
          hammer={step >= 1}
          label={`Resultado de la Gran Subasta de la semana ${a.semana}`}
        />
        <ul className="lot-cols">
          {a.lotes.map((l) => (
            <li key={l.lote}>
              <div>
                <strong>{lotName(l)}</strong>
                <small>{l.ganador != null ? `Para ${houseName(state.casas, l.ganador)} por ${l.precio} de Oro` : "Nadie pujó"}</small>
              </div>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  // La vela arde desde el anuncio hasta el cierre del miércoles; mientras está abierta, nunca se apaga del todo.
  const lit = a.abre ? Date.parse(a.abre) : null;
  const close = state.partida.cierre ? Date.parse(state.partida.cierre) : null;
  const candle = lit != null && close != null && close > lit ? Math.max(0.05, Math.min(1, (close - now) / (close - lit))) : 1;
  const lot = picked != null ? a.lotes[picked] : null;

  const pick = (i: number) => {
    const el = scene.current;
    if (el) {
      // La escena sube justo debajo de la barra de arriba y la hoja se abre debajo, para ver el lote elegido.
      const bar = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - bar, behavior: "instant" });
      setSheetTop(Math.max(0, el.getBoundingClientRect().bottom));
    }
    setPicked(i);
    setSheet("full");
  };

  return (
    <section className="card auction">
      <h2>Gran Subasta · semana {a.semana}</h2>
      <AuctionScene
        ref={scene}
        lots={lots}
        names={names}
        candle={candle}
        color={color}
        hammer={false}
        selected={picked}
        onPick={pick}
        label={`Gran Subasta: ${names.join(", ")}. La vela se apaga el ${formatWhen(state.partida.cierre)}.`}
      />
      <ul className="lot-cols">
        {a.lotes.map((l, i) => (
          <li key={l.lote}>
            <button className={picked === i ? "on" : ""} onClick={() => pick(i)}>
              <strong>{lotName(l)}</strong>
              <small>{envelopes(l.sobres ?? 0)}</small>
              <small className={l.miPuja != null ? "my-bid" : "muted"}>{l.miPuja != null ? `Tu puja: ${l.miPuja}` : "Pujar"}</small>
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">
        La vela se apaga el {formatWhen(state.partida.cierre)}. Pujas ciegas en Oro: solo se ve cuántos sobres tiene cada lote. Gana la
        más alta (en empate, la primera), el Oro pagado desaparece y cada lote ganado da +2 de Prestigio, hasta 3 veces.
      </p>

      {lot && (
        <div className="sheet-layer" style={{ top: sheetTop }}>
          <Sheet state={sheet} setState={setSheet} onClose={() => setPicked(null)} label={`Lote ${lot.lote}: ${lotName(lot)}`}>
            <BidSheet
              key={lot.lote}
              lot={lot}
              oro={oro}
              onBid={(n) => act(() => api.bid(state.partida.id, lot.lote, n), n === 0 ? "Puja retirada." : "Puja sellada. Nadie sabe cuánto.")}
            />
          </Sheet>
        </div>
      )}
    </section>
  );
}

/** La hoja de un lote: qué es, cuántos sobres tiene y tu puja. */
function BidSheet({ lot, oro, onBid }: { lot: Lot; oro: number; onBid: (n: number) => Promise<void> }) {
  const [value, setValue] = useState(lot.miPuja != null ? String(lot.miPuja) : "");
  return (
    <div className="bid-sheet">
      <h2>
        Lote {lot.lote}: {lotName(lot)}
      </h2>
      {lot.carta && <p>{lot.carta.texto}</p>}
      <p className="muted">
        {envelopes(lot.sobres ?? 0)} en la mesa{lot.miPuja != null ? `; uno es el tuyo (${lot.miPuja} de Oro)` : ""}.
      </p>
      <form
        className="inline bid"
        onSubmit={(e) => {
          e.preventDefault();
          void onBid(Number(value) || 0);
        }}
      >
        <input
          type="number"
          min={0}
          max={oro}
          inputMode="numeric"
          aria-label={`Puja por el lote ${lot.lote}`}
          placeholder="Oro"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="primary">
          {lot.miPuja != null ? "Volver a sellar" : "Sellar la puja"}
        </button>
      </form>
      <p className="hint">Para retirar tu puja, pon 0. Tienes {oro} de Oro.</p>
    </div>
  );
}
