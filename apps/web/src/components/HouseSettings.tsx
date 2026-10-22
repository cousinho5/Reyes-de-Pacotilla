import { useEffect, useState } from "react";
import { api, type GameState } from "../api";
import { canVibrate, setVibrationOn, vibrate, vibrationOn } from "../haptics";
import { currentSubscription, disablePush, enablePush, isIOS, pushSupport } from "../push";

interface Props {
  state: GameState;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<void>;
}

/** Objetivo secreto, ausencias y avisos (pestaña Castillo). */
export function HouseSettings({ state, act }: Props) {
  const gameId = state.partida.id;
  const obj = state.yo.objetivo;
  const aus = state.yo.ausencia;
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const support = pushSupport();
  const [buzz, setBuzz] = useState(vibrationOn);

  useEffect(() => {
    currentSubscription().then((s) => setPushOn(!!s));
  }, []);

  return (
    <>
      {obj && (
        <section className="card secret">
          <h2>Objetivo secreto</h2>
          {obj.puedeElegir ? (
            <>
              <p className="muted">
                Elige uno antes de la primera resolución. Nadie más lo sabrá. Si lo cumples al final, +6 de Prestigio.
              </p>
              <ul className="list">
                {obj.opciones.map((o) =>
                  o ? (
                    <li key={o.clave}>
                      <label className="radio">
                        <input
                          type="radio"
                          name="objetivo"
                          checked={obj.elegido?.clave === o.clave}
                          onChange={() => act(() => api.chooseObjective(gameId, o.clave), "Ambición anotada. El cronista no ha visto nada.")}
                        />
                        {o.texto}
                      </label>
                    </li>
                  ) : null,
                )}
              </ul>
              {!obj.elegido && <p className="note">Si no eliges, te quedarás con el primero.</p>}
            </>
          ) : obj.elegido ? (
            <p>
              {obj.elegido.texto}
              {obj.cumplido != null && <strong>{obj.cumplido ? " Cumplido: +6 de Prestigio." : " No se cumplió."}</strong>}
            </p>
          ) : (
            <p className="muted">Sin objetivo.</p>
          )}
        </section>
      )}

      {aus && state.partida.estado === "active" && (
        <section className="card">
          <h2>Si te ausentas</h2>
          <p className="muted">
            Tras 3 días sin entrar, o si activas las vacaciones, el piloto automático juega por ti una vez al día y tus tierras
            reciben +25% de defensa. Nunca ataca ni acepta tratos.
          </p>
          <label>
            Plantilla del piloto automático
            <select value={aus.plantilla} onChange={(e) => act(() => api.setAbsence(gameId, { plantilla: e.target.value }), "Plantilla guardada.")}>
              <option value="equilibrada">Equilibrada: alterna obras y defensa</option>
              <option value="economica">Económica: mejora edificios</option>
              <option value="defensiva">Defensiva: fortifica y recluta</option>
            </select>
          </label>
          <label className="radio">
            <input
              type="checkbox"
              checked={aus.vacaciones}
              onChange={(e) =>
                act(
                  () => api.setAbsence(gameId, { vacaciones: e.target.checked }),
                  e.target.checked ? "Modo vacaciones activado. El reino os guardará el sitio." : "¡Bienvenido de nuevo!",
                )
              }
            />
            Me voy de vacaciones (el piloto automático empieza ya)
          </label>
        </section>
      )}

      <section className="card">
        <h2>Avisos</h2>
        {support === "ios-no-instalada" ? (
          <p>
            En iPhone los avisos solo llegan con el juego instalado: toca <strong>Compartir</strong> y luego{" "}
            <strong>Añadir a pantalla de inicio</strong>, abre el juego desde ese icono y entra con tu código.
          </p>
        ) : support === "no-soportado" ? (
          <p className="muted">Este navegador no admite avisos.{isIOS() ? " Actualiza iOS a la versión 16.4 o superior." : ""}</p>
        ) : pushOn ? (
          <>
            <p>Avisos activados: ofertas, cierres de órdenes, resultados y fin de partida.</p>
            <div className="actions">
              <button onClick={() => act(() => api.pushTest(), "Aviso de prueba enviado.")}>Probar</button>
              <button
                className="link"
                onClick={() =>
                  act(async () => {
                    await disablePush();
                    setPushOn(false);
                  }, "Avisos desactivados.")
                }
              >
                Desactivar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Te avisamos cuando te hagan una oferta, quede 1 hora para el cierre sin que hayas dado órdenes y haya resultados.</p>
            <button
              className="primary"
              onClick={() =>
                act(async () => {
                  await enablePush();
                  setPushOn(true);
                }, "Avisos activados.")
              }
            >
              Activar avisos
            </button>
          </>
        )}
        {state.partida.estado === "active" && state.yo.avisoCierre != null && (
          <label className="radio">
            <input
              type="checkbox"
              checked={state.yo.avisoCierre}
              onChange={(e) =>
                act(
                  () => api.setCloseWarning(gameId, e.target.checked),
                  e.target.checked ? "Fray Abundio te avisará si se te olvidan las órdenes." : "Sin aviso antes del cierre.",
                )
              }
            />
            Avisarme 1 hora antes del cierre si aún no he dado órdenes
          </label>
        )}
        {canVibrate() && (
          <label className="radio">
            <input
              type="checkbox"
              checked={buzz}
              onChange={(e) => {
                setVibrationOn(e.target.checked);
                setBuzz(e.target.checked);
                vibrate("orden");
              }}
            />
            Vibrar al dar una orden y al acabar la repetición de la noche (en este aparato)
          </label>
        )}
      </section>
    </>
  );
}
