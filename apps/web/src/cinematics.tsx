// Bloque 13: las cinemáticas. Cada una es una lista de escenas con su dibujo
// (una función del tiempo sobre el lienzo de 160x176), su capa de texto en HTML,
// el pie de Fray Abundio y su duración. Añadir una es añadir datos y dibujos.

import type { ReactNode } from "react";
import type { CinematicItem, GameState } from "./api";
import { type Painter, hash } from "./art/cinema";
import * as pregon from "./art/pregonero";
import * as prologo from "./art/prologo";
import type { FrayMood } from "./art/sprites";
import { ShieldIcon } from "./art";
import { cinematicTitle } from "./cinematicQueue";
import { CinematicMap } from "./components/CinematicMap";

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

const NUMBER = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
/** Número en letra para las frases del cronista («Siete casas…»). */
export const inWords = (n: number) => NUMBER[n] ?? String(n);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Prólogo: la muerte del rey (punto 2 del bloque). Seis escenas, unos 45 segundos.

function prologueCinematic(item: CinematicItem, state: GameState): Cinematic {
  const n = state.casas.length;
  const weeks = state.partida.semanas;
  return {
    clave: item.clave,
    titulo: cinematicTitle(item),
    scenes: [
      {
        dur: 6,
        text: "Hubo una vez un rey.",
        fray: "solemne",
        label: "El mapa de Aldricia en sepia, con el título del juego",
        draw: prologo.mapBackdrop,
        overlay: (
          <>
            <CinematicMap state={state} mode="titulo" dur={6} />
            <div className="cine-title">
              <div className="big">
                Reyes de
                <br />
                Pacotilla
              </div>
              <div className="sub">Aldricia, el Reino Más o Menos Unido</div>
            </div>
          </>
        ),
      },
      {
        dur: 7,
        text: "El buen rey Aldric gobernó Aldricia cuarenta años, casi siempre desde la mesa.",
        fray: "solemne",
        label: "El rey Aldric come en el banquete, sentado en su trono",
        draw: prologo.banquet,
      },
      {
        dur: 7.5,
        text: "Hasta que un ave, ya asada, le plantó cara.",
        foot: "Nota del cronista: fue un combate singular. Quien hable de huesos será desterrado.",
        fray: "escandalizado",
        label: "El rey muerde el muslo, tose, se ahoga y cae tras la mesa; la corona rueda por el suelo",
        draw: prologo.bird,
        overlay: (
          <>
            <div className="cine-sfx one">¡Ghhk!</div>
            <div className="cine-sfx two">¡PLOF!</div>
            <div className="cine-flash" />
          </>
        ),
      },
      {
        dur: 8.5,
        text: "Su testamento cabía en una línea. Las llaves del tesoro, en ningún sitio.",
        foot: "El cronista no acusa a nadie. Tampoco a las ratas.",
        fray: "solemne",
        label: "El testamento del rey junto al trono vacío; una rata se lleva una llave",
        draw: prologo.testament,
        overlay: (
          <div className="cine-scroll">
            <span className="seal" />
            <h3>Testamento de Aldric I</h3>
            <div className="will">«Que gobierne el más capaz.»</div>
            <div className="sig">Aldric, rey (por la gracia de Dios y del pollo)</div>
            <div className="pd">P. D.: ¿Alguien ha visto las llaves del tesoro?</div>
          </div>
        ),
      },
      {
        dur: 8.5,
        text: `${capital(inWords(n))} casas se creyeron las más capaces.`,
        foot: `Las ${inWords(n)} se equivocaban, salvo una. El cronista aún no sabe cuál.`,
        fray: "adulador",
        label: `Los escudos de las ${n} casas de la partida`,
        draw: prologo.suitorsBackdrop,
        overlay: (
          <div className={`cine-suitors${n > 6 ? " many" : ""}`}>
            {state.casas.map((h, i) => (
              <div key={h.id} className="pre" style={{ "--i": i } as React.CSSProperties}>
                <ShieldIcon color={h.color} escudo={h.escudo} size={40} />
                <b>{h.nombre}</b>
                {h.lema && <em>«{h.lema}»</em>}
              </div>
            ))}
          </div>
        ),
      },
      {
        dur: 9.5,
        text: `Empieza el interregno. ${capital(inWords(weeks))} semanas, un trono vacío y ninguna llave.`,
        fray: "monedas",
        label: "El mapa de la partida: los castillos se encienden y se acerca el tuyo",
        draw: prologo.mapBackdrop,
        overlay: <CinematicMap state={state} mode="revelar" dur={9.5} />,
      },
    ],
  };
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
const PLEASED = new Set([
  "cosecha_gloriosa",
  "fiebre_oro",
  "fiesta_san_aldric",
  "carnaval",
  "limosna_real",
  "indulgencia_real",
  "levas_reales",
]);

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
export function buildCinematic(item: CinematicItem, state: GameState): Cinematic | null {
  switch (item.tipo) {
    case "evento":
      return item.datos ? eventCinematic(item) : null;
    case "prologo":
      return prologueCinematic(item, state);
    default:
      return null;
  }
}
