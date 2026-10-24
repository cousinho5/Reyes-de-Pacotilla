// Bloque 11: ficha de una casa, en una hoja que sube desde abajo. Se abre al
// tocar una casa en Reino, su escudo en el mapa o en Comercio. Solo lo que tu
// casa puede saber de las demás: nada de tropas ni recursos ajenos; el objetivo
// secreto, solo en la tuya.

import { useEffect, useState } from "react";
import { api, type GameState, type HouseInfo } from "../api";
import { BotMark, ShieldIcon } from "../art";
import { involves, standings } from "../realm";
import { describeEvent, withArticle } from "../ui";
import { Sheet, type SheetState } from "./Sheet";

/** De dónde sale el Prestigio, en el orden y el color de la barra. */
const PARTS: { key: keyof NonNullable<HouseInfo["prestigio"]>; name: string; color: string }[] = [
  { key: "territorio", name: "Territorio", color: "#5d8a3a" },
  { key: "edificios", name: "Edificios", color: "#8a5a2e" },
  { key: "riqueza", name: "Riqueza", color: "#c99a2e" },
  { key: "comercio", name: "Comercio", color: "#2e6a8a" },
  { key: "logros", name: "Logros", color: "#7a3e8a" },
  { key: "asedios", name: "Asedios", color: "#6b6b6b" },
  { key: "gloria", name: "Gloria", color: "#a8321f" },
  { key: "objetivo", name: "Objetivo", color: "#1f1f24" },
];

interface Props {
  state: GameState;
  house: number;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
  onClose: () => void;
  /** «Ver en el mapa»: lleva al castillo de la casa. */
  onShowMap?: (tile: number) => void;
}

export function HouseSheet({ state, house: id, act, onClose, onShowMap }: Props) {
  const [sheet, setSheet] = useState<SheetState>("half");
  const h = state.casas.find((c) => c.id === id);
  if (!h) return null;
  const me = state.yo.casa;
  const mine = id === me;
  const row = standings(state).find((r) => r.house.id === id);
  const p = h.prestigio;
  const parts = p ? PARTS.map((x) => ({ ...x, value: Number(p[x.key] ?? 0) })).filter((x) => x.value > 0) : [];
  const sum = parts.reduce((a, b) => a + b.value, 0);
  const castle = (state.casillas ?? []).find((t) => t.type === "castillo" && t.castleOf === id);
  const recent = (state.eventos ?? [])
    .filter((e) => !e.privado && e.tipo !== "movimiento" && involves(e, id))
    .map((e) => ({ id: e.id, night: e.resolucion, text: describeEvent(e, state.casas, state.casillas ?? []) }))
    .filter((e) => e.text)
    .slice(0, 3);
  const c = h.cifras;

  return (
    <div className="sheet-layer house-layer">
      <Sheet state={sheet} setState={setSheet} onClose={onClose} label={`Ficha de ${h.nombre}`}>
        <section className="card house-sheet">
          <header className="house-head">
            <ShieldIcon color={h.color} escudo={h.escudo} size={64} />
            <div>
              <h2>{h.nombre}</h2>
              {h.lema && <p className="house-motto">«{h.lema}»</p>}
              {h.bot && (
                <p className="house-bot">
                  <BotMark size={20} /> Casa gobernada por su mayordomo
                </p>
              )}
              {row && (
                <p className="house-place">
                  {row.place}.º de {state.casas.length} · <strong>{row.total}</strong> de Prestigio
                  {row.move != null && row.move !== 0 && (
                    <span className={`move ${row.move > 0 ? "up" : "down"}`}>
                      {" "}
                      {row.move > 0 ? "▲" : "▼"}
                      {Math.abs(row.move)}
                    </span>
                  )}
                </p>
              )}
            </div>
          </header>

          {c && (
            <dl className="house-figures">
              <div>
                <dt>Casillas</dt>
                <dd>{c.casillas}</dd>
              </div>
              <div>
                <dt>Edificios</dt>
                <dd>{c.edificios}</dd>
              </div>
              <div>
                <dt>Gloria</dt>
                <dd>{c.gloria}</dd>
              </div>
              <div>
                <dt>Asedios</dt>
                <dd>{c.asedios}</dd>
              </div>
            </dl>
          )}

          {sum > 0 && (
            <>
              <h3>De dónde sale {mine ? "tu" : "su"} Prestigio</h3>
              <div className="prestige-bar" role="img" aria-label={parts.map((x) => `${x.name} ${x.value}`).join(", ")}>
                {parts.map((x) => (
                  <span key={x.key} style={{ flexGrow: x.value, background: x.color }} />
                ))}
              </div>
              <ul className="prestige-legend">
                {parts.map((x) => (
                  <li key={x.key}>
                    <span className="mention-dot" style={{ background: x.color }} aria-hidden="true" />
                    {x.name} <strong>{x.value}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {mine ? <MyObjective state={state} /> : <Relation state={state} house={h} />}

          {recent.length > 0 && (
            <>
              <h3>Lo último</h3>
              <ul className="list compact">
                {recent.map((e) => (
                  <li key={e.id}>
                    {e.night != null && <small className="muted">Noche {e.night} · </small>}
                    {e.text}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="actions house-actions">
            {castle && onShowMap && <button onClick={() => onShowMap(castle.id)}>Ver en el mapa</button>}
            {!mine && <ProposeAlliance state={state} house={h} act={act} />}
          </div>
        </section>
      </Sheet>
    </div>
  );
}

function MyObjective({ state }: { state: GameState }) {
  const o = state.yo.objetivo;
  if (!o?.elegido) return null;
  return (
    <>
      <h3>Tu objetivo secreto</h3>
      <p>
        {o.elegido.texto}{" "}
        <small className="muted">{o.cumplido == null ? "(solo lo ves tú; se revela al final)" : o.cumplido ? "(cumplido, +6)" : "(sin cumplir)"}</small>
      </p>
    </>
  );
}

/** Qué relación tiene esa casa con la tuya. Todo sale de sucesos públicos. */
function Relation({ state, house: h }: { state: GameState; house: HouseInfo }) {
  const me = state.yo.casa;
  const info = state.alianzas?.activas ? state.alianzas : null;
  const pact = info?.lista.find((a) => a.casas.includes(me) && a.casas.includes(h.id));
  const asked = info?.propuestas.find((p) => (p.de === h.id && p.para === me) || (p.de === me && p.para === h.id));
  const r = h.relacion;
  const myCaptain = state.casas.find((c) => c.id === me)?.capitan;
  const lines: string[] = [];
  if (pact) {
    lines.push(
      pact.estado === "activa"
        ? `Aliados en la ${pact.nombre}.`
        : `La ${pact.nombre} está rota: termina tras la resolución ${pact.terminaTras}.`,
    );
  } else if (asked) {
    lines.push(asked.de === me ? `Le has propuesto la ${asked.nombre}.` : `Te propone la ${asked.nombre}. Respóndele en Diplomacia.`);
  }
  if (r) {
    const fought = r.ganadas + r.perdidas;
    lines.push(
      fought === 0
        ? "Nunca habéis cruzado espadas."
        : `Batallas entre vosotros: ${r.ganadas} ${r.ganadas === 1 ? "ganada" : "ganadas"} y ${r.perdidas} ${r.perdidas === 1 ? "perdida" : "perdidas"}.`,
    );
    lines.push(r.tratos === 0 ? "Ningún trato cerrado." : `${r.tratos} ${r.tratos === 1 ? "trato cerrado" : "tratos cerrados"}.`);
  }
  if (h.capitan?.presoDe === me) lines.push(`Tienes preso a su capitán, ${h.capitan.nombre}.`);
  if (myCaptain?.presoDe === h.id) lines.push(`Tiene preso a tu capitán, ${myCaptain.nombre}.`);
  if (lines.length === 0) return null;
  return (
    <>
      <h3>Contigo</h3>
      <ul className="list compact">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </>
  );
}

/** «Proponer alianza» desde la ficha, con el nombre solemne que pone Fray Abundio. */
function ProposeAlliance({ state, house: h, act }: { state: GameState; house: HouseInfo; act: Props["act"] }) {
  const info = state.alianzas;
  const me = state.yo.casa;
  const [name, setName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const reroll = () =>
    api
      .allianceName(state.partida.id)
      .then((r) => setName(r.nombre))
      .catch(() => setName(null));
  useEffect(() => {
    if (open && name == null) void reroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!info?.activas || state.partida.estado !== "active") return null;
  const busy =
    info.lista.some((a) => a.casas.includes(me) && a.casas.includes(h.id)) ||
    info.propuestas.some((p) => (p.de === me && p.para === h.id) || (p.de === h.id && p.para === me));
  if (busy || info.sinFirmarHasta) return null;
  if (!open) return <button onClick={() => setOpen(true)}>Proponer alianza</button>;
  return (
    <div className="propose">
      <p>
        La <em>{name ?? "…"}</em> con {withArticle(h.nombre)}.{" "}
        <button className="link" onClick={() => void reroll()}>
          Otro nombre
        </button>
      </p>
      <button
        className="primary"
        disabled={!name}
        onClick={() => act(() => api.proposeAlliance(state.partida.id, h.id, name!), "Propuesta enviada. Fray Abundio ya prepara la cera.")}
      >
        Proponer la alianza
      </button>
    </div>
  );
}
