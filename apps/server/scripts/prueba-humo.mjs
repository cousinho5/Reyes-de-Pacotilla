// Prueba de humo de la API contra un servidor local (npm run dev:server).
// Simula una partida de 4 casas: crear, unirse, empezar, actuar, dar órdenes
// y comprobar la niebla de guerra. Uso:
//   node apps/server/scripts/prueba-humo.mjs [http://localhost:8787] [clave-admin]
// Devuelve el id de la partida para poder lanzar después el cron a mano.

const BASE = process.argv[2] ?? "http://localhost:8787";
const ADMIN = process.argv[3] ?? "admin-local";

function client(name) {
  let cookie = "";
  return async function call(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, name };
  };
}

let failures = 0;
function check(label, cond, detail) {
  console.log(`${cond ? "✓" : "✗"} ${label}${cond ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!cond) failures++;
}

const pablo = client("Pablo");
const created = await pablo("POST", "/api/partidas", { nombre: "Piloto de prueba", semanas: 2, creador: "Pablo" }, { "x-admin": ADMIN });
check("crear partida con la clave de administración", created.status === 200 && created.data.codigoAcceso?.length === 6, created);
const sinClave = await client("x")("POST", "/api/partidas", { nombre: "No" });
check("sin clave no se puede crear partida", sinClave.status === 403, sinClave);

const invite = created.data.codigoInvitacion;
const gameId = created.data.id;
const info = await pablo("GET", `/api/invitacion/${invite}`);
check("la invitación muestra 8 colores libres", info.data.coloresLibres?.length === 8, info.data);

const joinPablo = await pablo("POST", `/api/invitacion/${invite}/unirse`, { casa: "Casa del Nabo", color: "azur", lema: "Nabus Vincit" });
check("Pablo se une con su sesión", joinPablo.status === 200, joinPablo);

const others = [
  ["Marta", "Casa Roca", "gules"],
  ["Dani", "Casa del Pato", "sinople"],
  ["Lucía", "Casa Bota", "sable"],
];
const players = [];
for (const [nombre, casa, color] of others) {
  const p = client(nombre);
  const r = await p("POST", `/api/invitacion/${invite}/unirse`, { nombre, casa, color });
  check(`${nombre} se une y recibe su código`, r.status === 200 && r.data.codigoAcceso?.length === 6, r);
  players.push({ call: p, code: r.data.codigoAcceso });
}
const repeated = await client("Intruso")("POST", `/api/invitacion/${invite}/unirse`, { nombre: "X", casa: "Casa X", color: "azur" });
check("no se puede repetir color", repeated.status === 409, repeated);

const notCreator = await players[0].call("POST", `/api/partidas/${gameId}/empezar`, {});
check("solo quien crea puede empezar", notCreator.status === 403, notCreator);
const start = await pablo("POST", `/api/partidas/${gameId}/empezar`, { inicio: "2026-10-19" });
check("empezar la partida el lunes 19", start.status === 200, start);

// Entrar con el código desde otro dispositivo (como el iPhone instalado).
const other = client("Marta en el móvil");
const login = await other("POST", "/api/entrar", { codigo: players[0].code });
check("entrar con el código de acceso", login.status === 200, login);
const bad = await client("x")("POST", "/api/entrar", { codigo: "ZZZZZZ" });
check("un código falso no entra", bad.status === 401, bad);

const state = await pablo("GET", `/api/partidas/${gameId}`);
const s = state.data;
check("estado: 4 casas, mapa 5x4 y 20 casillas", s.casas?.length === 4 && s.partida.columnas === 5 && s.casillas?.length === 20, s.partida);
check("recursos iniciales de 10", Object.values(s.yo.recursos).every((v) => v === 10), s.yo.recursos);
check("producción inicial de 14 al día", Object.values(s.yo.produccionDiaria).reduce((a, b) => a + b, 0) === 14, s.yo.produccionDiaria);
const hidden = s.casillas.filter((t) => !t.visible);
check("niebla de guerra: hay casillas ocultas y sin tropas", hidden.length > 0 && hidden.every((t) => t.troops === null), hidden.length);
const marta = await players[0].call("GET", `/api/partidas/${gameId}`);
check("nadie ve el código de invitación salvo el creador", marta.data.partida.codigoInvitacion === null, marta.data.partida);

const upgrade = await pablo("POST", `/api/partidas/${gameId}/mejorar`, { edificio: "cantera" });
check("mejorar sin recursos suficientes falla", upgrade.status === 409, upgrade);
const recruit = await pablo("POST", `/api/partidas/${gameId}/reclutar`, { cantidad: 2 });
check("reclutar 2 tropas", recruit.status === 200, recruit);

const after = (await pablo("GET", `/api/partidas/${gameId}`)).data;
const castle = after.casillas.find((t) => t.type === "castillo" && t.owner === after.yo.casa);
check("el castillo tiene 8 tropas (6 + 2)", castle.troops === 8, castle);
check("reclutar cobra 4 de Hierro y 4 de Pan", after.yo.recursos.hierro === 6 && after.yo.recursos.pan === 6, after.yo.recursos);

const adjacent = after.casillas.filter(
  (t) => Math.abs(t.x - castle.x) + Math.abs(t.y - castle.y) === 1 && t.owner === null,
);
const target = adjacent.sort((a, b) => a.troops - b.troops)[0];
const far = after.casillas.find((t) => Math.abs(t.x - castle.x) + Math.abs(t.y - castle.y) > 1);
const badOrder = await pablo("PUT", `/api/partidas/${gameId}/ordenes`, { ordenes: [{ tipo: "mover", desde: castle.id, hacia: far.id, tropas: 3 }] });
check("una orden a una casilla no adyacente se rechaza", badOrder.status === 400, badOrder);
const order = await pablo("PUT", `/api/partidas/${gameId}/ordenes`, { ordenes: [{ tipo: "mover", desde: castle.id, hacia: target.id, tropas: 8 }] });
check(`orden: 8 tropas contra ${target.nombre} (${target.troops})`, order.status === 200, order);

// --- MVP 2: objetivo secreto y ausencia ---
const obj = after.yo.objetivo;
check("objetivo secreto: dos opciones y se puede elegir", obj.opciones.length === 2 && obj.puedeElegir, obj);
const pick = await pablo("POST", `/api/partidas/${gameId}/objetivo`, { clave: obj.opciones[1].clave });
const wrongPick = await pablo("POST", `/api/partidas/${gameId}/objetivo`, { clave: "inventado" });
const afterPick = (await pablo("GET", `/api/partidas/${gameId}`)).data;
check("elegir objetivo (y no uno inventado)", pick.status === 200 && wrongPick.status === 400 && afterPick.yo.objetivo.elegido.clave === obj.opciones[1].clave, afterPick.yo.objetivo);
const others0 = (await players[0].call("GET", `/api/partidas/${gameId}`)).data;
check("nadie ve el objetivo de los demás", others0.casas.every((h) => h.objetivo === null), others0.casas);
await pablo("POST", `/api/partidas/${gameId}/ausencia`, { plantilla: "defensiva" });
check("plantilla del piloto automático", (await pablo("GET", `/api/partidas/${gameId}`)).data.yo.ausencia.plantilla === "defensiva");

// --- MVP 2: comercio ---
const totalMadera = async () => {
  let t = 0;
  for (const p of [pablo, ...players.map((x) => x.call)]) t += (await p("GET", `/api/partidas/${gameId}`)).data.yo.recursos.madera;
  return t;
};
const before = await totalMadera();
const offer = await pablo("POST", `/api/partidas/${gameId}/ofertas`, { para: null, da: { madera: 10 }, pide: { piedra: 10 } });
check("publicar oferta en el mercado", offer.status === 200, offer);
const market = (await players[1].call("GET", `/api/partidas/${gameId}`)).data.ofertas;
const pub = market.find((o) => o.de === after.yo.casa && o.estado === "open");
check("las demás casas ven la oferta pública", !!pub, market);
const [r1, r2] = await Promise.all([
  players[1].call("POST", `/api/partidas/${gameId}/ofertas/${pub.id}/aceptar`),
  players[2].call("POST", `/api/partidas/${gameId}/ofertas/${pub.id}/aceptar`),
]);
check("dos aceptaciones a la vez: solo gana una", [r1.status, r2.status].sort().join() === "200,409", [r1, r2]);
check("la madera total del reino no cambia", (await totalMadera()) === before);
const ps = (await pablo("GET", `/api/partidas/${gameId}`)).data;
check("el trato cuenta para el comercio de Pablo (2 de Prestigio)", ps.casas.find((h) => h.id === ps.yo.casa).prestigio.comercio === 2, ps.casas);
check("el trato aparece en los tratos del reino", ps.tratos.length === 1 && ps.tratos[0].valido === true, ps.tratos);

const martaId = others0.yo.casa;
const directed = await pablo("POST", `/api/partidas/${gameId}/ofertas`, { para: martaId, da: { oro: 10 }, pide: { pan: 400 } });
const md = (await players[0].call("GET", `/api/partidas/${gameId}`)).data;
const forMarta = md.ofertas.find((o) => o.para === martaId && o.estado === "open");
const cant = await players[0].call("POST", `/api/partidas/${gameId}/ofertas/${forMarta.id}/aceptar`);
check("oferta dirigida: si no puedes pagar, no se acepta", directed.status === 200 && cant.status === 409, cant);
const intruder = await players[2].call("POST", `/api/partidas/${gameId}/ofertas/${forMarta.id}/aceptar`);
check("una oferta dirigida no la acepta otra casa", intruder.status === 403, intruder);
const counter = await players[0].call("POST", `/api/partidas/${gameId}/ofertas`, { contraofertaDe: forMarta.id, da: { pan: 5 }, pide: { oro: 10 } });
const pc = (await pablo("GET", `/api/partidas/${gameId}`)).data;
const back = pc.ofertas.find((o) => o.para === pc.yo.casa && o.estado === "open");
const original = pc.ofertas.find((o) => o.id === forMarta.id);
check("contraoferta: llega a Pablo y cierra la original", counter.status === 200 && !!back && original.estado === "countered", { counter, original });
const reject = await pablo("POST", `/api/partidas/${gameId}/ofertas/${back.id}/rechazar`);
check("rechazar la contraoferta", reject.status === 200, reject);
for (let i = 0; i < 3; i++) await pablo("POST", `/api/partidas/${gameId}/ofertas`, { para: null, da: { oro: 1 }, pide: { pan: 1 } });
const fourth = await pablo("POST", `/api/partidas/${gameId}/ofertas`, { para: null, da: { oro: 1 }, pide: { pan: 1 } });
check("como mucho 3 ofertas públicas abiertas", fourth.status === 409, fourth);
const sameRes = await pablo("POST", `/api/partidas/${gameId}/ofertas`, { para: null, da: { oro: 1 }, pide: { oro: 2 } });
check("no se puede dar y pedir el mismo recurso", sameRes.status === 400, sameRes);

// --- MVP 2: notificaciones ---
const key = await pablo("GET", "/api/push/clave");
const sub = await pablo("POST", "/api/push/suscribir", { endpoint: "https://push.example.invalid/abc", keys: { p256dh: "x", auth: "y" } });
check("suscripción a avisos", sub.status === 200 && (key.data.clave === null || key.data.clave.length > 80), { key, sub });

console.log(JSON.stringify({ gameId, castle: castle.id, target: target.id, targetTroops: target.troops }));
if (failures > 0) {
  console.error(`${failures} comprobaciones fallidas`);
  process.exit(1);
}
