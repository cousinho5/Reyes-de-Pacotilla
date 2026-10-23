import { Suspense, useEffect, useState } from "react";
import { BulletinPanel, ErrataCard } from "./BulletinPanel";
import { api, type GameState } from "../api";
import { Crown, ShieldIcon } from "../art";
import { Parchment, type Shown } from "./Parchment";
import { withArticle } from "../ui";
import { Chronicle } from "./Chronicle";
import { CinematicList, Player } from "./CinematicList";
import { DiplomacyPanel } from "./DiplomacyPanel";
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
  const final = state.partida.final;
  const winner = final?.winner != null ? state.casas.find((h) => h.id === final.winner) : null;

  // Bloque 11: al acabar, la pestaña es «La coronación»: el ganador coronado,
  // el podio final, la Crónica Definitiva (con la fe de erratas) y la carrera entera.
  if (state.partida.estado === "finished") {
    return (
      <div>
        <section className="card coronation">
          <p className="coronation-kicker">La coronación</p>
          {winner && (
            <>
              <span className="coronation-crown">
                <Crown size={64} shine />
              </span>
              <ShieldIcon color={winner.color} escudo={winner.escudo} size={112} />
              <h2>¡Larga vida a {withArticle(winner.nombre)}!</h2>
              {winner.lema && <p className="house-motto">«{winner.lema}»</p>}
              <p>Fin del interregno. Fray Abundio, que siempre creyó en {withArticle(winner.nombre)}, ya ha corregido sus crónicas.</p>
            </>
          )}
          <CoronationActions state={state} act={act} />
        </section>
        <Standings state={state} />
        <DefinitiveChronicle state={state} />
        <ErrataCard state={state} act={act} />
        <PrestigeChart state={state} />
        <BulletinPanel state={state} act={act} />
        <Chronicle state={state} />
        <CinematicList state={state} act={act} />
      </div>
    );
  }

  return (
    <div>
      <DiplomacyStrip state={state} />
      <Standings state={state} />
      <PrestigeChart state={state} />
      <BulletinPanel state={state} act={act} />
      <Chronicle state={state} />
      <CinematicList state={state} act={act} />
      <DiplomacyPanel state={state} act={act} />
    </div>
  );
}

/**
 * Bloque 13: volver a ver la cinemática de la coronación y compartirla con el
 * enlace público (sin cuenta, solo lo que ya es de todos).
 */
function CoronationActions({ state, act }: { state: GameState; act: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const item = (state.cinematicas ?? []).find((i) => i.tipo === "coronacion");
  const url = state.compartir ? `${location.origin}/coronacion/${state.compartir}` : null;
  const share = async () => {
    if (!url) return;
    const title = `La coronación de ${state.partida.nombre}`;
    try {
      if (navigator.share) await navigator.share({ title, text: "¡Hay rey en Aldricia!", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Cancelado: nada que hacer.
    }
  };
  if (!item && !url) return null;
  return (
    <div className="actions coronation-actions">
      {item && state.coronacion && (
        <button className="primary" onClick={() => setOpen(true)}>
          Ver la coronación
        </button>
      )}
      {url && <button onClick={share}>{copied ? "Enlace copiado" : "Compartir la coronación"}</button>}
      {open && item && (
        <Suspense fallback={null}>
          <Player item={item} state={state} act={act} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

/** La Crónica Definitiva (semana 0), entera, en su pergamino. */
function DefinitiveChronicle({ state }: { state: GameState }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const has = (state.boletines ?? []).some((b) => b.semana === 0);
  useEffect(() => {
    if (!has) return;
    let alive = true;
    api
      .bulletin(state.partida.id, 0)
      .then((b) => alive && setShown(b))
      .catch(() => alive && setShown(null));
    return () => {
      alive = false;
    };
    // La fe de erratas cambia su pie: se vuelve a leer.
  }, [state.partida.id, has, state.feDeErratas?.texto]);
  if (!has) return null;
  if (!shown) return <p className="hint">Fray Abundio pasa a limpio la Crónica Definitiva…</p>;
  return (
    <section className="bulletin-wrap">
      <Parchment bulletin={shown} gameName={state.partida.nombre} houses={state.casas} />
    </section>
  );
}

/** Bloque 11: una tira arriba solo si hay algo de diplomacia pendiente; lleva al panel, al final. */
function DiplomacyStrip({ state }: { state: GameState }) {
  const info = state.alianzas;
  if (!info?.activas) return null;
  const me = state.yo.casa;
  const received = info.propuestas.filter((p) => p.para === me).length;
  const warning = info.lista.filter((a) => a.casas.includes(me) && a.estado === "aviso").length;
  if (received + warning === 0) return null;
  const parts = [
    received > 0 && `${received} ${received === 1 ? "propuesta de alianza" : "propuestas de alianza"}`,
    warning > 0 && `${warning} ${warning === 1 ? "alianza en aviso" : "alianzas en aviso"}`,
  ].filter(Boolean);
  const go = () => {
    const d = document.getElementById("diplomacia") as HTMLDetailsElement | null;
    if (!d) return;
    d.open = true;
    d.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <button className="diplomacy-strip" onClick={go}>
      <span>Diplomacia: {parts.join(" y ")}</span>
      <span aria-hidden="true">›</span>
    </button>
  );
}
