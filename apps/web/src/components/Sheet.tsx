// Hoja que sube desde abajo, encima del mapa (bloque 6). Tres alturas: asomada
// (una línea), a media altura (lo principal) y estirada (todo). Se cambia
// arrastrando el asa o tocándola; al bajarla del todo se cierra la ficha.

import { forwardRef, useRef, type ReactNode } from "react";

export type SheetState = "peek" | "half" | "full";

/** Un arrastre de menos de esto es un toque en el asa. */
const TAP_PX = 6;
/** Velocidad (px/ms) a partir de la que un tirón cambia de altura aunque se suelte cerca. */
const FLICK = 0.5;

interface Props {
  state: SheetState;
  setState: (s: SheetState) => void;
  /** Cerrar la ficha (si hay algo abierto): la hoja vuelve a asomarse. */
  onClose?: () => void;
  label: string;
  /** Bloque 9: asomada, solo una línea (la de avisos). */
  compact?: boolean;
  children: ReactNode;
}

export const Sheet = forwardRef<HTMLElement, Props>(function Sheet({ state, setState, onClose, label, compact, children }, ref) {
  const drag = useRef<{ y: number; h: number; t: number; el: HTMLElement } | null>(null);
  const order: SheetState[] = ["peek", "half", "full"];
  const step = (d: 1 | -1) => order[Math.min(2, Math.max(0, order.indexOf(state) + d))]!;
  const go = (s: SheetState) => {
    if (s === "peek" && onClose) onClose();
    else setState(s);
  };

  return (
    <section className={`sheet ${state}${compact ? " compact" : ""}`} aria-label={label} ref={ref}>
      <div
        className="sheet-handle"
        role="button"
        tabIndex={0}
        aria-label={state === "full" ? "Encoger la ficha" : "Agrandar la ficha"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go(state === "full" ? "half" : step(1));
          }
        }}
        onPointerDown={(e) => {
          const el = e.currentTarget.parentElement!;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, h: el.getBoundingClientRect().height, t: e.timeStamp, el };
          el.classList.add("dragging");
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const max = d.el.parentElement!.clientHeight;
          d.el.style.height = `${Math.min(max, Math.max(40, d.h - (e.clientY - d.y)))}px`;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d) return;
          drag.current = null;
          d.el.classList.remove("dragging");
          d.el.style.height = "";
          const dy = e.clientY - d.y;
          if (Math.abs(dy) < TAP_PX) {
            go(state === "full" ? "half" : step(1));
            return;
          }
          const v = dy / Math.max(1, e.timeStamp - d.t);
          if (v < -FLICK) return go(step(1));
          if (v > FLICK) return go(step(-1));
          // Soltada despacio: la altura más cercana.
          const max = d.el.parentElement!.clientHeight;
          const h = d.h - dy;
          const heights: [SheetState, number][] = [
            ["peek", 0],
            ["half", max * 0.5],
            ["full", max],
          ];
          go(heights.reduce((a, b) => (Math.abs(b[1] - h) < Math.abs(a[1] - h) ? b : a))[0]);
        }}
        onPointerCancel={() => {
          if (drag.current) {
            drag.current.el.classList.remove("dragging");
            drag.current.el.style.height = "";
          }
          drag.current = null;
        }}
      >
        <span className="sheet-grip" aria-hidden />
      </div>
      {onClose && (
        <button className="sheet-close" onClick={onClose} aria-label="Cerrar la ficha">
          ✕
        </button>
      )}
      <div className="sheet-body">{children}</div>
    </section>
  );
});
