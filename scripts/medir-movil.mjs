// Medidas del bloque 6 (docs/bloque6.md): carga, primer dibujo del mapa, fluidez y
// tamaño de lo que se toca, en un móvil simulado de 390x844 (escala 3, táctil).
// Se repite antes y después de cada paso del bloque para comparar.
//
// Necesita el servidor local (npm run dev:server) y Chromium. Uso:
//   node scripts/medir-movil.mjs [http://localhost:8787] [clave-admin] [--partida N] [--solo normal|flojo] [--json archivo]
// Sin --partida crea una partida de prueba de 7 casas (6 bots) y la avanza hasta la
// resolución 5. Chromium: CHROMIUM=/ruta/al/chrome, o el de /opt/pw-browsers.

import { existsSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const partidaArg = flag("--partida");
const solo = flag("--solo");
const jsonOut = flag("--json");
const BASE = args[0] ?? "http://localhost:8787";
const ADMIN = args[1] ?? "admin-local";

const CHROME = process.env.CHROMIUM ?? ["/opt/pw-browsers/chromium"].find((p) => existsSync(p));

/** «Móvil flojo»: procesador 4 veces más lento y 4G lenta (1,6 Mbps, 150 ms). */
const PERFILES = {
  normal: { cpu: 1, red: null },
  flojo: { cpu: 4, red: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } },
};
const MOVIL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "es-ES" };

/** Cliente de la API con su cookie de sesión. */
function cliente() {
  let cookie = "";
  return async (method, path, body, headers = {}) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(data)}`);
    return data;
  };
}

/**
 * Partida de prueba de 7 casas en la resolución 5 (o la primera después con una batalla
 * a la vista, para que salga la repetición). Devuelve su id y el código para entrar.
 */
async function prepararPartida() {
  const api = cliente();
  const creada = await api("POST", "/api/partidas", { nombre: "Medidas del móvil", semanas: 2, creador: "Medidor", prueba: true, bots: 6 }, { "x-admin": ADMIN });
  const info = await api("GET", `/api/invitacion/${creada.codigoInvitacion}`);
  await api("POST", `/api/invitacion/${creada.codigoInvitacion}/unirse`, { casa: "Casa del Metro", color: info.coloresLibres[0] });
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const lunes = new Date(`${hoy}T12:00:00Z`);
  lunes.setUTCDate(lunes.getUTCDate() + ((8 - lunes.getUTCDay()) % 7 || 7));
  await api("POST", `/api/partidas/${creada.id}/empezar`, { inicio: lunes.toISOString().slice(0, 10) });
  // Para ver la repetición hace falta una batalla a la vista: se juega como la casa que la ganó.
  const conBatalla = async (r) => {
    const { eventos = [] } = await api("GET", `/api/partidas/${creada.id}`);
    for (const e of eventos.filter((e) => e.resolucion === r && e.tipo === "combate" && e.datos.winner != null)) {
      await api("POST", `/api/partidas/${creada.id}/prueba/jugar-como`, { casa: e.datos.winner });
      const { casillas = [] } = await api("GET", `/api/partidas/${creada.id}`);
      if (casillas.some((t) => t.id === Number(e.datos.tile) && t.visible)) return true;
    }
    return false;
  };
  for (let r = 1; r <= 10; r++) {
    await api("POST", `/api/partidas/${creada.id}/prueba/avanzar`, { hasta: "resolucion" });
    if (r >= 5 && (await conBatalla(r))) break;
  }
  return { id: creada.id, codigo: creada.codigoAcceso };
}

/** Imágenes por segundo del hilo principal durante `ms` (contando requestAnimationFrame). */
const fps = (page, ms) =>
  page.evaluate(
    (ms) =>
      new Promise((ok) => {
        let n = 0;
        const t0 = performance.now();
        const tick = (t) => {
          n++;
          if (t - t0 < ms) requestAnimationFrame(tick);
          else ok(Math.round((n * 1000) / (t - t0)));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

/** Cuándo se pintó la página, cuándo se vio el mapa y la tarea larga más larga desde la carga. */
const tiempos = (page) =>
  page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
    const mapa = performance.getEntriesByName("mapa-dibujado")[0]?.startTime ?? null;
    const previa = performance.getEntriesByName("mapa-vista-previa")[0]?.startTime ?? null;
    const largas = (window.__largas ?? []).filter((d) => mapa == null || d.start <= mapa + 50);
    return {
      pagina: fcp,
      previa,
      mapa,
      congelada: largas.reduce((m, d) => Math.max(m, d.duration), 0),
      congeladaTotal: largas.reduce((s, d) => s + d.duration, 0),
    };
  });

/** Lo que se toca y mide menos de 48 px (y cuántas menos de 44), en la pestaña abierta. */
const tocables = (page) =>
  page.evaluate(() => {
    const sel = "button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], label:has(input)";
    const vistos = new Map();
    for (const el of document.querySelectorAll(sel)) {
      // Las casillas del mapa se miden aparte; una casilla de marcar dentro de su etiqueta cuenta como la etiqueta.
      // La mesa de pruebas no la ve nadie en una partida de verdad.
      if (el.matches(".tile") || (el.matches("input") && el.closest("label")) || el.closest(".testbench")) continue;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || st.visibility === "hidden" || st.display === "none") continue;
      if (r.width >= 48 && r.height >= 48) continue;
      const nombre = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("type") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      const clave = `${nombre}|${Math.round(r.width)}x${Math.round(r.height)}`;
      vistos.set(clave, { nombre, ancho: Math.round(r.width), alto: Math.round(r.height) });
    }
    return [...vistos.values()];
  });

/** Tamaño en pantalla de una casilla del mapa. */
const casilla = (page) =>
  page.evaluate(() => {
    const r = document.querySelector(".world-overlay .tile")?.getBoundingClientRect();
    return r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null;
  });

async function medir(browser, partida, nombre) {
  const perfil = PERFILES[nombre];
  // La primera visita, sin service worker: así se cuenta todo lo que se baja y nada
  // viene guardado. La segunda, en otro contexto con service worker (como en el móvil).
  const context = await browser.newContext({ ...MOVIL, serviceWorkers: "block" });
  await context.addInitScript(() => {
    window.__largas = [];
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__largas.push({ start: e.startTime, duration: e.duration }))).observe({
        type: "longtask",
        buffered: true,
      });
    } catch {
      /* sin longtask */
    }
  });
  const entrada = await context.request.post(`${BASE}/api/entrar`, { data: { codigo: partida.codigo } });
  if (!entrada.ok()) throw new Error(`entrar: ${entrada.status()} ${await entrada.text()}`);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  if (perfil.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: perfil.cpu });
  if (perfil.red) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...perfil.red });

  // Bytes descargados por tipo (lo que viaja por la red, ya comprimido).
  const tipos = new Map();
  const bytes = { js: 0, letras: 0, css: 0, api: 0, otros: 0 };
  cdp.on("Network.responseReceived", (e) => tipos.set(e.requestId, { tipo: e.type, url: e.response.url }));
  cdp.on("Network.loadingFinished", (e) => {
    const r = tipos.get(e.requestId);
    if (!r) return;
    const k = r.tipo === "Script" ? "js" : r.tipo === "Font" ? "letras" : r.tipo === "Stylesheet" ? "css" : r.url.includes("/api/") ? "api" : "otros";
    bytes[k] += e.encodedDataLength;
  });

  const url = `${BASE}/partida/${partida.id}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => performance.getEntriesByName("mapa-dibujado").length > 0, null, { timeout: 60_000 });
  // Lo bajado hasta ver el mapa (después se bajan las demás pestañas para tenerlas sin conexión).
  const descarga = { ...bytes };
  await page.waitForTimeout(300);
  const primera = await tiempos(page);

  // La repetición de la noche sale sola la primera vez.
  let repeticion = null;
  if (await page.locator(".board.replaying").count()) {
    repeticion = await fps(page, 3000);
    await page.getByRole("button", { name: "Saltar" }).click().catch(() => {});
  }

  // Arrastrar el mapa con el dedo.
  const caja = await page.locator(".map-viewport").boundingBox();
  let arrastre = null;
  if (caja) {
    const cx = Math.round(caja.x + caja.width / 2);
    const cy = Math.round(caja.y + Math.min(caja.height, 600) / 2);
    const [f] = await Promise.all([
      fps(page, 1500),
      cdp.send("Input.synthesizeScrollGesture", { x: cx, y: cy, xDistance: -300, yDistance: -200, gestureSourceType: "touch", speed: 400, repeatCount: 1 }),
    ]);
    arrastre = f;
  }

  // Lo que se toca, pestaña a pestaña, y las casillas de cerca y de todo el reino.
  const pequenos = {};
  const casillas = { cerca: await casilla(page) };
  const zoom = page.locator("button.zoom");
  if (await zoom.count()) {
    await zoom.click();
    await page.waitForTimeout(300);
    casillas.reino = await casilla(page);
    await zoom.click();
  }
  const pestanas = page.locator("nav.tabs button");
  for (let i = 0; i < (await pestanas.count()); i++) {
    const nombrePestana = (await pestanas.nth(i).innerText()).trim().split("\n")[0];
    await pestanas.nth(i).click();
    await page.waitForTimeout(300);
    pequenos[nombrePestana] = await tocables(page);
  }

  await context.close();

  // Segunda visita: con lo que hayan guardado el navegador y el service worker en la primera.
  const again = await browser.newContext(MOVIL);
  await again.request.post(`${BASE}/api/entrar`, { data: { codigo: partida.codigo } });
  const page2 = await again.newPage();
  const cdp2 = await again.newCDPSession(page2);
  if (perfil.cpu > 1) await cdp2.send("Emulation.setCPUThrottlingRate", { rate: perfil.cpu });
  if (perfil.red) {
    await cdp2.send("Network.enable");
    await cdp2.send("Network.emulateNetworkConditions", { offline: false, ...perfil.red });
  }
  await page2.goto(url, { waitUntil: "load" });
  await page2.waitForFunction(() => performance.getEntriesByName("mapa-dibujado").length > 0, null, { timeout: 60_000 });
  await page2.evaluate(() => navigator.serviceWorker?.ready);
  await page2.waitForTimeout(3000);
  await page2.goto("about:blank");
  await page2.goto(url, { waitUntil: "load" });
  await page2.waitForFunction(() => performance.getEntriesByName("mapa-dibujado").length > 0, null, { timeout: 60_000 });
  const segunda = await tiempos(page2);
  await again.close();
  return { perfil: nombre, descarga, primera, segunda, repeticion, arrastre, casillas, pequenos };
}

const kb = (b) => `${Math.round(b / 1024)} KB`;
const s = (ms) => (ms == null ? "?" : `${(ms / 1000).toFixed(2).replace(".", ",")} s`);

function tabla(rs) {
  const fila = (q, f) => `| ${q} | ${rs.map(f).join(" | ")} |`;
  const lineas = [
    `| Qué | ${rs.map((r) => (r.perfil === "flojo" ? "Móvil flojo y 4G lenta" : "Móvil normal")).join(" | ")} |`,
    `| --- | ${rs.map(() => "---").join(" | ")} |`,
    fila("Descarga de la primera visita", (r) => {
      const d = r.descarga;
      return `${kb(d.js + d.letras + d.css)} (JS ${Math.round(d.js / 1024)}, letras ${Math.round(d.letras / 1024)}, CSS ${Math.round(d.css / 1024)})`;
    }),
    fila("Se ve la página", (r) => s(r.primera.pagina)),
    fila("Se ve la vista previa del mapa", (r) => (r.primera.previa == null ? "no hay" : s(r.primera.previa))),
    fila("Se ve el mapa", (r) => s(r.primera.mapa)),
    fila("Pantalla congelada mientras se dibuja el mapa", (r) => s(r.primera.congelada)),
    fila("Se ve el mapa en la segunda visita", (r) => s(r.segunda.mapa)),
    fila("Fluidez al arrastrar el mapa", (r) => (r.arrastre == null ? "?" : `${r.arrastre} imágenes/s`)),
    fila("Fluidez de la repetición de la noche", (r) => (r.repeticion == null ? "no salió" : `${r.repeticion} imágenes/s`)),
    fila("Casilla de cerca / de todo el reino", (r) => `${r.casillas.cerca ?? "?"} / ${r.casillas.reino ?? "?"}`),
  ];
  return lineas.join("\n");
}

if (!CHROME) {
  console.error("No encuentro Chromium: pon CHROMIUM=/ruta/al/chrome.");
  process.exit(1);
}
const partida = partidaArg ? { id: Number(partidaArg), codigo: process.env.CODIGO } : await prepararPartida();
if (!partida.codigo) {
  console.error("Con --partida hace falta el código para entrar en CODIGO=...");
  process.exit(1);
}
const browser = await chromium.launch({ executablePath: CHROME });
const resultados = [];
for (const nombre of solo ? [solo] : ["normal", "flojo"]) resultados.push(await medir(browser, partida, nombre));
await browser.close();

console.log(`Partida ${partida.id} (código ${partida.codigo})\n`);
console.log(tabla(resultados));
const pequenos = resultados[0].pequenos;
// Lo de la cabecera sale en todas las pestañas: cada cosa se cuenta y se apunta una vez.
const vistos = new Set();
const unicos = Object.entries(pequenos).map(([pestana, lista]) => [
  pestana,
  lista.filter((t) => {
    const k = `${t.nombre}|${t.ancho}x${t.alto}`;
    return !vistos.has(k) && vistos.add(k);
  }),
]);
const total = unicos.flatMap(([, l]) => l);
console.log(`\nMenos de 48 px: ${total.length} (de ellas, menos de 44 px: ${total.filter((t) => t.ancho < 44 || t.alto < 44).length})`);
for (const [pestana, lista] of unicos) {
  if (lista.length) console.log(`- ${pestana}: ${lista.map((t) => `${t.nombre} ${t.ancho}x${t.alto}`).join(" · ")}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ partida, resultados }, null, 2));
