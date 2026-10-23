// El pergamino de un boletín de Fray Abundio (o de la Crónica Definitiva). Lo
// usan la pestaña Reino y la ventana emergente que sale al publicarse uno.
// Bloque 3: las casas que nombra salen en su color y, al tocarlas, enseñan su escudo.

import { useState } from "react";
import { bulletinText, houseInSentence, type Bulletin } from "@reyes/engine";
import type { GameState, HouseInfo } from "../api";
import { FrayAbundio, ShieldIcon } from "../art";
import { splitByHouses, withSquares } from "../houseText";
import { HOUSE_COLORS } from "../ui";

export type Shown = Bulletin & { erratas?: { casa: number; texto: string }[] };

export function Parchment({ bulletin: b, gameName, houses }: { bulletin: Shown; gameName: string; houses: GameState["casas"] }) {
  const [shield, setShield] = useState<HouseInfo | null>(null);
  // Bloque 3: al pie de la Crónica, la fe de erratas de los vencidos.
  const erratas = (b.erratas ?? []).map((e) => `«${e.texto}» (firma ${houseInSentence(houses.find((h) => h.id === e.casa)?.nombre ?? "una casa")})`);
  const text = bulletinText(b, gameName) + (erratas.length > 0 ? `\n\n*Fe de erratas*\n${erratas.map((l) => `• ${l}`).join("\n")}` : "");
  // Para WhatsApp, un cuadradito del color de cada casa delante de su nombre.
  const share = `https://wa.me/?text=${encodeURIComponent(withSquares(text, houses))}`;
  const line = (l: string) => <HouseText text={l} houses={houses} onHouse={(h) => setShield(shield?.id === h.id ? null : h)} />;
  return (
    <article className={b.chronicle ? "parchment chronicle" : "parchment"}>
      <header>
        <FrayAbundio mood={b.mood ?? "solemne"} size={64} />
        <div>
          <p className="parchment-kicker">
            {b.chronicle
              ? `Crónica Definitiva · ${gameName}`
              : `${b.edition === "miercoles" ? "Hoja volandera" : "Boletín del Reino"} · ${gameName} · semana ${b.week}`}
          </p>
          <h2>{b.headline}</h2>
        </div>
      </header>
      {shield && (
        <button className="house-card" onClick={() => setShield(null)} aria-label="Cerrar el escudo">
          <ShieldIcon color={shield.color} escudo={shield.escudo} size={48} />
          <span>
            <strong style={{ color: HOUSE_COLORS[shield.color]?.hex }}>{shield.nombre}</strong>
            {shield.lema && <em>«{shield.lema}»</em>}
          </span>
        </button>
      )}
      {b.margin.length > 0 && (
        <aside className="margin-notes" aria-label="Notas al margen">
          {b.margin.map((m, i) => (
            <p key={i}>✎ {line(m)}</p>
          ))}
        </aside>
      )}
      {b.sections.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          {s.lines.map((l, i) => (
            // Las proclamas, entre comillas, como citas; la entradilla y la nota del cronista, como el resto.
            <p key={i} className={s.verbatim && l.startsWith("«") ? "proclama" : undefined}>
              {line(l)}
            </p>
          ))}
        </section>
      ))}
      {erratas.length > 0 && (
        <section>
          <h3>Fe de erratas</h3>
          {erratas.map((l, i) => (
            <p key={i} className="proclama">
              {line(l)}
            </p>
          ))}
        </section>
      )}
      {b.sponsors.length > 0 && (
        <footer className="sponsors">
          <FrayAbundio mood="monedas" size={40} />
          {b.sponsors.map((s, i) => (
            <p key={i}>{line(s)}</p>
          ))}
        </footer>
      )}
      <p className="signature">Fray Abundio de la Pluma Larga, Cronista Mayor del Reino</p>
      <a className="button share" href={share} target="_blank" rel="noreferrer">
        Compartir en WhatsApp
      </a>
    </article>
  );
}

/** Una línea del cronista con cada casa en su color; al tocarla, su escudo. */
function HouseText({ text, houses, onHouse }: { text: string; houses: HouseInfo[]; onHouse: (h: HouseInfo) => void }) {
  return (
    <>
      {splitByHouses(text, houses).map((s, i) =>
        typeof s === "string" ? (
          s
        ) : (
          <button key={i} type="button" className="house-name" style={{ color: HOUSE_COLORS[s.house.color]?.hex }} onClick={() => onHouse(s.house)}>
            {s.text}
          </button>
        ),
      )}
    </>
  );
}
