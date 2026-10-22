import { useMemo, useState } from "react";
import { ANY_ORIGIN, crossingRisks, defenseBreakdown, type CampaignEvent, type DefensePart } from "@reyes/engine";
import type { GameState, OrderView, TileView } from "../api";
import { TileArt } from "../art";
import { describeEvent, formatWhen, HOUSE_COLORS, houseName, nightLabel, TILE_LABEL, troopsText, withArticle } from "../ui";
import { asTile, myAllies, myBreaking, nextResolution, nightOf, project, queueNights, toOrder, whatIfAttacked } from "../plan";
import { VERB_LABEL, verbOf } from "../verbs";

interface Props {
  state: GameState;
  draft: OrderView[];
  setDraft: (o: OrderView[]) => void;
  /** Ir al mapa a planear esa noche de la cola. */
  onPlan: (night: number) => void;
  /** Bloque 12: abrir la orden en el mapa para cambiarla (con su noche de la cola). */
  onEdit: (o: OrderView, night: number) => void;
}

type Combat = Extract<CampaignEvent, { type: "combate" }>;

const PART_LABEL: Record<DefensePart["kind"], string> = {
  defensor: "del defensor",
  fortificada: "de murallas",
  fortaleza: "de fortaleza",
  terreno: "",
  ausente: "de casa ausente",
  rio: "del río",
};

export function OrdersPanel({ state, draft, setDraft, onPlan, onEdit }: Props) {
  const tiles = state.casillas ?? [];
  const me = state.yo.casa;
  const open = !!state.partida.ordenesAbiertas;
  const next = nextResolution(state);
  const nights = open ? queueNights(state) : 1;
  const allies = useMemo(() => myAllies(state), [state]);
  const bound = useMemo(() => [...allies, ...myBreaking(state)], [allies, state]);

  // Simular las noches: el mismo motor que el servidor, con lo que esta casa ve.
  // Lo que no ves (tropas ocultas y órdenes ajenas) no entra en la previsión.
  const plan = useMemo(() => (draft.length ? project(state, draft) : null), [draft, state]);
  const forecast = useMemo(
    () =>
      (plan?.nights ?? []).map((p, k) =>
        p.events
          .filter((e) => e.type !== "movimiento")
          .map((e, i) => ({ i, text: describeEvent({ id: i, tipo: e.type, resolucion: null, datos: e as never }, state.casas, plan!.maps[k] ?? tiles) }))
          .filter((x): x is { i: number; text: string } => !!x.text),
      ),
    [plan, tiles, state.casas],
  );

  // Cruces por el camino (bloque 4): marchas de esta noche que un enemigo a la vista podría cruzar.
  const crossings = useMemo(() => {
    if (me == null) return new Map<OrderView, number[]>();
    const tonight = draft.filter((o) => nightOf(o, next) === next);
    const risks = crossingRisks(tiles, me, tonight.map((o) => toOrder(o, me)));
    return new Map(risks.map((r) => [tonight[r.order]!, r.by]));
  }, [draft, tiles, me, next]);

  // «¿Y si atacan?» (bloque 12): solo con lo que ves; se calcula al pedirlo.
  const [whatIf, setWhatIf] = useState<ReturnType<typeof whatIfAttacked> | null>(null);
  const whatIfKey = JSON.stringify(draft.filter((o) => nightOf(o, next) === next));
  const [whatIfFor, setWhatIfFor] = useState("");
  const shownWhatIf = whatIfFor === whatIfKey ? whatIf : null;

  const remove = (o: OrderView) => setDraft(draft.filter((x) => x !== o));

  return (
    <div>
      <section className="card">
        <h2>Órdenes para {nightLabel(state.partida, 0, true)}</h2>
        <p className="muted">
          Se cumplen todas a la vez el {formatWhen(state.partida.resolucion)}. Se guardan solas y puedes cambiarlas hasta el cierre (
          {formatWhen(state.partida.cierre)}). Nadie más las ve hasta entonces.
        </p>
        {!open && <p className="error">Las órdenes están cerradas hasta la resolución.</p>}
      </section>

      {open && me != null && (
        <section className="card what-if">
          <div className="row">
            <h2 className="grow">¿Y si atacan?</h2>
            <button
              onClick={() => {
                setWhatIf(whatIfAttacked(state, draft));
                setWhatIfFor(whatIfKey);
              }}
            >
              {shownWhatIf ? "Volver a probar" : "Probar"}
            </button>
          </div>
          {!shownWhatIf ? (
            <p className="muted">Prueba que cada casa a la vista ataca esta noche con todo lo que le ves, con tus órdenes ya dadas.</p>
          ) : shownWhatIf.length === 0 ? (
            <p>Con lo que ves, ninguna casa podría quitarte una casilla esta noche. Lo que no ves (bosques, niebla) puede cambiarlo.</p>
          ) : (
            <ul className="list">
              {shownWhatIf.map((w) => (
                <li key={w.tile}>
                  Perderías <strong>{tiles.find((t) => t.id === w.tile)?.nombre}</strong> si{" "}
                  {w.by.map((h) => withArticle(houseName(state.casas, h))).join(" o ")} {w.by.length === 1 ? "ataca" : "atacan"} con todo
                  ({troopsText(w.troops)} a la vista).
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {Array.from({ length: nights }, (_, k) => {
        const list = draft.filter((o) => nightOf(o, next) === next + k);
        if (k > 0 && list.length === 0) return null;
        const before = plan?.maps[k] ?? tiles;
        const events = plan?.nights[k]?.events ?? [];
        // Bloque 12: una tarjeta por casilla de destino, con el ataque y sus apoyos juntos.
        const groups = new Map<number, OrderView[]>();
        for (const o of list) groups.set(o.hacia, [...(groups.get(o.hacia) ?? []), o]);
        return (
          <section key={k} className="night-orders">
            <h3 className="night-title">
              {k === 0 ? `Próxima: ${nightLabel(state.partida, 0)}` : `En cola: ${nightLabel(state.partida, k)}`}
              {open && (
                <button className="link" onClick={() => onPlan(k)}>
                  Ver en el mapa
                </button>
              )}
            </h3>
            {k > 0 && <p className="hint">Al llegar su noche, cada orden sale con las tropas que queden.</p>}
            {list.length === 0 ? (
              <p className="card">Sin órdenes: tus tropas se quedan donde están. Para dar una, toca una casilla tuya en el mapa.</p>
            ) : (
              [...groups.entries()].map(([target, orders]) => (
                <OrderCard
                  key={target}
                  state={state}
                  target={before.find((t) => t.id === target)}
                  orders={orders}
                  before={before}
                  combat={events.find((e): e is Combat => e.type === "combate" && e.tile === target)}
                  resolution={next + k}
                  allies={allies}
                  bound={bound}
                  open={open}
                  crossings={crossings}
                  onEdit={(o) => onEdit(o, k)}
                  onRemove={remove}
                />
              ))
            )}
          </section>
        );
      })}

      {forecast.some((f) => f.length > 0) && (
        <details className="card">
          <summary>Todo lo que pasaría, noche a noche</summary>
          <p className="muted">Con lo que ves ahora. Las órdenes de las demás casas son secretas y pueden cambiarlo todo.</p>
          {forecast.map((lines, k) =>
            lines.length === 0 ? null : (
              <div key={k}>
                {forecast.length > 1 && <h3>{nightLabel(state.partida, k)}</h3>}
                <ul className="list">
                  {lines.map((f) => (
                    <li key={f.i}>{f.text}</li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </details>
      )}
    </div>
  );
}

/** Bloque 12: las órdenes a una casilla, con la cuenta de fuerza con lo que ves. */
function OrderCard({
  state,
  target,
  orders,
  before,
  combat,
  resolution,
  allies,
  bound,
  open,
  crossings,
  onEdit,
  onRemove,
}: {
  state: GameState;
  target: TileView | undefined;
  orders: OrderView[];
  /** El mapa antes de esa noche. */
  before: TileView[];
  combat: Combat | undefined;
  resolution: number;
  allies: number[];
  bound: number[];
  open: boolean;
  crossings: Map<OrderView, number[]>;
  onEdit: (o: OrderView) => void;
  onRemove: (o: OrderView) => void;
}) {
  const me = state.yo.casa;
  const name = (id: number) => before.find((t) => t.id === id)?.nombre ?? "?";
  if (!target) return null;
  const owner = target.owner != null ? state.casas.find((h) => h.id === target.owner) : undefined;
  return (
    <article className="card order-card">
      <header className="order-card-head">
        <TileArt type={target.type} flag={owner ? HOUSE_COLORS[owner.color]?.hex : null} className="thumb" />
        <div className="grow">
          <h4>{target.nombre}</h4>
          <p className="muted">
            {TILE_LABEL[target.type]} · {target.owner === me ? "tuya" : owner ? houseName(state.casas, owner.id) : "neutral"}
            {target.owner !== me && ` · ${target.troops == null ? "no ves sus tropas" : `ves ${troopsText(target.troops, target.jinetes, target.catapultas)}`}`}
          </p>
        </div>
      </header>
      <Outlook state={state} target={target} orders={orders} combat={combat} resolution={resolution} />
      <ul className="order-lines">
        {orders.map((o, i) => {
          const from = before.find((t) => t.id === o.desde);
          const fromOwner = from?.owner != null ? state.casas.find((h) => h.id === from.owner) : undefined;
          return (
            <li key={i}>
              <button className="order-line" onClick={() => onEdit(o)} disabled={!open} aria-label={`Cambiar: ${lineText(o, name, target, me, allies, bound)}`}>
                {from && <TileArt type={from.type} flag={fromOwner ? HOUSE_COLORS[fromOwner.color]?.hex : null} className="thumb small" />}
                <span className="grow">
                  {lineText(o, name, target, me, allies, bound)}
                  {crossings.has(o) && (
                    <small className="order-warning">
                      Por el camino puede salirle al paso {withArticle(houseName(state.casas, crossings.get(o)![0]!))}: chocaríais de frente.
                    </small>
                  )}
                </span>
              </button>
              {open && (
                <button className="order-remove" aria-label="Quitar orden" title="Quitar orden" onClick={() => onRemove(o)}>
                  Quitar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/** Una orden en una línea: «Atacar · 6 (2 jinetes) desde Molino, con el Capitán». */
function lineText(o: OrderView, name: (id: number) => string, target: TileView, me: number, allies: number[], bound: number[]): string {
  if (o.tipo === "mover" && o.tropas === 0 && o.capitan) return `El Capitán va solo desde ${name(o.desde)}`;
  const verb = o.tipo === "apoyar" && o.apoyaDesde !== null && o.apoyaDesde !== ANY_ORIGIN ? "Apoyar el ataque" : VERB_LABEL[verbOf(o, target, me, allies, bound)];
  return `${verb} · ${troopsText(o.tropas, o.jinetes, o.catapultas)}${o.dePaso ? " de paso" : ""} desde ${name(o.desde)}${o.capitan ? ", con el Capitán" : ""}`;
}

/** El resultado previsto con lo que ves: «Ganarías: 6 contra 4, +25% del defensor y +25% de bosque». */
function Outlook({ state, target, orders, combat, resolution }: { state: GameState; target: TileView; orders: OrderView[]; combat: Combat | undefined; resolution: number }) {
  const me = state.yo.casa;
  if (orders.every((o) => o.tipo === "apoyar" && o.apoyaDesde === null)) {
    const n = orders.reduce((a, o) => a + o.tropas, 0);
    return <p className="outlook">Suman {n} a su defensa si la atacan esta noche. Tus tropas no se mueven.</p>;
  }
  if (orders.every((o) => o.tipo === "sitiar")) {
    return (
      <p className="outlook">
        {target.type === "castillo"
          ? "Asedio: con dos casillas tuyas alrededor, produce la mitad y ganas 1 de Prestigio cada noche."
          : "Asedio: pierde un 25% de murallas cada noche. Tus tropas se quedan en su casilla."}
      </p>
    );
  }
  if (!combat) {
    if (target.owner === me) return <p className="outlook">Sin combate: tus tropas pasan a {target.nombre}.</p>;
    if (target.owner != null && orders.some((o) => o.tipo === "mover")) return <p className="outlook">Sin combate, con lo que ves.</p>;
    return <p className="outlook">Con lo que ves, nadie lucha aquí esta noche.</p>;
  }
  const mine = combat.sides.find((s) => s.house === me);
  const other = combat.sides.filter((s) => s !== mine);
  const won = combat.winner === me || (combat.allies ?? []).includes(me);
  const defending = mine?.role === "defensa";
  const helpers = orders.filter((o) => o.tipo === "apoyar" && o.apoyaDesde !== null).reduce((a, o) => a + o.tropas, 0);
  const mineTroops = (mine?.troops ?? 0) + helpers;
  const otherTroops = other.reduce((a, s) => a + s.troops, 0);
  const hidden = target.troops == null && !defending;
  const { parts } = defenseBreakdown(asTile(target), resolution, false, !!(mine && "river" in mine && mine.river));
  const bonus = defending
    ? null
    : parts.map((p) => `+${Math.round(p.bonus * 100)}% ${p.kind === "terreno" ? `de ${TILE_LABEL[target.type].toLowerCase()}` : PART_LABEL[p.kind]}`).join(" y ");
  const verdict = defending ? (won ? "Aguantarías" : "Perderías la casilla") : won ? "Ganarías" : "No basta";
  return (
    <p className={`outlook ${won ? "good" : "bad"}`}>
      <strong>{verdict}:</strong> {mineTroops}
      {helpers > 0 && ` (${helpers} de apoyo)`} contra {hidden ? "lo que no ves" : otherTroops}
      {bonus && `, ${bonus}`}.
    </p>
  );
}
