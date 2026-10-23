// Bloque 11: clasificación con podio para los tres primeros y el resto en
// lista, con flechas desde la noche anterior y una barra de distancia al primero.

import type { ReactNode } from "react";
import { Icon, ShieldIcon } from "../art";
import type { GameState } from "../api";
import { chaserLine, podiumLine, standings, type Standing } from "../realm";
import { ACHIEVEMENT_LABEL } from "../ui";
import { useOpenHouse } from "../houseSheet";

function Move({ move }: { move: number | null }) {
  if (move == null) return null;
  if (move === 0) return <span className="move same" title="Igual que anoche">=</span>;
  const up = move > 0;
  return (
    <span className={`move ${up ? "up" : "down"}`} title={`${up ? "Sube" : "Baja"} ${Math.abs(move)} desde anoche`}>
      {up ? "▲" : "▼"}
      {Math.abs(move)}
    </span>
  );
}

export function Standings({ state, children }: { state: GameState; children?: ReactNode }) {
  // Al tocar una casa, su ficha (bloque 11).
  const onPick = useOpenHouse();
  const rows = standings(state);
  const me = state.yo.casa;
  const final = !!state.partida.final;
  const top = Math.max(1, rows[0]?.total ?? 0);
  // El podio, en el orden de siempre: segundo, primero, tercero.
  const podium = [rows[1], rows[0], rows[2]].filter((r): r is Standing => !!r);
  const line = podiumLine(rows, me);
  const chaser = final ? null : chaserLine(rows, me);

  return (
    <section className="card standings">
      <h2>{final ? "Clasificación final" : "Clasificación de Prestigio"}</h2>
      <ol className="podium" aria-label="Podio">
        {podium.map((r) => (
          <li key={r.house.id} className={`step p${r.place}${r.house.id === me ? " me" : ""}`}>
            <button className="podium-house" onClick={() => onPick?.(r.house.id)} aria-label={`${r.place}.º ${r.house.nombre}, ${r.total} de Prestigio`}>
              {r.place === 1 && (
                <span className="podium-crown">
                  <Icon name="corona" size={28} />
                </span>
              )}
              <ShieldIcon color={r.house.color} escudo={r.house.escudo} size={r.place === 1 ? 64 : 48} />
              <strong className="podium-name">{r.house.nombre}</strong>
              <span className="podium-total">
                {r.total}
                <Move move={r.move} />
              </span>
            </button>
            <span className="podium-block" aria-hidden="true">
              {r.place}
            </span>
          </li>
        ))}
      </ol>
      {line && <p className="podium-line">{line}</p>}
      {chaser && <p className="podium-line chaser">{chaser}</p>}
      {rows.length > 3 && (
      <ol className="ranking" start={4}>
        {rows.slice(3).map((r) => (
          <li key={r.house.id} className={r.house.id === me ? "me" : ""}>
            <button className="row-button" onClick={() => onPick?.(r.house.id)}>
              <span className="rank">{r.place}</span>
              <ShieldIcon color={r.house.color} escudo={r.house.escudo} size={28} />
              <span className="grow">
                <strong>{r.house.nombre}</strong>
                {(r.house.logros ?? []).map((l) => (
                  <span key={l.clave} className="chip achievement">
                    {ACHIEVEMENT_LABEL[l.clave] ?? l.clave}
                    {l.veces > 1 && ` x${l.veces}`}
                  </span>
                ))}
                <span className="gap-bar" aria-hidden="true">
                  <span style={{ width: `${Math.round((100 * Math.max(0, r.total)) / top)}%` }} />
                </span>
                {r.behind > 0 && <small className="muted">a {r.behind} del primero</small>}
              </span>
              <Move move={r.move} />
              <strong>{r.total}</strong>
            </button>
          </li>
        ))}
      </ol>
      )}
      {children}
    </section>
  );
}
