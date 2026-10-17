// Creador de la casa: nombre, lema y escudo (forma, división, colores, símbolo y metal).
// Se usa al unirse a una partida y en la sala de espera.

import {
  DIVISION_LABEL,
  SHAPE_LABEL,
  SHIELD_DIVISIONS,
  SHIELD_METALS,
  SHIELD_SHAPES,
  SHIELD_SYMBOLS,
  SYMBOL_NAME,
  blazon,
} from "@reyes/engine";
import type { HouseForm, ShieldView } from "../api";
import { ShieldIcon } from "../art";
import { HOUSE_COLORS } from "../ui";

const SUGERENCIAS = [
  "Casa del Nabo Altivo",
  "Casa de los Siete Primos",
  "Casa del Pato Valiente",
  "Casa de la Bota Rota",
  "Casa del Queso Eterno",
  "Casa del Caracol Veloz",
];
const LEMAS = ["Nabus Vincit", "Ora et Comercia", "Veni, Vidi, Negocié", "Jamás retroceder", "Despacito y con buena letra", "Más vale pan que fama"];

export interface Taken {
  color: string;
  escudo?: ShieldView;
}

export const toShieldView = (f: HouseForm): ShieldView => ({
  forma: f.forma,
  division: f.division,
  color2: f.color2,
  simbolo: f.simbolo,
  metal: f.metal,
});

/** Primera propuesta: el primer color y la primera combinación libres. */
export function initialForm(taken: Taken[], casa = "", lema = ""): HouseForm {
  const color = Object.keys(HOUSE_COLORS).find((c) => !taken.some((t) => t.color === c)) ?? "";
  const forma = SHIELD_SHAPES[taken.length % SHIELD_SHAPES.length]!;
  const simbolo = SHIELD_SYMBOLS.find((s, i) => i >= (taken.length * 3) % 16 && !isTaken(taken, forma, s)) ?? SHIELD_SYMBOLS.find((s) => !isTaken(taken, forma, s))!;
  return { casa, lema, color, forma, division: "pleno", color2: null, simbolo, metal: "oro" };
}

function isTaken(taken: Taken[], forma: string, simbolo: string) {
  return taken.some((t) => t.escudo?.forma === forma && t.escudo?.simbolo === simbolo);
}

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;

export function HouseEditor({ value, onChange, taken }: { value: HouseForm; onChange: (f: HouseForm) => void; taken: Taken[] }) {
  const set = (patch: Partial<HouseForm>) => {
    const next = { ...value, ...patch };
    // Con división hace falta un segundo color distinto del primero.
    if (next.division === "pleno") next.color2 = null;
    else if (!next.color2 || next.color2 === next.color) {
      next.color2 = Object.keys(HOUSE_COLORS).find((c) => c !== next.color && c !== value.color2) ?? null;
    }
    onChange(next);
  };
  const shield = toShieldView(value);
  const symbolTaken = (s: string) => isTaken(taken, value.forma, s);
  const shapeTaken = (f: string) => isTaken(taken, f, value.simbolo);

  return (
    <div className="house-editor">
      <div className="shield-preview">
        <ShieldIcon color={value.color} escudo={shield} size={112} />
        <div>
          <strong>{value.casa || "Tu casa"}</strong>
          {value.lema && <em>«{value.lema}»</em>}
          <small className="muted">
            {value.color ? `Escudo ${blazon(value.color, value.simbolo, value.metal, value.division, value.color2)}.` : "Elige un color."}
          </small>
        </div>
      </div>

      <label>
        Nombre de tu casa
        <input value={value.casa} maxLength={20} onChange={(e) => set({ casa: e.target.value })} placeholder="Casa de…" required />
      </label>
      <button type="button" className="link" onClick={() => set({ casa: pick(SUGERENCIAS) })}>
        Sugiéreme un nombre
      </button>

      <fieldset>
        <legend>Color de tu casa</legend>
        <div className="colors">
          {Object.entries(HOUSE_COLORS).map(([key, c]) => {
            const busy = taken.some((t) => t.color === key);
            return (
              <button
                type="button"
                key={key}
                className={`color ${value.color === key ? "selected" : ""}`}
                style={{ background: c.hex }}
                disabled={busy}
                aria-pressed={value.color === key}
                aria-label={`${c.nombre}${busy ? " (ocupado)" : ""}`}
                onClick={() => set({ color: key })}
              >
                {busy && "✕"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend>Forma</legend>
        <div className="shield-options">
          {SHIELD_SHAPES.map((f) => (
            <button
              type="button"
              key={f}
              className={`shield-option ${value.forma === f ? "selected" : ""}`}
              aria-pressed={value.forma === f}
              disabled={shapeTaken(f)}
              onClick={() => set({ forma: f })}
            >
              <ShieldIcon color={value.color} escudo={{ ...shield, forma: f }} size={36} title="" />
              <span>{SHAPE_LABEL[f]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>División</legend>
        <div className="shield-options">
          {SHIELD_DIVISIONS.map((d) => (
            <button
              type="button"
              key={d}
              className={`shield-option ${value.division === d ? "selected" : ""}`}
              aria-pressed={value.division === d}
              onClick={() => set({ division: d })}
            >
              <ShieldIcon
                color={value.color}
                escudo={{ ...shield, division: d, color2: d === "pleno" ? null : (value.color2 ?? Object.keys(HOUSE_COLORS).find((c) => c !== value.color)!) }}
                size={36}
                title=""
              />
              <span>{DIVISION_LABEL[d]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {value.division !== "pleno" && (
        <fieldset>
          <legend>Segundo color</legend>
          <div className="colors">
            {Object.entries(HOUSE_COLORS)
              .filter(([key]) => key !== value.color)
              .map(([key, c]) => (
                <button
                  type="button"
                  key={key}
                  className={`color ${value.color2 === key ? "selected" : ""}`}
                  style={{ background: c.hex }}
                  aria-pressed={value.color2 === key}
                  aria-label={c.nombre}
                  onClick={() => set({ color2: key })}
                />
              ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Símbolo</legend>
        <div className="symbol-grid">
          {SHIELD_SYMBOLS.map((s) => {
            const busy = symbolTaken(s);
            return (
              <button
                type="button"
                key={s}
                className={`shield-option ${value.simbolo === s ? "selected" : ""}`}
                aria-pressed={value.simbolo === s}
                disabled={busy}
                aria-label={`${SYMBOL_NAME[s]}${busy ? " (otra casa ya lo lleva en esta forma)" : ""}`}
                onClick={() => set({ simbolo: s })}
              >
                <ShieldIcon color={value.color} escudo={{ ...shield, simbolo: s }} size={36} title="" />
                <span>{SYMBOL_NAME[s]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend>Metal del símbolo</legend>
        <div className="segmented">
          {SHIELD_METALS.map((m) => (
            <button type="button" key={m} className={value.metal === m ? "chosen" : ""} aria-pressed={value.metal === m} onClick={() => set({ metal: m })}>
              {m === "oro" ? "Oro" : "Plata"}
            </button>
          ))}
        </div>
      </fieldset>

      <label>
        Lema (opcional)
        <input value={value.lema ?? ""} maxLength={40} onChange={(e) => set({ lema: e.target.value })} placeholder="Nabus Vincit" />
      </label>
      <button type="button" className="link" onClick={() => set({ lema: pick(LEMAS) })}>
        Sugiéreme un lema
      </button>
    </div>
  );
}
