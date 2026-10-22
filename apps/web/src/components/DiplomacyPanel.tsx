// Alianzas (bloque 8): pantalla sencilla. Propuestas recibidas y enviadas, tus
// alianzas (con las noches de aviso que quedan) y proponer una nueva con el
// nombre solemne que pone Fray Abundio. La bonita llega con los bloques 9 a 12.

import { useEffect, useState } from "react";
import { api, type GameState } from "../api";
import { ShieldIcon } from "../art";
import { formatShort, houseName, withArticle } from "../ui";

interface Props {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

export function DiplomacyPanel({ state, act }: Props) {
  const info = state.alianzas;
  const me = state.yo.casa;
  const gameId = state.partida.id;
  const active = state.partida.estado === "active";
  const [pick, setPick] = useState<number | "">("");
  const [name, setName] = useState<string | null>(null);
  const [breaking, setBreaking] = useState<number | null>(null);

  // El nombre lo pone Fray Abundio; se puede pedir otro antes de proponer.
  const reroll = async () => {
    try {
      setName((await api.allianceName(gameId)).nombre);
    } catch {
      setName(null);
    }
  };
  useEffect(() => {
    if (active && info?.activas && name == null) void reroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, info?.activas]);

  if (!info || !info.activas) return null;
  const house = (id: number) => state.casas.find((h) => h.id === id);
  const other = (pair: [number, number]) => (pair[0] === me ? pair[1] : pair[0]);
  const mine = info.lista.filter((a) => a.casas.includes(me));
  const realm = info.lista.filter((a) => !a.casas.includes(me));
  const received = info.propuestas.filter((p) => p.para === me);
  const sent = info.propuestas.filter((p) => p.de === me);
  // A quién se puede proponer: nadie con quien ya haya propuesta o alianza abierta.
  const busy = new Set([...mine.map((a) => other(a.casas)), ...info.propuestas.map((p) => (p.de === me ? p.para : p.de))]);
  const candidates = state.casas.filter((h) => h.id !== me && !busy.has(h.id));
  const left = (n: number | null) => (n == null ? null : n - state.partida.resolucionActual);
  const nights = (n: number) => `${n} ${n === 1 ? "noche" : "noches"}`;

  return (
    <section className="card diplomacy">
      <h2>Alianzas</h2>
      <p className="muted">
        Con una alianza hay paso libre por las casillas del aliado (nunca su castillo), visión compartida y no os podéis atacar. Si atacáis
        juntos la misma casilla, hay una sola batalla. Romperla no cuesta nada, pero dura {nights(info.nochesDeAviso)} más y quien rompe
        no firma otra en {info.diasSinFirmar} días.
      </p>

      {received.length > 0 && (
        <>
          <h3>Te proponen</h3>
          <ul className="list">
            {received.map((p) => (
              <li key={p.id} className="alliance-row">
                <ShieldIcon color={house(p.de)?.color ?? ""} escudo={house(p.de)?.escudo} size={26} />
                <span className="grow">
                  <strong>{houseName(state.casas, p.de)}</strong> te propone la <em>{p.nombre}</em>.{" "}
                  <small className="muted">Caduca tras la resolución {p.caducaTras}.</small>
                </span>
                {active && (
                  <span className="actions">
                    <button className="primary" onClick={() => act(() => api.acceptAlliance(gameId, p.id), `Firmada la ${p.nombre}.`)}>
                      Aceptar
                    </button>
                    <button onClick={() => act(() => api.declineAlliance(gameId, p.id), "Propuesta rechazada.")}>Rechazar</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {mine.length > 0 && (
        <>
          <h3>Tus alianzas</h3>
          <ul className="list">
            {mine.map((a) => {
              const ally = other(a.casas);
              const rest = left(a.terminaTras);
              return (
                <li key={a.id} className="alliance-row">
                  <ShieldIcon color={house(ally)?.color ?? ""} escudo={house(ally)?.escudo} size={26} />
                  <span className="grow">
                    <em>{a.nombre}</em> con <strong>{withArticle(houseName(state.casas, ally))}</strong>
                    <br />
                    <small className="muted">
                      {a.estado === "activa"
                        ? `En vigor${a.desde != null && a.desde > state.partida.resolucionActual ? " desde esta noche" : ""}.`
                        : `En aviso: ${a.rotaPor === me ? "la rompiste tú" : "la rompió"}; ${
                            rest != null && rest > 0 ? `quedan ${nights(rest)}` : "termina esta noche"
                          }. Solo podéis sacar las tropas de paso.`}
                    </small>
                  </span>
                  {active && a.estado === "activa" && (
                    <span className="actions">
                      {breaking === a.id ? (
                        <>
                          <button
                            className="danger"
                            onClick={() => {
                              setBreaking(null);
                              void act(() => api.breakAlliance(gameId, a.id), `Alianza rota: dura ${nights(info.nochesDeAviso)} más.`);
                            }}
                          >
                            Sí, romperla
                          </button>
                          <button className="link" onClick={() => setBreaking(null)}>
                            No
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setBreaking(a.id)}>Romper</button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {sent.length > 0 && (
        <>
          <h3>Has propuesto</h3>
          <ul className="list">
            {sent.map((p) => (
              <li key={p.id} className="alliance-row">
                <ShieldIcon color={house(p.para)?.color ?? ""} escudo={house(p.para)?.escudo} size={26} />
                <span className="grow">
                  La <em>{p.nombre}</em> a <strong>{withArticle(houseName(state.casas, p.para))}</strong>.{" "}
                  <small className="muted">Esperando respuesta; caduca tras la resolución {p.caducaTras}.</small>
                </span>
                {active && (
                  <button className="link" onClick={() => act(() => api.withdrawAlliance(gameId, p.id), "Propuesta retirada.")}>
                    Retirar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {active &&
        (info.sinFirmarHasta ? (
          <p className="muted">Rompiste una alianza hace poco: no puedes firmar otra hasta el {formatShort(info.sinFirmarHasta)}.</p>
        ) : candidates.length > 0 ? (
          <div className="propose">
            <h3>Proponer una alianza</h3>
            <label>
              A la casa
              <select value={pick} onChange={(e) => setPick(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Elige una casa…</option>
                {candidates.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nombre}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Nombre: <em>{name ?? "…"}</em>{" "}
              <button className="link" onClick={() => void reroll()}>
                Pedir otro a Fray Abundio
              </button>
            </p>
            <button
              className="primary"
              disabled={pick === "" || !name}
              onClick={() =>
                act(async () => {
                  await api.proposeAlliance(gameId, Number(pick), name!);
                  setPick("");
                  await reroll();
                }, "Propuesta enviada. Fray Abundio ya prepara la cera.")
              }
            >
              Proponer la alianza
            </button>
          </div>
        ) : null)}

      {realm.length > 0 && (
        <>
          <h3>En el reino</h3>
          <ul className="list compact">
            {realm.map((a) => (
              <li key={a.id}>
                <em>{a.nombre}</em>: {houseName(state.casas, a.casas[0])} y {withArticle(houseName(state.casas, a.casas[1]))}
                {a.estado === "aviso" && <small className="muted"> · rota, termina tras la resolución {a.terminaTras}</small>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
