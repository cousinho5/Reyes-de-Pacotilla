// Maqueta de la portada (bloque 7). Pinta el panorama de Aldricia por planos con los dibujos de
// pxl/portada.px.js (DATA.px), lo tiñe según la hora y monta las tres pantallas de la portada.
// Todo el dibujo son rejillas con paleta, como en el juego; el texto es HTML.

const PX = DATA.px, ART = DATA.arte;
const HW = 196, HH = 252, TOP = 36;           // lienzo del panorama; los planos van 36 px más abajo
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------ color
const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => rgb(hex2(a).map((v, i) => v + (hex2(b)[i] - v) * t));
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);

// Las cuatro horas: cielo (arriba, medio, horizonte), tinte de los planos y luz de las ventanas.
const HORAS = {
  amanecer: { cielo: ["#2f3f78", "#c97f8f", "#f7c98e"], tinte: "#f2a37a", fuerza: 0.16, bruma: "#e9b3a2", oscuro: 0.06, ventanas: 0.4, nubes: ["#fbe0cf", "#d99aa0"], sol: [150, 92, "#ffe2a0"] },
  dia: { cielo: ["#4f86cc", "#93c1ec", "#d7ecf9"], tinte: "#ffffff", fuerza: 0, bruma: "#c7dcef", oscuro: 0, ventanas: 0, nubes: ["#ffffff", "#c6d7ea"], sol: [176, 24, "#fff6c8"] },
  atardecer: { cielo: ["#272a66", "#a8507d", "#f59a4c"], tinte: "#ff8a4a", fuerza: 0.22, bruma: "#d98a7a", oscuro: 0.12, ventanas: 0.8, nubes: ["#ffc08a", "#a8507d"], sol: [30, 96, "#ffcf70"] },
  noche: { cielo: ["#070b26", "#16255a", "#34497f"], tinte: "#2a3d78", fuerza: 0.45, bruma: "#2e4378", oscuro: 0.3, ventanas: 1, nubes: ["#3a4a7a", "#232f5a"], luna: [172, 26] },
};
const horaReal = () => { const h = new Date().getHours(); return h < 6 || h >= 21 ? "noche" : h < 9 ? "amanecer" : h < 18 ? "dia" : "atardecer"; };
let horaElegida = "auto";
const hora = () => (horaElegida === "auto" ? horaReal() : horaElegida);

// Paleta teñida de un plano: tinte de la hora, bruma según lo lejos que está, ventanas encendidas.
function tinta(pal, prof, H) {
  const out = {};
  for (const [k, c] of Object.entries(pal)) {
    let v = c;
    if (H.fuerza) v = mix(v, H.tinte, H.fuerza * (k === "z" || k === "Z" ? 0 : 1));
    if (H.oscuro) v = mix(v, "#000000", H.oscuro * (1 - prof * 0.3));
    v = mix(v, H.bruma, prof * 0.42);
    if ((k === "z" || k === "Z") && H.ventanas) v = mix(v, k === "z" ? "#ffb84a" : "#ffe9a8", H.ventanas);
    out[k] = v;
  }
  return out;
}

// ------------------------------------------------------------------ rejillas a lienzo
function lienzo(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function pintar(grid, pal) {
  const c = lienzo(grid[0].length, grid.length), x = c.getContext("2d"), d = x.createImageData(c.width, c.height);
  const cache = {};
  for (let y = 0; y < grid.length; y++) for (let i = 0; i < grid[y].length; i++) {
    const k = grid[y][i]; if (k === "." || !pal[k]) continue;
    const v = cache[k] || (cache[k] = hex2(pal[k])), o = (y * c.width + i) * 4;
    d.data[o] = v[0]; d.data[o + 1] = v[1]; d.data[o + 2] = v[2]; d.data[o + 3] = 255;
  }
  x.putImageData(d, 0, 0); return c;
}
const memo = new Map();
function sprite(nombre, prof, frame = 0) {
  const H = HORAS[hora()], key = nombre + "|" + hora() + "|" + prof + "|" + frame;
  if (!memo.has(key)) { const s = PX[nombre]; memo.set(key, pintar(s.frames[frame % s.frames.length], tinta(s.pal, prof, H))); }
  return memo.get(key);
}
const fotograma = (nombre, t, fps, pingpong) => {
  const n = PX[nombre].frames.length, i = Math.floor(t * fps);
  if (!pingpong) return i % n;
  const m = i % (2 * n - 2); return m < n ? m : 2 * n - 2 - m;
};

// ------------------------------------------------------------------ el panorama
const PLANOS = [
  { id: "cielo", par: 0.55 }, { id: "lejos", par: 0.42, prof: 1 }, { id: "colinas", par: 0.3, prof: 0.6 },
  { id: "capital", par: 0.18, prof: 0.3 }, { id: "pueblo", par: 0.05, prof: 0 },
];
const hero = document.getElementById("hero");
const capas = PLANOS.map((p) => { const c = lienzo(HW, HH); c.className = "capa"; return { ...p, c, x: c.getContext("2d") }; });
hero.prepend(...capas.map((k) => k.c));

// Nubes: cada una nace, cruza despacio y se deshace; píxeles con la cara de arriba iluminada.
const NUBES = [[20, 18, 22, 0.9], [120, 34, 30, 0.7], [70, 8, 16, 1.1], [168, 52, 18, 0.8]];
function nube(x, cx, cy, ancho, H) {
  const [luz, sombra] = H.nubes;
  for (let i = 0; i < 5; i++) {
    const px = cx + i * ancho / 5 - ancho / 2, r = 3 + ((i * 7) % 4) + (i === 2 ? 3 : 0), py = cy - (i === 2 ? 2 : 0);
    x.fillStyle = sombra; x.beginPath(); x.ellipse(Math.round(px), Math.round(py + 1), r + 1, r * 0.6 + 1, 0, 0, 7); x.fill();
  }
  for (let i = 0; i < 5; i++) {
    const px = cx + i * ancho / 5 - ancho / 2, r = 3 + ((i * 7) % 4) + (i === 2 ? 3 : 0), py = cy - (i === 2 ? 2 : 0);
    x.fillStyle = luz; x.beginPath(); x.ellipse(Math.round(px), Math.round(py - 1), r, r * 0.55, 0, 0, 7); x.fill();
  }
}
const azar = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
const ESTRELLAS = Array.from({ length: 80 }, (_, i) => [Math.floor(azar(i, 1) * HW), Math.floor(Math.pow(azar(i, 2), 1.4) * 120), Math.floor(azar(i, 3) * 7)]);
function cielo(x, t, H) {
  const g = x.createLinearGradient(0, 0, 0, 150);
  g.addColorStop(0, H.cielo[0]); g.addColorStop(0.55, H.cielo[1]); g.addColorStop(1, H.cielo[2]);
  x.fillStyle = g; x.fillRect(0, 0, HW, HH);
  if (H.luna) {
    for (const [sx, sy, f] of ESTRELLAS) { const on = Math.sin(t * (1 + f * 0.3) + f) > -0.2; if (on) { x.fillStyle = f % 3 ? "#c9d4ff" : "#ffffff"; x.fillRect(sx, sy, 1, 1); if (f === 0 && Math.sin(t * 2 + sx) > 0.7) { x.fillRect(sx - 1, sy, 3, 1); x.fillRect(sx, sy - 1, 1, 3); } } }
    const [mx, my] = H.luna;
    const halo = x.createRadialGradient(mx, my, 2, mx, my, 26); halo.addColorStop(0, "rgba(220,230,255,.35)"); halo.addColorStop(1, "rgba(220,230,255,0)");
    x.fillStyle = halo; x.fillRect(mx - 30, my - 30, 60, 60);
    x.fillStyle = "#f4f1dc"; x.beginPath(); x.arc(mx, my, 7, 0, 7); x.fill();
    x.fillStyle = H.cielo[0]; x.beginPath(); x.arc(mx + 4, my - 2, 6, 0, 7); x.fill();      // creciente
  } else {
    const [sx, sy, col] = H.sol;
    const halo = x.createRadialGradient(sx, sy, 3, sx, sy, 46); halo.addColorStop(0, col + "cc"); halo.addColorStop(1, col + "00");
    x.fillStyle = halo; x.fillRect(sx - 50, sy - 50, 100, 100);
    x.fillStyle = col; x.beginPath(); x.arc(sx, sy, 8, 0, 7); x.fill();
    x.fillStyle = "#ffffff"; x.beginPath(); x.arc(sx - 2, sy - 2, 3, 0, 7); x.fill();
  }
  for (const [x0, y0, w, v] of NUBES) {
    const L = HW + 60, cx = ((x0 + (reduced ? 0 : t * v * 1.6)) % L) - 30;
    nube(x, cx, y0 + 6, w, H);
  }
}

// Recorrido del camino real (el mismo que en el dibujo) para la carreta y el aldeano.
const via = (y) => { const t = (y - 155) / (216 - 155); return 98 + Math.sin(t * 3.6) * 22 * t; };
const CHIMENEAS = [[-3, 177], [31, 171], [150, 171], [176, 177]];

function dibujar(t) {
  const H = HORAS[hora()], noche = !!H.luna;
  for (const k of capas) {
    const x = k.x; x.clearRect(0, 0, HW, HH); x.imageSmoothingEnabled = false;
    if (k.id === "cielo") { cielo(x, t, H); continue; }
    const off = k.id === "capital" ? -1 : 0;
    x.drawImage(sprite(k.id, k.prof), off, TOP + off);
    if (k.id === "colinas") x.drawImage(sprite("aspas", 0.6, fotograma("aspas", t, reduced ? 0 : 5)), 21, TOP + 116);
    if (k.id === "capital") {
      x.drawImage(sprite("bandera", 0.3, fotograma("bandera", t, reduced ? 0 : 8)), 98, TOP + 25);
      if (noche) {
        const a = 0.55 + 0.35 * Math.sin(t * 1.3);
        x.globalAlpha = a; x.drawImage(fantasma(fotograma("fantasma", t, 5, true)), 112, TOP + 44 + Math.round(Math.sin(t * 0.8) * 3)); x.globalAlpha = 1;
      }
    }
    if (k.id === "pueblo") {
      for (const [cx, cy] of CHIMENEAS) x.drawImage(sprite("humo", noche ? 0.5 : 0.2, fotograma("humo", t + cx, reduced ? 0 : 10)), cx, TOP + cy - 24);
      // la carreta sube por el camino en 36 s; el aldeano baja en 28 s
      const pc = reduced ? 0.45 : (t / 36) % 1, yc = lerp(214, 166, pc);
      x.globalAlpha = clamp((1 - pc) * 8) * clamp(pc * 12); x.drawImage(sprite("carreta", 0, fotograma("carreta", t, 6)), Math.round(via(yc) - 6), TOP + Math.round(yc) - 16); x.globalAlpha = 1;
      const pa = reduced ? 0.3 : ((t + 9) / 28) % 1, ya = lerp(160, 216, pa);
      x.globalAlpha = clamp(pa * 10) * clamp((1 - pa) * 10);
      x.save(); x.translate(Math.round(via(ya) - 14), TOP + Math.round(ya) - 15); x.drawImage(sprite("aldeano", 0, fotograma("aldeano", t, 6)), 0, 0); x.restore(); x.globalAlpha = 1;
      // una rata cruza el camino cada 14 s
      const pr = ((t + 5) % 14) / 2.2;
      if (pr < 1 && !reduced) x.drawImage(sprite("rata", 0, fotograma("rata", t, 10)), Math.round(lerp(-10, HW + 10, pr)), TOP + 202);
      // pájaros de día; murciélagos (los mismos, en oscuro) de noche
      for (let i = 0; i < 3; i++) {
        const v = 9 + i * 2, bx = ((t * v + i * 70) % (HW + 40)) - 20, by = 40 + i * 9 + Math.sin(t * 2 + i) * 3;
        x.drawImage(sprite("pajaro", noche ? 0.2 : 0.5, fotograma("pajaro", t + i * 0.3, 8)), Math.round(bx), Math.round(by));
      }
      // luciérnagas junto a los árboles, de noche
      if (noche) for (let i = 0; i < 14; i++) {
        const fx = [64, 132, 14, 186][i % 4] + Math.sin(t * 0.7 + i) * 8, fy = TOP + 168 + Math.cos(t * 0.9 + i * 2) * 6;
        if (Math.sin(t * 3 + i * 1.7) > 0.2) { x.fillStyle = "#f6f2a0"; x.fillRect(Math.round(fx), Math.round(fy), 1, 1); }
      }
    }
  }
}

// El fantasma no se tiñe: brilla con luz propia.
const fantasmas = PX.fantasma.frames.map((f) => pintar(f, PX.fantasma.pal));
const fantasma = (i) => fantasmas[i];

// Paralaje: al deslizar la página, cada plano se queda atrás a su ritmo.
const scroller = document.getElementById("phone");
function paralaje() {
  const y = scroller.scrollTop;
  for (const k of capas) k.c.style.transform = `translateY(${(y * k.par).toFixed(1)}px)`;
  document.getElementById("titulo").style.transform = `translateY(${(y * 0.6).toFixed(1)}px)`;
  document.getElementById("titulo").style.opacity = String(1 - clamp(y / 260));
}
scroller.addEventListener("scroll", paralaje, { passive: true });

// ------------------------------------------------------------------ piezas de la interfaz
function escudo(i, size) {
  const h = ART.houses[i]; const c = pintar(h.grid, h.pal); c.className = "escudo"; c.style.width = size + "px"; return c;
}
function fray(mood, size) { const s = ART.fray[mood] || ART.fray.adulador; const c = pintar(s.grid, s.palette); c.className = "fray"; c.style.width = size + "px"; return c; }
function px(nombre, size, frame = 0) { const c = pintar(PX[nombre].frames[frame], PX[nombre].pal); c.style.width = size + "px"; c.className = "pxi"; return c; }
const animados = [];                                 // lienzos con animación propia (iconos)
function pxAnim(nombre, size, fps, pingpong) {
  const s = PX[nombre], frames = s.frames.map((f) => pintar(f, s.pal)), c = lienzo(s.w, s.h), x = c.getContext("2d");
  c.style.width = size + "px"; c.className = "pxi";
  animados.push((t) => { x.clearRect(0, 0, s.w, s.h); x.drawImage(frames[fotograma(nombre, t, reduced ? 0 : fps, pingpong)], 0, 0); });
  return c;
}
function mapa(size) {
  const m = ART.map, c = pintar(m.p, m.pal), out = lienzo(150, 90), x = out.getContext("2d");
  x.imageSmoothingEnabled = false;
  const [cx, cy] = m.me, sw = 300, sh = 180;
  x.drawImage(c, Math.round(cx - sw / 2), Math.round(cy - sh / 2), sw, sh, 0, 0, 150, 90);
  out.className = "minimapa"; return out;
}
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// Frases de la portada (propuesta para el banco de frases, sección 11.12).
const FRASES_FUERA = [
  "El trono de Aldricia sigue vacío. Se buscan candidatos con ambición y sin alergia al pollo.",
  "Seis semanas, un trono y ninguna llave. El cronista ya ha afilado la pluma.",
  "Aquí se forjan reyes de verdad. Bueno, de pacotilla, pero reyes.",
  "El difunto Aldric insiste en que con él el reino iba mejor. El cronista no lo recuerda así.",
];
const NOTA = "Maqueta con datos inventados. Arriba eliges la pantalla y la hora; sin elegir, el cielo sigue tu hora real. Desliza: cada plano se mueve a su ritmo.";
const saludo = () => ({ amanecer: "Buenos días", dia: "Buenos días", atardecer: "Buenas tardes", noche: "Buenas noches" })[hora()];

// ------------------------------------------------------------------ pantallas
const PANTALLAS = {
  fuera: { nombre: "Sin entrar" },
  dentro: { nombre: "Con partidas" },
  invitacion: { nombre: "Invitación" },
};
let pantalla = "fuera";
const cuerpo = document.getElementById("cuerpo"), tituloEl = document.getElementById("titulo");

function pasos() {
  const s = el("section", "pasos");
  s.append(el("h2", "", "Un trono vacío y demasiados aspirantes"));
  s.append(el("p", "lema", "Para 4 a 8 amigos · 6 semanas · 5 minutos al día"));
  const lista = el("ol", "");
  const items = [
    [pxAnim("carreta", 60, 6), "De día, das órdenes", "Cosecha, construye, comercia y mueve tus tropas. Con cinco minutos basta."],
    [pxAnim("bandera", 52, 8), "De noche, todo se resuelve", "Las órdenes de todas las casas se cumplen a la vez. Por la mañana, Fray Abundio lo cuenta en su boletín."],
    [px("corona", 52), "En seis semanas, una corona", "Gana quien acabe con más Prestigio. Las alianzas se firman y, a veces, se rompen."],
  ];
  for (const [icono, t, d] of items) { const li = el("li", ""); const ic = el("div", "icono"); ic.append(icono); li.append(ic, el("div", "", `<b>${t}</b><span>${d}</span>`)); lista.append(li); }
  s.append(lista); return s;
}

function frayCard(frases, mood) {
  const c = el("div", "fraycard"); c.append(fray(mood, 64));
  const b = el("p", "bocadillo", frases[0]); c.append(b);
  let i = 0; c._rot = setInterval(() => { i = (i + 1) % frases.length; b.classList.remove("in"); void b.offsetWidth; b.textContent = frases[i]; b.classList.add("in"); }, 6500);
  return c;
}

function montarFuera() {
  tituloEl.className = "titulo";
  cuerpo.append(frayCard(FRASES_FUERA, "adulador"));
  const acc = el("div", "acciones");
  const entrar = el("button", "primary grande", "Entrar con mi código"); entrar.onclick = abrirHoja;
  const inv = el("button", "segundo", "Tengo una invitación"); inv.onclick = () => ir("invitacion");
  acc.append(entrar, inv);
  const pro = el("a", "prologo", "<i>▶</i> Ver el prólogo <small>45 s</small>"); pro.href = "https://claude.ai/artifact/Rc6nhMqnDcug1gCqkNh2Z2#prologo-0"; pro.target = "_blank"; pro.rel = "noopener";
  acc.append(pro);
  cuerpo.append(acc, pasos());
  cuerpo.append(el("footer", "pie", "Reyes de Pacotilla · un juego para amigos con paciencia y poca vergüenza"));
  cuerpo.append(el("p", "nota-maqueta", NOTA));
}

function filaAviso(tipo, icono, texto) { const f = el("li", "aviso " + tipo); f.append(el("span", "ico", icono), el("span", "", texto), el("span", "flecha", "›")); return f; }
function montarDentro() {
  tituloEl.className = "titulo pequeno";
  const hola = el("div", "hola"); hola.append(el("h2", "", `${saludo()}, Cimentia`)); cuerpo.append(hola);
  const fc = frayCard(["Los Duques del Queso van segundos, a 17 de Prestigio del primero. El cronista lo considera un triunfo moral.", "Anoche nadie conquistó vuestras tierras. El cronista lo apunta como hazaña.", "Quedan 30 noches de interregno. Los Pocapena ya ensayan la reverencia."], "solemne");
  cuerpo.append(fc);

  // La partida que más te necesita, arriba y grande.
  const c = el("article", "partida principal");
  const cab = el("header", ""); cab.append(escudo(0, 56));
  cab.append(el("div", "", `<h3>La Liga del Queso</h3><p>Duques del Queso · semana 2, noche 12 de 42</p>`));
  c.append(cab);
  const reloj = el("div", "reloj"); reloj.innerHTML = `<div class="arena"><i></i></div><div><b id="cuenta">Órdenes: cierran en 3 h 12 min</b><small>A las 21:00. A las 22:00 cae la noche.</small></div>`;
  c.append(reloj);
  const avisos = el("ul", "avisos");
  avisos.append(filaAviso("urgente", "!", "<b>Aún no has dado órdenes</b> para esta noche"),
    filaAviso("", "⚔", "Te atacaron en el Vado del Molino: <b>resistió</b>"),
    filaAviso("", "✉", "Boletín nuevo de Fray Abundio"),
    filaAviso("", "⚖", "Los Señores del Pato te ofrecen 20 de Pan por 12 de Oro"));
  c.append(avisos);
  const clas = el("div", "clasif");
  const orden = [2, 0, 3, 1, 6, 4, 5], pv = [148, 131, 124, 109, 97, 88, 71];
  const fila = el("div", "fila");
  orden.forEach((h, i) => { const s = el("span", h === 0 ? "yo" : ""); s.append(escudo(h, h === 0 ? 30 : 24)); s.append(el("b", "", `${i + 1}.º`)); fila.append(s); });
  clas.append(fila, el("p", "", `<b>2.º de 7</b> · 131 de Prestigio · <span class="sube">▲ 1 puesto</span>`));
  c.append(clas);
  const mapaBox = el("div", "tureino"); mapaBox.append(mapa(), el("p", "", "<b>Tu reino</b><span>9 casillas · 3 fortalezas a la vista</span>"));
  c.append(mapaBox);
  c.append(el("button", "primary grande ancho", "Entrar en mi castillo"));
  cuerpo.append(c);

  cuerpo.append(el("h4", "sep", "Tus otras partidas"));
  const sala = el("article", "partida");
  const cab2 = el("header", ""); cab2.append(escudo(2, 40)); cab2.append(el("div", "", `<h3>Otoño en Aldricia</h3><p>Los Pocapena · sala de espera</p>`));
  sala.append(cab2);
  const corte = el("div", "corte"); [2, 3, 5, 1, 4].forEach((h) => corte.append(escudo(h, 22))); for (let i = 0; i < 3; i++) corte.append(el("i", "hueco"));
  sala.append(corte, el("p", "nota", "5 de 8 casas · empieza el <b>lunes 27 a las 20:00</b>"));
  cuerpo.append(sala);
  const fin = el("article", "partida ganada");
  const cab3 = el("header", ""); cab3.append(escudo(1, 40)); cab3.append(el("div", "", `<h3>Primera partida</h3><p>Señores del Pato · terminada</p>`));
  const cor = el("div", "medalla"); cor.append(px("corona", 34)); cab3.append(cor);
  fin.append(cab3, el("p", "nota", "<b>¡Ganaste la corona!</b> Título: <i>Mariscal de la Retirada Estratégica</i>"), el("button", "segundo", "Ver la coronación"));
  cuerpo.append(fin);

  const vit = el("section", "vitrina");
  vit.append(el("h4", "", "Tu vitrina"));
  const balda = el("div", "balda"); balda.append(px("corona", 40)); for (let i = 0; i < 3; i++) balda.append(el("i", "vacio"));
  vit.append(balda, el("p", "", "1 corona · 2 partidas jugadas · 3.ª en la que estás"));
  cuerpo.append(vit);

  const inst = el("section", "instalar");
  inst.append(fray("monedas", 40), el("p", "", "Añade Reyes de Pacotilla a tu pantalla de inicio para recibir avisos. El cronista no puede ir a buscarte."), el("button", "segundo", "Instalar"));
  cuerpo.append(inst);
  const inv = el("form", "invita"); inv.innerHTML = `<label>¿Tienes una invitación?<span><input placeholder="Código o enlace"><button type="button">Ir</button></span></label>`;
  cuerpo.append(inv, el("button", "link salir", "Salir"), el("p", "nota-maqueta", NOTA));
  animados.push((t) => {                                 // la cuenta atrás de la maqueta
    const s = Math.max(0, 3 * 3600 + 12 * 60 - Math.floor(t)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const e = document.getElementById("cuenta"); if (e) e.textContent = `Órdenes: cierran en ${h} h ${String(m).padStart(2, "0")} min`;
  });
}

function montarInvitacion() {
  tituloEl.className = "titulo pequeno";
  const bando = el("div", "bando");
  bando.innerHTML = `<div class="rollo"></div><div class="papel"><small>Bando real</small><p><b>Cimentia</b> te invita a la corte de</p><h2>Otoño en Aldricia</h2><p class="datos">Partida de 6 semanas · empieza el <b>lunes 27 de octubre a las 20:00</b></p><div class="sello">A</div></div><div class="rollo abajo"></div>`;
  cuerpo.append(bando);
  const corte = el("section", "cortesanos");
  corte.append(el("h4", "", "Ya en la corte · 5 de 8"));
  const ul = el("ul", "");
  [2, 3, 5, 1, 4].forEach((h) => { const li = el("li", ""); li.append(escudo(h, 34), el("div", "", `<b>${ART.houses[h].n}</b><i>«${ART.houses[h].lema}»</i>`)); ul.append(li); });
  for (let i = 0; i < 3; i++) { const li = el("li", "libre"); li.append(el("span", "hueco grande"), el("div", "", "<b>Sitio libre</b><i>¿El tuyo?</i>")); ul.append(li); }
  corte.append(ul);
  cuerpo.append(corte);
  const acc = el("div", "acciones");
  acc.append(el("button", "primary grande", "Crear mi casa"));
  const ya = el("button", "link", "Ya tengo casa en otra partida: entrar con mi código"); ya.onclick = abrirHoja; acc.append(ya);
  cuerpo.append(acc);
  const det = el("details", "quees"); det.append(el("summary", "", "¿Qué es Reyes de Pacotilla?"), pasos());
  cuerpo.append(det);
  cuerpo.append(el("p", "nota-maqueta", NOTA));
  cuerpo.insertBefore(frayCard(["Una invitación a la corte. El cronista recomienda aceptar: la comida es buena, salvo el pollo."], "adulador"), cuerpo.lastChild);
}

function ir(p) {
  pantalla = p;
  for (const n of cuerpo.querySelectorAll(".fraycard")) clearInterval(n._rot);
  cuerpo.innerHTML = ""; animados.length = 0;
  ({ fuera: montarFuera, dentro: montarDentro, invitacion: montarInvitacion })[p]();
  scroller.scrollTop = 0; paralaje();
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.p === p));
  cuerpo.classList.remove("entra"); void cuerpo.offsetWidth; cuerpo.classList.add("entra");
}

// ------------------------------------------------------------------ hoja para entrar con el código
const hoja = document.getElementById("hoja");
function abrirHoja() {
  hoja.hidden = false; requestAnimationFrame(() => hoja.classList.add("abierta"));
  const i = hoja.querySelector("input"); i.value = ""; pintarCasillas(""); setTimeout(() => i.focus(), 300);
}
function cerrarHoja() { hoja.classList.remove("abierta"); setTimeout(() => (hoja.hidden = true), 250); }
function pintarCasillas(v) { hoja.querySelectorAll(".casillas i").forEach((c, k) => { c.textContent = v[k] || ""; c.classList.toggle("activa", k === v.length); }); }
hoja.querySelector(".fondo").onclick = cerrarHoja;
hoja.querySelector("input").addEventListener("input", (e) => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); e.target.value = v; pintarCasillas(v); hoja.querySelector(".entrar").disabled = v.length < 6; });
hoja.querySelector(".entrar").onclick = () => { cerrarHoja(); setTimeout(() => ir("dentro"), 260); };
hoja.querySelector(".casillas").onclick = () => hoja.querySelector("input").focus();
hoja.querySelector(".fray-hoja").prepend(fray("solemne", 44));

// ------------------------------------------------------------------ título y corona que cae
const corona = document.getElementById("corona"); corona.append(px("corona", 46));
const brillo = pxAnim("brillo", 18, 10); brillo.classList.add("brillo"); corona.append(brillo);
const brilloAnim = animados.pop();

// ------------------------------------------------------------------ controles de la maqueta
document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => ir(b.dataset.p)));
document.querySelectorAll("#horas button").forEach((b) => (b.onclick = () => { horaElegida = b.dataset.h; document.querySelectorAll("#horas button").forEach((o) => o.setAttribute("aria-pressed", o === b)); document.body.dataset.hora = hora(); if (pantalla === "dentro") ir("dentro"); }));
document.body.dataset.hora = hora();

// Modo foto: #pantalla-hora-tNN deja la escena quieta en ese instante (para las capturas).
let quieto = null;
const m = /^#(fuera|dentro|invitacion)(?:-(auto|amanecer|dia|atardecer|noche))?(?:-t(\d+))?(?:-(hoja))?$/.exec(location.hash);
if (m) { if (m[2]) { horaElegida = m[2]; document.querySelectorAll("#horas button").forEach((o) => o.setAttribute("aria-pressed", o.dataset.h === m[2])); } if (m[3]) quieto = +m[3] / 10; }
document.body.dataset.hora = hora();
ir(m ? m[1] : "fuera");
if (m && m[4]) abrirHoja();
if (quieto != null) document.body.classList.add("quieto");

const t0 = performance.now();
let ultimo = 0;
function bucle(now) {
  const t = quieto != null ? quieto : (now - t0) / 1000;
  if (now - ultimo > 1000 / 14 || quieto != null) {           // 14 fotogramas por segundo bastan para pixel art
    ultimo = now; dibujar(t); for (const f of animados) f(t); brilloAnim(t);
  }
  if (quieto == null) requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
if (quieto != null) setTimeout(() => { dibujar(quieto); for (const f of animados) f(quieto); brilloAnim(quieto); document.body.classList.add("listo"); }, 50);
