// Bloque 13: las cinemáticas. Cada una es una lista de escenas con su dibujo
// (una función del tiempo sobre el lienzo de 160x176), su capa de texto en HTML,
// el pie de Fray Abundio y su duración. Añadir una es añadir datos y dibujos.

import { useEffect, useRef, type ReactNode } from "react";
import type { CinematicItem, CoronationInfo, GameState } from "./api";
import { type Painter, hash } from "./art/cinema";
import * as pregon from "./art/pregonero";
import * as prologo from "./art/prologo";
import * as coro from "./art/coronacionScene";
import type { FrayMood } from "./art/sprites";
import { ShieldIcon, shieldArt } from "./art";
import { cinematicTitle } from "./cinematicQueue";
import { HOUSE_COLORS, withArticle } from "./ui";
import { CinematicMap, type CinematicMapData } from "./components/CinematicMap";

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
// ---------------------------------------------------------------------------
// La coronación (punto 3): campanas, el mapa semana a semana, los objetivos
// secretos, los títulos, el podio y el fantasma de Aldric con la corona. La
// página pública del enlace la monta con los mismos datos.

export type CoronationData = CinematicMapData & { coronacion: CoronationInfo };

/**
 * Una hoja que no cabe sube despacio hasta enseñar la última fila, a partir de
 * `from` segundos y hasta `to`. Con «reducir movimiento» no se mueve: se desliza a mano.
 */
function Scroller({ className, from, to, children }: { className: string; from: number; to: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const b = box.current;
    const i = inner.current;
    if (!b || !i || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const extra = i.scrollHeight - b.clientHeight;
    if (extra <= 0) return;
    i.style.transition = `transform ${to - from}s linear ${from}s`;
    requestAnimationFrame(() => (i.style.transform = `translateY(${-extra - 8}px)`));
  }, [from, to]);
  return (
    <div className={className} ref={box}>
      <div className="cine-sheet-in" ref={inner}>
        {children}
      </div>
    </div>
  );
}

export function coronationCinematic(clave: string, titulo: string, data: CoronationData): Cinematic {
  const c = data.coronacion;
  const house = (id: number | null) => data.casas.find((h) => h.id === id);
  const order = c.clasificacion.map((r) => house(r.casa)).filter((h): h is NonNullable<typeof h> => !!h);
  const houses = order.length > 0 ? order : data.casas;
  const winner = house(c.ganador);
  const n = houses.length;
  const shield = (h: (typeof houses)[number]) => shieldArt(h.color, h.escudo);
  const podium = houses.slice(0, 3).map(shield);
  const winnerShield = winner ? shield(winner) : null;
  const weeks =
    c.semanas.length > 0
      ? c.semanas
      : [
          {
            semana: data.partida.semanas,
            duenos: (data.casillas ?? []).filter((t) => t.owner != null).map((t) => [t.id, t.owner!] as [number, number]),
          },
        ];
  const total = (id: number) => c.clasificacion.find((r) => r.casa === id)?.total ?? 0;
  const tag = (h: (typeof houses)[number]) => ({ "--c": HOUSE_COLORS[h.color]?.hex ?? "#f1cf7d" }) as React.CSSProperties;
  return {
    clave,
    titulo,
    scenes: [
      {
        dur: 6.5,
        text: "Suenan las campanas de Aldricia: el interregno ha terminado.",
        fray: "solemne",
        label: "Las campanas del campanario al amanecer; los pájaros salen volando",
        draw: coro.bells,
        overlay: (
          <>
            <div className="cine-sfx one">¡DONG!</div>
            <div className="cine-sfx two">¡DING!</div>
          </>
        ),
      },
      {
        dur: Math.min(12, Math.max(7, 2 + weeks.length * 1.3)),
        text: `${capital(inWords(data.partida.semanas))} semanas de tratos, asedios y promesas rotas.`,
        foot: "Ahora el mapa se ve entero: ya no queda nada que esconder.",
        fray: "solemne",
        label: "El mapa de Aldricia semana a semana, con el territorio de cada casa",
        draw: prologo.mapBackdrop,
        overlay: <CinematicMap state={data} mode="semanas" dur={Math.min(12, Math.max(7, 2 + weeks.length * 1.3))} weeks={weeks} />,
      },
      {
        dur: Math.max(7.5, 2.5 + n),
        text: "Las ambiciones ocultas, por fin a la vista.",
        foot: "Cada objetivo cumplido suma 6 de Prestigio.",
        fray: "escandalizado",
        label: "Los objetivos secretos de cada casa, cumplidos o no",
        draw: coro.sheetBackdrop,
        overlay: (
          <Scroller className={`cine-sheet${n > 6 ? " many" : ""}`} from={2} to={Math.max(7.5, 2.5 + n) - 1}>
            <h4>Objetivos secretos</h4>
            {houses.map((h, i) => (
              <div key={h.id} className="row" style={{ "--i": i } as React.CSSProperties}>
                <ShieldIcon color={h.color} escudo={h.escudo} size={28} />
                <div>
                  <b>{h.nombre}</b>
                  <span>{h.objetivo?.texto ?? "Sin objetivo."}</span>
                </div>
                {h.objetivo && <i className={`stamp ${h.objetivo.cumplido ? "ok" : "ko"}`}>{h.objetivo.cumplido ? "Cumplido +6" : "No"}</i>}
              </div>
            ))}
          </Scroller>
        ),
      },
      {
        dur: Math.max(9.5, 2.5 + n * 1.5),
        text: "Cada casa recibe el título que se ha ganado.",
        foot: "Con cariño. Casi siempre.",
        fray: "adulador",
        label: "El título de fin de partida de cada casa",
        draw: coro.sheetBackdrop,
        overlay: (
          <Scroller className={`cine-sheet titles${n > 6 ? " many" : ""}`} from={2.4} to={Math.max(9.5, 2.5 + n * 1.5) - 1}>
            <h4>Títulos del interregno</h4>
            {houses.map((h, i) => {
              const t = c.titulos.find((x) => x.casa === h.id);
              return (
                <div key={h.id} className="row" style={{ "--i": i } as React.CSSProperties}>
                  <ShieldIcon color={h.color} escudo={h.escudo} size={28} />
                  <div>
                    <b>{h.nombre}</b>
                    {t && <strong>{t.nombre}</strong>}
                    {t?.rey && <em>y Futuro Rey, según el cronista</em>}
                    {t && <small>{t.linea}</small>}
                  </div>
                </div>
              );
            })}
          </Scroller>
        ),
      },
      {
        dur: 7.5,
        text: "El Prestigio final, contado dos veces por el cronista.",
        fray: "adulador",
        label: "El podio con los escudos de las tres primeras casas",
        draw: (p, t) => coro.podium(p, t, podium),
        overlay: (
          <div className="cine-podnames">
            {[1, 0, 2].map((k) =>
              houses[k] ? (
                <div key={k} className={`pn p${k}`} style={tag(houses[k]!)}>
                  <span className="pos">{k + 1}.º</span>
                  <b>{houses[k]!.nombre}</b>
                  <span className="num">{total(houses[k]!.id)} de Prestigio</span>
                </div>
              ) : (
                <div key={k} className="pn" />
              ),
            )}
          </div>
        ),
      },
      {
        dur: 9.5,
        text: "El fantasma de Aldric baja la corona. Nadie se lo ha pedido.",
        foot: winner ? `¡Larga vida a ${withArticle(winner.nombre)}! El cronista siempre lo supo.` : undefined,
        fray: "adulador",
        label: "El fantasma del rey Aldric deja la corona sobre el escudo del ganador, en el trono",
        draw: (p, t) => coro.crowning(p, t, winnerShield),
        overlay: winner ? (
          <div className="cine-hail">
            ¡Larga vida a
            <br />
            {withArticle(winner.nombre)}!
          </div>
        ) : undefined,
      },
    ],
  };
}

export function buildCinematic(item: CinematicItem, state: GameState): Cinematic | null {
  switch (item.tipo) {
    case "coronacion":
      return state.coronacion ? coronationCinematic(item.clave, cinematicTitle(item), { ...state, coronacion: state.coronacion }) : null;
    case "evento":
      return item.datos ? eventCinematic(item) : null;
    case "prologo":
      return prologueCinematic(item, state);
    default:
      return null;
  }
}
