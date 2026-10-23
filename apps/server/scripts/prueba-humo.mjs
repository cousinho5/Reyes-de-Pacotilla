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

const joinPablo = await pablo("POST", `/api/invitacion/${invite}/unirse`, {
  casa: "Casa del Nabo",
  color: "azur",
  lema: "Nabus Vincit",
  forma: "espanol",
  division: "partido",
  color2: "gules",
  simbolo: "nabo",
  metal: "plata",
});
check("Pablo se une con su sesión y su escudo", joinPablo.status === 200, joinPablo);
const copion = await client("Copión")("POST", `/api/invitacion/${invite}/unirse`, {
  nombre: "Copión",
  casa: "Casa Copia",
  color: "leonado",
  forma: "espanol",
  division: "pleno",
  color2: null,
  simbolo: "nabo",
  metal: "oro",
});
check("no se puede repetir forma y símbolo", copion.status === 409 && /símbolo/.test(copion.data.error ?? ""), copion);
const retoque = await pablo("PUT", `/api/partidas/${gameId}/casa`, {
  casa: "Casa del Nabo",
  color: "azur",
  lema: "Nabus Vincit",
  forma: "rodela",
  division: "tronchado",
  color2: "sinople",
  simbolo: "nabo",
  metal: "oro",
});
const lobby = await pablo("GET", `/api/partidas/${gameId}`);
check(
  "en la sala de espera se retoca el escudo",
  retoque.status === 200 && lobby.data.casas?.[0]?.escudo?.forma === "rodela" && lobby.data.casas[0].escudo.division === "tronchado",
  { retoque, casas: lobby.data.casas },
);

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
// El lunes que viene: así las órdenes de la primera noche siguen abiertas sea cuando sea.
const hoyMadrid = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const lunes = new Date(`${hoyMadrid}T12:00:00Z`);
lunes.setUTCDate(lunes.getUTCDate() + ((8 - lunes.getUTCDay()) % 7 || 7));
const start = await pablo("POST", `/api/partidas/${gameId}/empezar`, { inicio: lunes.toISOString().slice(0, 10) });
check(`empezar la partida el lunes ${lunes.getUTCDate()}`, start.status === 200, start);

// Entrar con el código desde otro dispositivo (como el iPhone instalado).
const other = client("Marta en el móvil");
const login = await other("POST", "/api/entrar", { codigo: players[0].code });
check("entrar con el código de acceso", login.status === 200, login);
const bad = await client("x")("POST", "/api/entrar", { codigo: "ZZZZZZ" });
check("un código falso no entra", bad.status === 401, bad);

const state = await pablo("GET", `/api/partidas/${gameId}`);
const s = state.data;
check(
  "estado: 4 casas, mapa hexagonal 6x5 y 30 casillas, una resolución al día (14 en 2 semanas)",
  s.casas?.length === 4 && s.partida.columnas === 6 && s.casillas?.length === 30 && s.partida.totalResoluciones === 14,
  s.partida,
);
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

// Cambio con la Corona (bloque 5): solo el precio llega al cliente; el total se pide antes de comprar.
const dani = players[1].call;
const daniState = (await dani("GET", `/api/partidas/${gameId}`)).data;
const precios = daniState.corona?.precios ?? {};
check(
  "la Corona da el precio de Pan, Madera, Piedra y Hierro, y nada del reino",
  ["pan", "madera", "piedra", "hierro"].every((r) => precios[r] > 0) && Object.keys(daniState.corona ?? {}).join() === "precios",
  daniState.corona,
);
const quote = await dani("POST", `/api/partidas/${gameId}/corona/presupuesto`, { recurso: "pan", unidades: 2 });
const wrong = await dani("POST", `/api/partidas/${gameId}/corona/comprar`, { recurso: "pan", unidades: 2, oro: quote.data.oro - 1 });
check("comprar a la Corona con un precio viejo no compra", wrong.status === 409 && wrong.data.oro === quote.data.oro, wrong);
const bought = await dani("POST", `/api/partidas/${gameId}/corona/comprar`, { recurso: "pan", unidades: 2, oro: quote.data.oro });
const daniAfter = (await dani("GET", `/api/partidas/${gameId}`)).data;
check(
  `comprar 2 de Pan a la Corona por ${quote.data.oro} de Oro`,
  bought.status === 200 && daniAfter.yo.recursos.pan === 12 && daniAfter.yo.recursos.oro === 10 - quote.data.oro && daniAfter.corona.precios.pan > precios.pan,
  { bought, recursos: daniAfter.yo.recursos },
);
const tooMuch = await dani("POST", `/api/partidas/${gameId}/corona/presupuesto`, { recurso: "hierro", unidades: 40 });
const broke = await dani("POST", `/api/partidas/${gameId}/corona/comprar`, { recurso: "hierro", unidades: 40, oro: tooMuch.data.oro });
check("sin Oro suficiente la Corona no vende", broke.status === 409, broke);

// Mercenarios de alquiler (bloque 5): 6 de Oro cada uno, en el castillo, se van a los 7 días.
const lucia = players[2].call;
const hire = await lucia("POST", `/api/partidas/${gameId}/mercenarios`, { cantidad: 1 });
const luciaAfter = (await lucia("GET", `/api/partidas/${gameId}`)).data;
const luciaCastle = luciaAfter.casillas.find((t) => t.type === "castillo" && t.owner === luciaAfter.yo.casa);
check(
  "contratar 1 mercenario: 6 de Oro, una tropa más en el castillo y se va a los 7 días",
  hire.status === 200 &&
    luciaAfter.yo.recursos.oro === 4 &&
    luciaCastle.troops === 7 &&
    luciaAfter.mercenarios?.grupos?.[0]?.seVan ===
      new Date(Date.parse(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())}T12:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10),
  { hire, mercenarios: luciaAfter.mercenarios },
);
const poor = await lucia("POST", `/api/partidas/${gameId}/mercenarios`, { cantidad: 1 });
check("sin Oro no hay mercenarios", poor.status === 409, poor);

const adjacent = after.casillas.filter(
  (t) => Math.abs(t.x - castle.x) + Math.abs(t.y - castle.y) === 1 && t.owner === null,
);
const target = adjacent.sort((a, b) => a.troops - b.troops)[0];
const far = after.casillas.find((t) => Math.abs(t.x - castle.x) + Math.abs(t.y - castle.y) > 1);
const badOrder = await pablo("PUT", `/api/partidas/${gameId}/ordenes`, { ordenes: [{ tipo: "mover", desde: castle.id, hacia: far.id, tropas: 3 }] });
check("una orden a una casilla no adyacente se rechaza", badOrder.status === 400, badOrder);
const order = await pablo("PUT", `/api/partidas/${gameId}/ordenes`, { ordenes: [{ tipo: "mover", desde: castle.id, hacia: target.id, tropas: 8 }] });
check(`orden: 8 tropas contra ${target.nombre} (${target.troops})`, order.status === 200, order);

// Bloque 12: «Repetir cada noche» solo en asedios y defensas, y el aviso de cierre se puede apagar.
const repeatMove = await pablo("PUT", `/api/partidas/${gameId}/ordenes`, {
  ordenes: [{ tipo: "mover", desde: castle.id, hacia: target.id, tropas: 8, repetir: true }],
});
check("un ataque no se puede repetir cada noche", repeatMove.status === 400, repeatMove);
const repeatDefense = await pablo("PUT", `/api/partidas/${gameId}/ordenes`, {
  ordenes: [{ tipo: "apoyar", desde: castle.id, hacia: target.id, apoyaDesde: null, tropas: 2, repetir: true }],
});
const withRepeat = (await pablo("GET", `/api/partidas/${gameId}`)).data.ordenes ?? [];
check("una defensa se guarda con «Repetir cada noche»", repeatDefense.status === 200 && withRepeat.length === 1 && withRepeat[0].repetir === true, { repeatDefense, withRepeat });
await pablo("PUT", `/api/partidas/${gameId}/ordenes`, { ordenes: [{ tipo: "mover", desde: castle.id, hacia: target.id, tropas: 8 }] });
const warnOff = await pablo("POST", `/api/partidas/${gameId}/aviso-cierre`, { activo: false });
const warnState = (await pablo("GET", `/api/partidas/${gameId}`)).data.yo.avisoCierre;
await pablo("POST", `/api/partidas/${gameId}/aviso-cierre`, { activo: true });
check("el aviso 1 hora antes del cierre se puede apagar", warnOff.status === 200 && warnState === false, { warnOff, warnState });

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
// Bloque 10: frase corta de 80 letras como mucho.
const larga = await players[0].call("POST", `/api/partidas/${gameId}/ofertas`, { para: null, da: { pan: 1 }, pide: { oro: 1 }, frase: "a".repeat(81) });
await players[0].call("POST", `/api/partidas/${gameId}/ofertas`, { para: null, da: { pan: 1 }, pide: { oro: 1 }, frase: "  Busco   Oro para la muralla. " });
const conFrase = (await pablo("GET", `/api/partidas/${gameId}`)).data.ofertas.find((o) => o.de === martaId && o.estado === "open" && o.frase);
check("frase corta en la oferta (más de 80 letras no)", larga.status === 400 && conFrase?.frase === "Busco Oro para la muralla.", { larga, conFrase });

// --- Bloque 8: alianzas ---
const martaCall = players[0].call;
const daniCall = players[1].call;
const luciaCall = players[2].call;
const daniId = (await daniCall("GET", `/api/partidas/${gameId}`)).data.yo.casa;
const luciaId = (await luciaCall("GET", `/api/partidas/${gameId}`)).data.yo.casa;
const pabloId = after.yo.casa;
const nombre = (await pablo("GET", `/api/partidas/${gameId}/alianzas/nombre`)).data.nombre;
const inventado = await pablo("POST", `/api/partidas/${gameId}/alianzas`, { casa: martaId, nombre: "Liga de los Listos" });
check(`Fray Abundio pone el nombre (${nombre}); uno inventado no vale`, typeof nombre === "string" && /^\S+/.test(nombre) && inventado.status === 400, { nombre, inventado });
const propuesta = await pablo("POST", `/api/partidas/${gameId}/alianzas`, { casa: martaId, nombre });
const repetida = await pablo("POST", `/api/partidas/${gameId}/alianzas`, { casa: martaId });
check("proponer una alianza a Marta (y solo una a la vez)", propuesta.status === 200 && repetida.status === 409, { propuesta, repetida });
const aid = propuesta.data.id;
const martaVe = (await martaCall("GET", `/api/partidas/${gameId}`)).data.alianzas;
const daniVe = (await daniCall("GET", `/api/partidas/${gameId}`)).data.alianzas;
check(
  "la propuesta solo la ven las dos casas",
  martaVe.propuestas.some((p) => p.id === aid && p.de === pabloId && p.caducaTras === 3) && daniVe.propuestas.length === 0,
  { martaVe, daniVe },
);
const intrusa = await daniCall("POST", `/api/partidas/${gameId}/alianzas/${aid}/aceptar`);
const propia = await pablo("POST", `/api/partidas/${gameId}/alianzas/${aid}/aceptar`);
check("ni otra casa ni quien propone pueden aceptarla", intrusa.status === 403 && propia.status === 409, { intrusa, propia });
const firma = await martaCall("POST", `/api/partidas/${gameId}/alianzas/${aid}/aceptar`);
const registro = (await daniCall("GET", `/api/partidas/${gameId}`)).data;
check(
  "Marta acepta: la alianza está en el registro público desde la primera resolución",
  firma.status === 200 && registro.alianzas.lista.some((a) => a.id === aid && a.estado === "activa" && a.desde === 1) &&
    registro.eventos.some((e) => e.tipo === "alianza" && e.datos.name === nombre),
  { firma, lista: registro.alianzas.lista },
);
const pabloVe = (await pablo("GET", `/api/partidas/${gameId}`)).data;
const castilloMarta = pabloVe.casillas.find((t) => t.type === "castillo" && t.owner === martaId);
check("visión compartida: Pablo ve las tropas del castillo de Marta", castilloMarta?.troops != null, castilloMarta);
const rota = await martaCall("POST", `/api/partidas/${gameId}/alianzas/${aid}/romper`);
const otraVez = await martaCall("POST", `/api/partidas/${gameId}/alianzas`, { casa: daniId });
const aviso = (await luciaCall("GET", `/api/partidas/${gameId}`)).data.alianzas.lista.find((a) => a.id === aid);
check(
  "Marta rompe: tres noches de aviso (termina tras la 3) y no puede firmar otra",
  rota.status === 200 && rota.data.terminaTras === 3 && aviso?.estado === "aviso" && aviso.rotaPor === martaId && otraVez.status === 409,
  { rota, aviso, otraVez },
);
const sinVision = (await pablo("GET", `/api/partidas/${gameId}`)).data.casillas.find((t) => t.id === castilloMarta.id);
check("durante el aviso se corta la visión compartida", sinVision.troops === null, sinVision);
const aDani = await luciaCall("POST", `/api/partidas/${gameId}/alianzas`, { casa: daniId });
const rechazo = await daniCall("POST", `/api/partidas/${gameId}/alianzas/${aDani.data.id}/rechazar`);
const aPablo = await luciaCall("POST", `/api/partidas/${gameId}/alianzas`, { casa: pabloId });
const retiro = await luciaCall("POST", `/api/partidas/${gameId}/alianzas/${aPablo.data.id}/retirar`);
const tarde = await pablo("POST", `/api/partidas/${gameId}/alianzas/${aPablo.data.id}/aceptar`);
check("rechazar y retirar propuestas (una retirada ya no se acepta)", rechazo.status === 200 && retiro.status === 200 && tarde.status === 404, { rechazo, retiro, tarde });

// Fin del aviso en una partida de prueba (con reloj simulado): Pablo maneja dos casas.
const prueba = await pablo("POST", "/api/partidas", { nombre: "Alianzas de prueba", semanas: 2, prueba: true, bots: 3 }, { "x-admin": ADMIN });
const pruebaInfo = await pablo("GET", `/api/invitacion/${prueba.data.codigoInvitacion}`);
await pablo("POST", `/api/invitacion/${prueba.data.codigoInvitacion}/unirse`, { casa: "Casa del Nabo", color: pruebaInfo.data.coloresLibres[0] });
await pablo("POST", `/api/partidas/${prueba.data.id}/empezar`, { inicio: lunes.toISOString().slice(0, 10) });
const pruebaState = (await pablo("GET", `/api/partidas/${prueba.data.id}`)).data;
const yoPrueba = pruebaState.yo.casa;
const bot = pruebaState.prueba.casas.find((h) => h.bot).id;
const pacto = await pablo("POST", `/api/partidas/${prueba.data.id}/alianzas`, { casa: bot });
await pablo("POST", `/api/partidas/${prueba.data.id}/prueba/jugar-como`, { casa: bot });
const firmaBot = await pablo("POST", `/api/partidas/${prueba.data.id}/alianzas/${pacto.data.id}/aceptar`);
const rompeBot = await pablo("POST", `/api/partidas/${prueba.data.id}/alianzas/${pacto.data.id}/romper`);
await pablo("POST", `/api/partidas/${prueba.data.id}/prueba/jugar-como`, { casa: yoPrueba });
// Bloque 10: una oferta que nadie quiere caduca a las tres resoluciones.
await pablo("POST", `/api/partidas/${prueba.data.id}/ofertas`, { para: null, da: { pan: 1 }, pide: { oro: 300 } });
const caro = (await pablo("GET", `/api/partidas/${prueba.data.id}`)).data.ofertas.find((o) => o.de === yoPrueba && o.estado === "open");
const vivas = [];
for (let i = 0; i < 3; i++) {
  await pablo("POST", `/api/partidas/${prueba.data.id}/prueba/avanzar`, { hasta: "resolucion" });
  vivas.push((await pablo("GET", `/api/partidas/${prueba.data.id}`)).data.ofertas.find((o) => o.id === caro.id)?.estado);
}
const trasAviso = (await pablo("GET", `/api/partidas/${prueba.data.id}`)).data;
const caducada = trasAviso.ofertas.find((o) => o.id === caro.id);
check(
  "una oferta caduca tras tres resoluciones",
  caro.caducaTras === 3 && vivas[0] === "open" && vivas[1] === "open" && caducada?.estado === "cancelled" && caducada.caducada === true,
  { caro, vivas, caducada },
);
check(
  "en la prueba: firmada, rota y, tras tres resoluciones, deja de existir",
  firmaBot.status === 200 && rompeBot.status === 200 && trasAviso.partida.resolucionActual === 3 &&
    !trasAviso.alianzas.lista.some((a) => a.id === pacto.data.id) && trasAviso.eventos.some((e) => e.tipo === "alianza_fin" && e.datos.id === pacto.data.id),
  { firmaBot, rompeBot, resolucion: trasAviso.partida.resolucionActual, lista: trasAviso.alianzas.lista },
);
// Bloque 3: tras la resolución del miércoles sale la hoja volandera, y cada casa puede dejar su proclama.
const volandera = trasAviso.boletines?.find((b) => b.semana === 1 && b.edicion === "miercoles");
const hoja = await pablo("GET", `/api/partidas/${prueba.data.id}/boletin/1?edicion=miercoles`);
check(
  "la hoja volandera del miércoles se publica y se lee",
  volandera != null && hoja.status === 200 && hoja.data.edition === "miercoles" && hoja.data.sections[0]?.title === "Hoja volandera",
  { boletines: trasAviso.boletines, hoja },
);
const conEnlace = await pablo("PUT", `/api/partidas/${prueba.data.id}/proclama`, { texto: "Visitad nabo.com" });
const proclama = await pablo("PUT", `/api/partidas/${prueba.data.id}/proclama`, { texto: "  Que tiemblen   los vecinos " });
const conProclama = (await pablo("GET", `/api/partidas/${prueba.data.id}`)).data.proclama;
check(
  "proclama sin enlaces, guardada para el domingo",
  conEnlace.status === 400 && proclama.status === 200 && conProclama?.texto === "Que tiemblen los vecinos" && conProclama.semana === 1,
  { conEnlace, proclama, conProclama },
);
const borrada = await pablo("DELETE", `/api/partidas/${prueba.data.id}`);
check("borrar la partida de prueba entera", borrada.status === 200, borrada);

// --- MVP 2: notificaciones ---
const key = await pablo("GET", "/api/push/clave");
const sub = await pablo("POST", "/api/push/suscribir", { endpoint: "https://push.example.invalid/abc", keys: { p256dh: "x", auth: "y" } });
check("suscripción a avisos", sub.status === 200 && (key.data.clave === null || key.data.clave.length > 80), { key, sub });

console.log(JSON.stringify({ gameId, castle: castle.id, target: target.id, targetTroops: target.troops }));
if (failures > 0) {
  console.error(`${failures} comprobaciones fallidas`);
  process.exit(1);
}
