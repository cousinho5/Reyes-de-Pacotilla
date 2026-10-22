// Ayudas al tocar (bloque 6): en el móvil no hay ratón que se pose encima, así que
// tocar algo con explicación (un recurso de la barra, el reloj, un icono) la muestra
// en un bocadillo unos segundos. Lo que ya hace algo al tocarlo (botones, enlaces,
// casillas del mapa) se queda como está.

const SHOW_MS = 2200;
const INTERACTIVE = "button, a, input, select, textarea, label, [role=button]";

let bubble: HTMLDivElement | null = null;
let timer = 0;

function hintOf(el: Element): { text: string; at: Element } | null {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const title = n.getAttribute("title");
    if (title) return { text: title, at: n };
    // Los dibujos de pixel art llevan la explicación dentro (<title> del SVG).
    if (n instanceof SVGSVGElement) {
      const t = n.querySelector(":scope > title")?.textContent;
      if (t) return { text: t, at: n };
    }
  }
  return null;
}

function hide() {
  bubble?.remove();
  bubble = null;
  window.clearTimeout(timer);
}

function show(text: string, at: Element) {
  hide();
  const r = at.getBoundingClientRect();
  bubble = document.createElement("div");
  bubble.className = "tap-hint";
  bubble.setAttribute("role", "status");
  bubble.textContent = text;
  document.body.appendChild(bubble);
  const w = bubble.offsetWidth;
  const h = bubble.offsetHeight;
  const x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
  // Debajo si cabe; si no, encima.
  const below = r.bottom + 6 + h < window.innerHeight;
  bubble.style.left = `${x}px`;
  bubble.style.top = `${below ? r.bottom + 6 : r.top - h - 6}px`;
  timer = window.setTimeout(hide, SHOW_MS);
}

export function installTapHints() {
  let touch = false;
  document.addEventListener("pointerdown", (e) => {
    touch = e.pointerType === "touch";
    if (bubble) hide();
  }, true);
  document.addEventListener("click", (e) => {
    if (!touch || !(e.target instanceof Element) || e.target.closest(INTERACTIVE)) return;
    const hint = hintOf(e.target);
    if (hint) show(hint.text, hint.at);
  });
  window.addEventListener("scroll", hide, { passive: true, capture: true });
}
