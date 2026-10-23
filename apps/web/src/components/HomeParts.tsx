// Bloque 7: las piezas de la portada que usa también la invitación: Aldricia
// arriba con el título, el bocadillo de Fray Abundio y los tres pasos.

import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { FrayAbundio, Pixels, still, type FrayMood } from "../art";
import { bandera, brillo, carreta, corona } from "../art/portadaIconos";
import type { Sprite } from "../art/sprites";
import { hourFromUrl, skyAt, type HomeHour } from "../home";

// El dibujo y el prólogo van en su propio trozo de JS: la portada sale al momento
// con el cielo y el título, y la escena aparece encima en cuanto llega.
const Panorama = lazy(() => import("./Panorama"));

type Sky = ReturnType<typeof skyAt>;

/** El cielo: la hora del reloj del móvil, mirada cada minuto, con su fundido. */
export function useSky(): Sky {
  const forced = useMemo(() => hourFromUrl(window.location.search), []);
  const [sky, setSky] = useState<Sky>(() => (forced ? { hour: forced, next: null, mix: 0 } : skyAt(new Date())));
  useEffect(() => {
    if (forced) return;
    const id = setInterval(() => setSky(skyAt(new Date())), 60_000);
    return () => clearInterval(id);
  }, [forced]);
  return sky;
}

/** La franja del día para los saludos y las frases. */
export const useHour = (): HomeHour => useSky().hour;

/** Un dibujo animado pequeño (los iconos de los pasos y el brillo de la corona). */
export function Anim({ frames, fps, size, className }: { frames: Sprite[]; fps: number; size: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still()) return;
    const id = setInterval(() => document.visibilityState === "visible" && setI((n) => (n + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps]);
  const s = frames[i]!;
  return <Pixels grid={s.grid} palette={s.palette} size={size} className={className} />;
}

/**
 * Aldricia con el título. En los últimos minutos de cada franja la escena de la
 * siguiente se va poniendo encima. La corona, si se toca, se pone derecha un
 * momento (`onCrown` dice a la portada que Fray Abundio comente algo).
 */
export function Hero({ sky, small, onCrown }: { sky: Sky; small: boolean; onCrown?: () => void }) {
  // Cada toque monta la corona de nuevo para que la animación empiece otra vez;
  // tras el primero ya no vuelve a caer del cielo.
  const [taps, setTaps] = useState(0);
  const crown = (
    <>
      <Pixels grid={corona.grid} palette={corona.palette} size={small ? 36 : 46} />
      <Anim frames={brillo} fps={10} size={18} className="home-shine" />
    </>
  );
  return (
    <header className="home-hero" data-hora={sky.hour}>
      <Suspense fallback={null}>
        <Panorama hour={sky.hour} />
        {sky.next && (
          <div className="pano-fade" style={{ opacity: sky.mix }} aria-hidden>
            <Panorama hour={sky.next} />
          </div>
        )}
      </Suspense>
      <div className={`home-title${small ? " small" : ""}`}>
        <h1>
          {onCrown ? (
            <button
              type="button"
              key={taps}
              className={`home-crown${taps ? " straight" : ""}`}
              aria-label="La corona torcida"
              onClick={() => {
                setTaps((n) => n + 1);
                onCrown();
              }}
            >
              {crown}
            </button>
          ) : (
            <span className="home-crown" aria-hidden>
              {crown}
            </span>
          )}
          <span className="r1">Reyes de</span>
          <span className="r2">Pacotilla</span>
        </h1>
        <p className="sub">Aldricia, el Reino Más o Menos Unido</p>
      </div>
    </header>
  );
}

/** Fray Abundio con un bocadillo que cambia de frase cada pocos segundos. */
export function FrayCard({ lines, mood }: { lines: string[]; mood: FrayMood }) {
  const [i, setI] = useState(0);
  const key = lines.join("\n");
  useEffect(() => {
    setI(0);
    if (lines.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), 6500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="home-fray">
      <FrayAbundio mood={mood} size={64} />
      <p key={i} className="bubble" aria-live="polite">
        {lines[i % lines.length]}
      </p>
    </div>
  );
}

/** Cómo se juega, en tres pasos. */
export function Steps() {
  return (
    <section className="home-steps">
      <h2>Un trono vacío y demasiados aspirantes</h2>
      <p className="motto">Para 4 a 8 amigos · 6 semanas · 5 minutos al día</p>
      <ol>
        <li>
          <span className="icon">
            <Anim frames={carreta} fps={6} size={60} />
          </span>
          <span>
            <b>De día, das órdenes</b>
            Cosecha, construye, comercia y mueve tus tropas. Con cinco minutos basta.
          </span>
        </li>
        <li>
          <span className="icon">
            <Anim frames={bandera} fps={8} size={52} />
          </span>
          <span>
            <b>De noche, todo se resuelve</b>
            Las órdenes de todas las casas se cumplen a la vez. Por la mañana, Fray Abundio lo cuenta en su boletín.
          </span>
        </li>
        <li>
          <span className="icon">
            <Pixels grid={corona.grid} palette={corona.palette} size={52} />
          </span>
          <span>
            <b>En seis semanas, una corona</b>
            Gana quien acabe con más Prestigio. Las alianzas se firman y, a veces, se rompen.
          </span>
        </li>
      </ol>
    </section>
  );
}
