import { ENAMEL, Icon, ResourceIcon, shieldArt } from "../art";
import { MercenariesCard } from "./MercenariesCard";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDINGS,
  BUILDING_PRODUCTION,
  BUILDING_RESOURCE,
  FORTIFY_UPKEEP,
  PRESTIGE,
  RESOURCES,
  UNIT_KINDS,
  canAfford,
  castleStage,
  recruitCost as costOf,
  upgradeCost,
  unitsOf,
  type BuildingKind,
  type Resource,
  type Resources,
  type UnitKind,
} from "@reyes/engine";
import { api, type GameState, type HouseInfo } from "../api";
import { buildingSprite, lightAt, spriteImage, type SceneTarget } from "../art/castleScene";
import { BUILDING_LABEL, RESOURCE_LABEL, UNIT_LABEL, UNIT_NOTE, UNIT_ONE, houseName } from "../ui";
import { CardsPanel } from "./CardsPanel";
import { CastleScene } from "./CastleScene";
import { HouseSettings, SecretObjective } from "./HouseSettings";
import { Sheet, type SheetState } from "./Sheet";

interface Props {
  state: GameState;
  gameId: number;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

function Cost({ cost }: { cost: Partial<Resources> }) {
  return (
    <>
      {RESOURCES.filter((r) => cost[r]).map((r) => (
        <span key={r} className={`res res-${r}`}>
          <ResourceIcon r={r} size={14} /> {cost[r]} <span className="sr-only">{RESOURCE_LABEL[r]}</span>
        </span>
      ))}
    </>
  );
}

/** Día de la semana dentro de `days` días, en la hora de la partida («mañana», «el jueves»). */
function whenIn(days: number, state: GameState): string {
  if (days <= 1) return "mañana";
  const now = state.prueba?.ahora ? Date.parse(state.prueba.ahora) : Date.now();
  const tz = state.partida.zonaHoraria;
  const day = new Intl.DateTimeFormat("es-ES", { weekday: "long", ...(tz ? { timeZone: tz } : {}) }).format(new Date(now + days * 864e5));
  return days < 7 ? `el ${day}` : `en ${days} días`;
}

/** La hora en la partida (con el reloj de las partidas de prueba). */
function hourIn(state: GameState): number {
  const now = state.prueba?.ahora ? Date.parse(state.prueba.ahora) : Date.now();
  const tz = state.partida.zonaHoraria;
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", ...(tz ? { timeZone: tz } : {}) }).format(new Date(now)));
}

/** El nivel en cinco puntos. */
function LevelPips({ level }: { level: number }) {
  return (
    <span className="level-pips" aria-label={`nivel ${level} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= level ? "on" : ""} aria-hidden />
      ))}
    </span>
  );
}

/** El dibujo de la escena en pequeño (lista de edificios). */
function BuildingThumb({ kind, level, color }: { kind: BuildingKind; level: number; color: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useMemo(() => spriteImage(buildingSprite(kind, level), color), [kind, level, color]);
  useEffect(() => {
    canvas.current?.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(img.rgba), img.w, img.h), 0, 0);
  }, [img]);
  return <canvas ref={canvas} className="building-thumb" width={img.w} height={img.h} aria-hidden />;
}

/** Ficha de un edificio (bloque 2): lo que produce, lo que daría el nivel siguiente, el coste y Mejorar. */
function BuildingSheet({ kind, state, gameId, act }: Props & { kind: BuildingKind }) {
  const res = state.yo.recursos!;
  const prod = state.yo.produccionDiaria!;
  const level = state.yo.edificios![kind];
  const r = BUILDING_RESOURCE[kind] as Resource;
  const cost = upgradeCost(level);
  const active = state.partida.estado === "active";
  const missing = cost ? RESOURCES.filter((k) => (cost[k] ?? 0) > res[k]) : [];
  const notMade = missing.filter((k) => prod[k] <= 0);
  const days = Math.max(0, ...missing.map((k) => (prod[k] > 0 ? Math.ceil(((cost![k] ?? 0) - res[k]) / prod[k]) : 0)));
  const prestige = level + 1 === 5 ? PRESTIGE.perLevelAboveOne + PRESTIGE.perLevelFiveBuilding : PRESTIGE.perLevelAboveOne;
  return (
    <div className="building-sheet">
      <h2>
        {BUILDING_LABEL[kind]} <LevelPips level={level} />
      </h2>
      <p className="building-yield">
        <ResourceIcon r={r} size={16} /> +{BUILDING_PRODUCTION[level]} de {RESOURCE_LABEL[r]} al día
        {cost && (
          <>
            {" "}
            → <strong>+{BUILDING_PRODUCTION[level + 1]}</strong> en el nivel {level + 1}, y +{prestige} de Prestigio
          </>
        )}
      </p>
      {cost ? (
        <>
          <ul className="cost-list">
            {RESOURCES.filter((k) => cost[k]).map((k) => {
              const short = (cost[k] ?? 0) - res[k];
              return (
                <li key={k} className={short > 0 ? "short" : ""}>
                  <ResourceIcon r={k} size={16} /> {cost[k]} de {RESOURCE_LABEL[k]}
                  <small>{short > 0 ? ` · te faltan ${short}` : " · lo tienes"}</small>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <p className="hint">
              {notMade.length > 0
                ? `No produces ${notMade.map((k) => RESOURCE_LABEL[k]).join(" ni ")}: tendrás que conseguirlo en Comercio.`
                : `Con lo que produces, lo tendrás ${whenIn(days, state)}.`}
            </p>
          )}
          <button
            className="primary wide"
            disabled={missing.length > 0 || !active}
            onClick={() =>
              act(() => api.upgrade(gameId, kind), `${BUILDING_LABEL[kind]} sube a nivel ${level + 1}. Las obras han terminado a tiempo, cosa nunca vista.`)
            }
          >
            Mejorar a nivel {level + 1}
          </button>
        </>
      ) : (
        <p className="note">Nivel máximo: una obra maestra. Ni el rey Aldric tuvo una igual.</p>
      )}
    </div>
  );
}

export function CastlePanel({ state, gameId, act }: Props) {
  const res = state.yo.recursos!;
  const prod = state.yo.produccionDiaria!;
  const levels = state.yo.edificios!;
  const me = state.casas.find((h) => h.id === state.yo.casa);
  const color = ENAMEL[me?.color ?? ""] ?? "#b3291d";
  const shield = useMemo(() => shieldArt(me?.color ?? "gules", me?.escudo), [me?.color, JSON.stringify(me?.escudo ?? null)]);
  const [picked, setPicked] = useState<SceneTarget | null>(null);
  const [sheet, setSheet] = useState<SheetState>("full");
  // La hoja se abre justo debajo de la escena, que sube arriba del todo para que se vea lo elegido.
  const scene = useRef<HTMLDivElement>(null);
  const [sheetTop, setSheetTop] = useState(0);
  const active = state.partida.estado === "active";
  const forts = (state.casillas ?? []).filter(
    (t) => t.owner === state.yo.casa && t.fortifiedUntil != null && t.fortifiedUntil > state.partida.resolucionActual,
  ).length;

  const light = lightAt(hourIn(state));
  const siege = (state.casillas ?? []).find((t) => t.castleOf === state.yo.casa)?.besiegedBy;
  const besieger = siege != null ? ENAMEL[state.casas.find((h) => h.id === siege)?.color ?? ""] ?? null : null;

  const pick = (t: SceneTarget) => {
    const el = scene.current;
    if (el) {
      // Justo debajo de la barra de arriba, que se queda fija.
      const bar = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - bar, behavior: "instant" });
      setSheetTop(Math.max(0, el.getBoundingClientRect().bottom));
    }
    setPicked(t);
    setSheet("full");
  };

  // Bloque 2: escena, lo del día, Edificios, Reclutar, Mercenarios, Capitán, Cartas, Objetivo y, plegados, los ajustes.
  return (
    <div>
      <CastleScene
        ref={scene}
        stage={castleStage(levels)}
        levels={levels}
        color={color}
        shield={shield}
        selected={picked}
        onPick={pick}
        light={light}
        besieger={besieger}
      />

      <p className="day-bar" aria-label="Lo que entra cada día">
        {RESOURCES.map((r) => (
          <span key={r}>
            <ResourceIcon r={r} size={14} /> +{prod[r]}
            <span className="sr-only"> de {RESOURCE_LABEL[r]}</span>
          </span>
        ))}
        <small>al día</small>
      </p>
      <p className="muted day-note">
        El domingo pagarás {state.yo.mantenimientoSemanal} de Pan de mantenimiento. Si no llega, desertan tropas.
        {forts > 0 && (FORTIFY_UPKEEP.piedra ?? 0) > 0 && (
          <>
            {" "}
            Y {forts * (FORTIFY_UPKEEP.piedra ?? 0)} de Piedra por {forts === 1 ? "tu casilla fortificada" : `tus ${forts} casillas fortificadas`}: si no llega, se desmantelan las que no se puedan pagar.
          </>
        )}
        {state.yo.ayudaAlUltimo && <> La Corona te ayuda esta semana: +3 de {RESOURCE_LABEL[state.yo.ayudaAlUltimo]} al día.</>}
      </p>

      <section className="card">
        <h2>Edificios</h2>
        <ul className="list buildings">
          {BUILDINGS.map((b) => {
            const level = levels[b];
            const cost = upgradeCost(level);
            const affordable = cost ? canAfford(res, cost) : false;
            const r = BUILDING_RESOURCE[b] as Resource;
            return (
              <li key={b}>
                <button className="building-row" onClick={() => pick(b)} aria-label={`Ficha de ${BUILDING_LABEL[b]}, nivel ${level}`}>
                  <BuildingThumb kind={b} level={level} color={color} />
                  <span>
                    <strong>{BUILDING_LABEL[b]}</strong> <LevelPips level={level} />
                    <br />
                    <small>
                      <ResourceIcon r={r} size={14} /> +{BUILDING_PRODUCTION[level]} de {RESOURCE_LABEL[r]} al día
                    </small>
                    <br />
                    {cost ? (
                      <small className="row-cost">
                        {RESOURCES.filter((k) => cost[k]).map((k) => (
                          <span key={k} className={(cost[k] ?? 0) > res[k] ? "short" : ""}>
                            <ResourceIcon r={k} size={14} /> {cost[k]}
                            <span className="sr-only"> de {RESOURCE_LABEL[k]}</span>
                          </span>
                        ))}
                      </small>
                    ) : (
                      <small>Nivel máximo. Una obra maestra.</small>
                    )}
                  </span>
                </button>
                {cost && (
                  <button
                    disabled={!affordable || !active}
                    onClick={() => act(() => api.upgrade(gameId, b), `${BUILDING_LABEL[b]} sube a nivel ${level + 1}. Las obras han terminado a tiempo, cosa nunca vista.`)}
                  >
                    Mejorar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <RecruitCard state={state} gameId={gameId} act={act} />

      <MercenariesCard state={state} act={act} />

      <CaptainCard state={state} gameId={gameId} act={act} />

      <CardsPanel state={state} act={act} />

      <SecretObjective state={state} act={act} />

      <HouseSettings state={state} act={act}>
        <section>
          <h3>La Corona</h3>
          <label>
            Si algún domingo vas último, la Corona te ayudará con:
            <select
              value={state.yo.recursoAyuda ?? "pan"}
              onChange={(e) => act(() => api.setHelp(gameId, e.target.value as Resource), "Preferencia guardada.")}
            >
              {RESOURCES.map((r) => (
                <option key={r} value={r}>
                  {RESOURCE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </section>
      </HouseSettings>

      {picked && (
        <div className="sheet-layer" style={{ top: sheetTop }}>
          <Sheet
            state={sheet}
            setState={setSheet}
            onClose={() => setPicked(null)}
            label={picked === "castillo" ? "Reclutar en el castillo" : `Ficha de ${BUILDING_LABEL[picked]}`}
          >
            {picked === "castillo" ? (
              <RecruitCard state={state} gameId={gameId} act={act} inSheet />
            ) : (
              <BuildingSheet kind={picked} state={state} gameId={gameId} act={act} />
            )}
          </Sheet>
        </div>
      )}
    </div>
  );
}

/** Reclutar en el castillo o en una aldea propia (en la lista y en la hoja del castillo). */
function RecruitCard({ state, gameId, act, inSheet }: Props & { inSheet?: boolean }) {
  const res = state.yo.recursos!;
  const [recruit, setRecruit] = useState(5);
  const [kind, setKind] = useState<UnitKind>("mesnada");
  const one = costOf(1, kind);
  const myCastle = state.casillas?.find((t) => t.type === "castillo" && t.owner === state.yo.casa);
  // Bloque 1: también se recluta en las aldeas propias.
  const villages = (state.casillas ?? []).filter((t) => t.type === "aldea" && t.owner === state.yo.casa);
  const [siteId, setSiteId] = useState<number | null>(null);
  const site = villages.find((t) => t.id === siteId) ?? null;
  const active = state.partida.estado === "active";
  const maxRecruit = Math.max(
    1,
    Math.min(50, ...(Object.entries(one) as [Resource, number][]).map(([r, v]) => Math.floor(res[r] / v))),
  );
  const count = Math.min(recruit, maxRecruit);
  const recruitCost: Partial<Resources> = costOf(count, kind);
  const where = site ?? myCastle;
  const garrison = where && where.troops != null ? unitsOf({ ...where, troops: where.troops }) : null;
  const place = site ? `en ${site.nombre}` : "en el castillo";

  return (
    <section className={inSheet ? "recruit-sheet" : "card"}>
      <h2>Reclutar</h2>
      {villages.length > 0 && (
        <div className="unit-picker" role="radiogroup" aria-label="Dónde reclutar">
          {[null, ...villages].map((v) => (
            <button
              key={v?.id ?? "castillo"}
              role="radio"
              aria-checked={(v?.id ?? null) === (site?.id ?? null)}
              className={(v?.id ?? null) === (site?.id ?? null) ? "chosen" : ""}
              onClick={() => setSiteId(v?.id ?? null)}
            >
              {v ? v.nombre : "Castillo"}
            </button>
          ))}
        </div>
      )}
      <p className="muted">
        Las tropas aparecen {site ? `en tu aldea, ${site.nombre}` : "en tu castillo"}
        {garrison
          ? ` (ahora: ${garrison.mesnada} de Mesnada, ${garrison.jinetes} ${garrison.jinetes === 1 ? "jinete" : "jinetes"} y ${garrison.catapultas} ${garrison.catapultas === 1 ? "catapulta" : "catapultas"}).`
          : "."}
      </p>
      <div className="unit-picker" role="radiogroup" aria-label="Tipo de tropa">
        {UNIT_KINDS.map((k) => (
          <button key={k} role="radio" aria-checked={kind === k} className={kind === k ? "chosen" : ""} onClick={() => setKind(k)}>
            {UNIT_LABEL[k]}
          </button>
        ))}
      </div>
      <p className="muted unit-note">
        {UNIT_NOTE[kind]} Cada {UNIT_ONE[kind]}: <Cost cost={one} />
      </p>
      <label>
        {UNIT_LABEL[kind]}: <strong>{count}</strong>
        <input type="range" min={1} max={maxRecruit} value={count} onChange={(e) => setRecruit(Number(e.target.value))} />
      </label>
      <p>
        Coste: <Cost cost={recruitCost} />
      </p>
      <button
        className="primary"
        disabled={!canAfford(res, recruitCost) || !active}
        onClick={() =>
          act(
            () => api.recruit(gameId, count, kind, site?.id),
            kind === "mesnada"
              ? `${count} ${count === 1 ? "soldado se presenta" : "soldados se presentan"} ${place}.`
              : kind === "jinetes"
                ? `${count} ${count === 1 ? "jinete llega" : "jinetes llegan"} ${site ? `a ${site.nombre}` : "al castillo"}.`
                : `${count} ${count === 1 ? "catapulta llega" : "catapultas llegan"} ${site ? `a ${site.nombre}` : "al castillo"}, crujiendo.`,
          )
        }
      >
        Reclutar
      </button>
    </section>
  );
}

/** Un Capitán que tienes preso: su rescate (pedir o cambiar el precio) y soltarlo. */
function Prisoner({ house: h, gameId, act, active }: { house: HouseInfo; gameId: number; act: Props["act"]; active: boolean }) {
  const asked = h.capitan!.rescate ?? null;
  const [price, setPrice] = useState(asked ?? 20);
  return (
    <li className="prisoner">
      <span>
        {h.capitan!.nombre}, de {h.nombre} (se escapa en la resolución {h.capitan!.libreEn})
        {asked != null && <small className="muted"> · pides {asked} de Oro</small>}
      </span>
      {active && (
        <span className="ransom">
          <label>
            Rescate{" "}
            <input type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />{" "}
            de Oro
          </label>
          <button onClick={() => act(() => api.setRansom(gameId, h.id, price), `Pides ${price} de Oro por ${h.capitan!.nombre}.`)}>
            {asked == null ? "Pedir" : "Cambiar"}
          </button>
          <button className="link" onClick={() => act(() => api.releaseCaptain(gameId, h.id), `${h.capitan!.nombre} vuelve a casa.`)}>
            Soltar gratis
          </button>
        </span>
      )}
    </li>
  );
}

/** Tu Capitán (dónde está o de quién es preso) y los Capitanes que tienes presos. */
function CaptainCard({ state, gameId, act }: Props) {
  const active = state.partida.estado === "active";
  const me = state.casas.find((h) => h.id === state.yo.casa);
  if (!me?.capitan) return null;
  const where = state.casillas?.find((t) => t.capitanes?.includes(me.id));
  const prisoners = state.casas.filter((h) => h.capitan?.presoDe === me.id);
  return (
    <section className="card">
      <h2>
        <Icon name="capitan" size={20} color="#d6a64b" /> {me.capitan.nombre}
      </h2>
      {me.capitan.presoDe != null ? (
        <>
          <p>
            Preso de {houseName(state.casas, me.capitan.presoDe)}. Se escapará en la resolución {me.capitan.libreEn}, salvo que pagues
            antes su rescate.
          </p>
          {me.capitan.rescate != null ? (
            <div className="actions">
              <button
                className="primary grow"
                disabled={!active || (state.yo.recursos?.oro ?? 0) < me.capitan.rescate}
                onClick={() =>
                  act(() => api.payRansom(gameId, me.capitan!.rescate!), `${me.capitan!.nombre} vuelve a tu castillo.`)
                }
              >
                Pagar el rescate: {me.capitan.rescate} de Oro
              </button>
            </div>
          ) : (
            <p className="muted">{houseName(state.casas, me.capitan.presoDe)} aún no ha pedido rescate.</p>
          )}
        </>
      ) : (
        <p>
          Está en {where?.nombre ?? "tu castillo"}. Suma 2 de fuerza al grupo con el que va (lo eliges al dar una orden desde su
          casilla) y a la defensa de la casilla donde está. También puede ir solo a otra casilla tuya («Mover al Capitán solo», en el
          mapa). Si su grupo pierde contra otra casa, o atacan la casilla donde está solo, cae preso.
        </p>
      )}
      {prisoners.length > 0 && (
        <>
          <h3>Tus presos</h3>
          <ul className="list">
            {prisoners.map((h) => (
              <Prisoner key={h.id} house={h} gameId={gameId} act={act} active={active} />
            ))}
          </ul>
          <p className="hint">Pide un rescate en Oro: si su casa lo paga, el Capitán vuelve a su castillo en el momento.</p>
        </>
      )}
    </section>
  );
}
