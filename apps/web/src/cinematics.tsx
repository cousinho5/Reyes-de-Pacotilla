// Bloque 13: las cinemáticas. Cada una es una lista de escenas con su dibujo
// (una función del tiempo sobre el lienzo de 160x176), su capa de texto en HTML,
// el pie de Fray Abundio y su duración. Añadir una es añadir datos y dibujos.

import type { ReactNode } from "react";
import type { CinematicItem, GameState } from "./api";
import { type Painter, hash } from "./art/cinema";
import * as pregon from "./art/pregonero";
import type { FrayMood } from "./art/sprites";
import { cinematicTitle } from "./cinematicQueue";

export interface Scene {
  /** Segundos que dura antes de pasar sola a la siguiente. */
  dur: number;
  /** Lo que dice Fray Abundio debajo. */
  text: string;
  /** Nota del cronista, en cursiva. */
  foot?: string;
  fray: FrayMood;
  draw: (p: Painter, t: number) => void;
  /** Texto encima del dibujo (nunca dentro de él), con sus animaciones en CSS. */
  overlay?: ReactNode;
  /** Nombre de la escena para los lectores de pantalla. */
  label: string;
}

export interface Cinematic {
  clave: string;
  titulo: string;
  scenes: Scene[];
}

// ---------------------------------------------------------------------------
// El pregonero: la viñeta común de los eventos de la semana.

function drawCrier(p: Painter, t: number, asleep = false) {
  p.img(pregon.plaza, 0, 0);
  p.shadow(25, 159, 8, 1.5);
  p.shadow(135, 160, 8, 1.5);
  p.shadow(80, 160, 15, 2);
  // Tañe la campana cuatro veces por segundo; dormido, la baja y se queda quieto.
  const ringing = !asleep || t < 3;
  const f = ringing ? Math.floor(t * 4) % 2 : 1;
  p.img(pregon.aldeano_asiente[Math.floor(t * 2) % 2]!, 15, 123);
  p.img(pregon.aldeana, 125, 124);
  p.img(pregon.pregonero[f]!, 61, 102);
  if (ringing && f === 0) {
    p.g.strokeStyle = "#d8eefa";
    p.g.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      p.g.beginPath();
      p.g.arc(93.5, 107.5, 6 + i * 4, -Math.PI / 3, 0);
      p.g.stroke();
    }
  }
  // Polvo de la plaza al sol.
  for (let i = 0; i < 8; i++) {
    const ph = (t * 0.1 + hash(i, 1)) % 1;
    p.px(20 + hash(i, 2) * 120, 150 - ph * 30, `rgba(255,250,220,${0.5 * (1 - ph)})`);
  }
}

const SCANDAL = new Set(["plaga_ratas", "tormenta_costa", "derrumbe", "bandidos", "tributo_rey", "paga_atrasada"]);
const PLEASED = new Set(["cosecha_gloriosa", "fiebre_oro", "fiesta_san_aldric", "carnaval", "limosna_real", "indulgencia_real", "levas_reales"]);

function eventCinematic(item: CinematicItem): Cinematic {
  const d = item.datos as { clave: string; nombre: string; texto: string; linea: string };
  const quiet = d.clave === "semana_tranquila";
  const mood: FrayMood = quiet ? "dormido" : SCANDAL.has(d.clave) ? "escandalizado" : PLEASED.has(d.clave) ? "adulador" : "solemne";
  return {
    clave: item.clave,
    titulo: cinematicTitle(item),
    scenes: [
      {
        dur: 7.5,
        text: d.linea,
        fray: mood,
        label: `El pregonero lee el bando: ${d.nombre}`,
        draw: (p, t) => drawCrier(p, t, quiet),
        overlay: (
          <>
            <div className="cine-bando">
              <small>Bando del martes · semana {item.semana}</small>
              <b>{d.nombre}</b>
              <span>{d.texto}</span>
            </div>
            {quiet && (
              <span className="cine-zzz" aria-hidden="true">
                Zzz
              </span>
            )}
          </>
        ),
      },
    ],
  };
}

/** La cinemática de un elemento de la lista, o null si este cliente aún no sabe dibujarla. */
export function buildCinematic(item: CinematicItem, _state: GameState): Cinematic | null {
  switch (item.tipo) {
    case "evento":
      return item.datos ? eventCinematic(item) : null;
    default:
      return null;
  }
}
