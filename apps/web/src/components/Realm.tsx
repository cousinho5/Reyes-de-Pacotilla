import { BulletinPanel } from "./BulletinPanel";
import type { GameState } from "../api";
import { ShieldIcon } from "../art";
import { withArticle } from "../ui";
import { Chronicle } from "./Chronicle";
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

  return (
    <div>
      {winner && (
        <section className="card coronation">
          <ShieldIcon color={winner.color} escudo={winner.escudo} size={72} />
          <h2>¡Larga vida a {withArticle(winner.nombre)}!</h2>
          <p>Fin del interregno. Fray Abundio, que siempre creyó en {withArticle(winner.nombre)}, ya ha corregido sus crónicas.</p>
        </section>
      )}
      <DiplomacyStrip state={state} />
      <Standings state={state} />
      <PrestigeChart state={state} />
      <BulletinPanel state={state} act={act} />

      <Chronicle state={state} />
      <DiplomacyPanel state={state} act={act} />
    </div>
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
