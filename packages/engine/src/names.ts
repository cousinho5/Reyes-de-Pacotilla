// Reserva de nombres de casillas neutrales (documento de diseño, sección 6.3).
// Hay 8 por tipo para que alcancen en mapas de 8 casas. Cada nombre lleva su
// nota del cronista, que se muestra al tocar la casilla.

import type { TileType } from "./types";

export interface TileName {
  name: string;
  note: string;
}

export const TILE_NAMES: Record<Exclude<TileType, "castillo">, TileName[]> = {
  campos: [
    { name: "Villa Mediocre", note: "Ni fu ni fa, pero da pan." },
    { name: "La Vega Regular", note: "Su mayor logro es no inundarse." },
    { name: "Los Trigales de Nadie", note: "Hasta que alguien los reclame." },
    { name: "Prado Pisoteado", note: "Ha visto pasar demasiados ejércitos." },
    { name: "Huerta del Vecino", note: "Siempre más verde que la tuya." },
    { name: "El Llano de las Ocas", note: "Las ocas mandan; los campesinos obedecen." },
    { name: "Campo del Bostezo", note: "Nadie recuerda haber visto aquí nada interesante." },
    { name: "Las Eras del Abuelo", note: "El abuelo sigue diciendo que son suyas." },
  ],
  bosque: [
    { name: "El Bosque Que Da un Poco de Miedo", note: "Solo un poco." },
    { name: "Pinar del Hacha Perdida", note: "Si alguien la encuentra, que la devuelva." },
    { name: "Arboleda del Eco Tímido", note: "El eco contesta, pero bajito." },
    { name: "Bosque de los Mil Mosquitos", note: "Mil, como mínimo." },
    { name: "La Espesura Exagerada", note: "El cronista no ha entrado y no piensa hacerlo." },
    { name: "Robledal del Leñador Jubilado", note: "Se jubiló el leñador; los robles, no." },
    { name: "El Soto de las Setas Dudosas", note: "Se recomienda no probarlas." },
    { name: "Hayedo del Atajo Largo", note: "El atajo tarda el doble, pero es más bonito." },
  ],
  cantera: [
    { name: "Roca Tozuda", note: "No se mueve ni a martillazos." },
    { name: "El Agujero Grande", note: "Antes era una colina." },
    { name: "Pedregal de las Rodillas", note: "Ya sabréis por qué." },
    { name: "Cantera del Último Piedrazo", note: "Siempre queda uno más." },
    { name: "La Pedrera Bostezante", note: "Hasta las piedras se aburren aquí." },
    { name: "Peña del Canto Rodado", note: "Rueda, pero despacio." },
    { name: "Las Losas Torcidas", note: "Las cortaron con mucho entusiasmo y poca regla." },
    { name: "Cantera del Eco Repetido", note: "Repetido. Repetido." },
  ],
  montana: [
    { name: "Monte Cuestarriba", note: "El nombre lo dice todo." },
    { name: "Pico del Resoplido", note: "Se sube resoplando y se baja rodando." },
    { name: "Minas de Ya Veremos", note: "Productivas, según el último informe." },
    { name: "Cerro del Burro Cansado", note: "El burro sigue allí, cansado." },
    { name: "La Montaña Que Antes Era Más Alta", note: "Culpa de los mineros." },
    { name: "Sierra del Herrero Sordo", note: "Lleva treinta años a martillazos." },
    { name: "El Risco del Vértigo", note: "No mires abajo. Ni arriba, por si acaso." },
    { name: "Minas del Fondo Sin Fondo", note: "Tienen fondo; nadie ha llegado." },
  ],
  puerto: [
    { name: "Puerto Regateo", note: "Aquí nadie paga el primer precio." },
    { name: "Muelle del Cangrejo Sospechoso", note: "Vigilad las bolsas." },
    { name: "Cala de los Contrabandistas Honrados", note: "Honrados a su manera." },
    { name: "Puerto Gaviota Ladrona", note: "Se llevó la corona de un turista." },
    { name: "Desembarcadero Mojado", note: "Tal cual." },
    { name: "Embarcadero del Remo Roto", note: "Se llega, pero cuesta volver." },
    { name: "La Dársena del Pescado de Ayer", note: "Huele a lo que se imagina." },
    { name: "Puerto Marea Baja", note: "Los barcos esperan; los mercaderes, no." },
  ],
  fortaleza: [
    { name: "El Puente Que Nadie Cruza", note: "Por algo será." },
    { name: "Fuerte Inexpugnable (Casi)", note: "El \"casi\" se añadió tras el último asedio." },
    { name: "Torreón del Bostezo Eterno", note: "La guardia lleva siglos de servicio aburrido." },
    { name: "Castillo de Naipes", note: "Más resistente de lo que parece. Poco más." },
    { name: "La Atalaya del Despistado", note: "Desde aquí se ve todo, si alguien mira." },
    { name: "La Muralla Inacabada", note: "Faltan tres piedras desde hace un siglo." },
    { name: "Bastión de la Siesta", note: "Inexpugnable de dos a cinco." },
    { name: "Torre del Vigía Miope", note: "Ve venir al enemigo cuando ya ha llegado." },
  ],
  paramo: [
    { name: "El Páramo del Olvido", note: "Aquí no crece nada, ni siquiera la esperanza." },
    { name: "Yermo de los Suspiros", note: "Los pastores lo cruzan corriendo." },
    { name: "La Estepa Inútil", note: "Su único recurso es el viento." },
    { name: "Llanura del Polvo", note: "Ideal para perder las botas y la paciencia." },
    { name: "El Erial del Tío Blas", note: "El tío Blas tampoco lo quería." },
    { name: "Tierra de Nadie", note: "Y nadie la echa de menos." },
    { name: "Cerros Pelados", note: "Ni una cabra se atreve." },
    { name: "Baldío del Cronista", note: "Fray Abundio lo usa para meditar. Y para echar la siesta." },
    { name: "Secarral Mayor", note: "Hay un Secarral Menor. Es peor." },
    { name: "Los Cardos Altivos", note: "Lo único que florece aquí es el orgullo." },
  ],
  prado: [
    { name: "El Prado de las Vacas Filósofas", note: "Rumian despacio y opinan de todo." },
    { name: "Pradera del Bostezo", note: "Nadie ha cruzado despierto." },
    { name: "Las Margaritas Indecisas", note: "Me quiere, no me quiere, depende del Prestigio." },
    { name: "Vega del Picnic Real", note: "Aquí comió un rey una vez. Aún buscan la servilleta." },
    { name: "El Césped del Obispo", note: "Prohibido pisarlo, salvo con ejército." },
    { name: "Prado Verde Sin Más", note: "El cartógrafo tenía prisa." },
    { name: "La Hondonada Tranquila", note: "Tranquila hasta que llegan los jinetes." },
    { name: "Pastos del Carnero Tozudo", note: "El carnero no piensa moverse." },
    { name: "Campo de las Amapolas", note: "Muy bonito. No da de comer." },
    { name: "La Pradería del Trovador", note: "Aquí compuso tres canciones y ninguna buena." },
  ],
  lago: [
    { name: "El Lago de la Duda", note: "Nadie sabe si es hondo. Nadie quiere comprobarlo." },
    { name: "La Charca Real", note: "Lo de real es por los mosquitos, que son muchos." },
    { name: "Laguna del Sapo Melancólico", note: "Croa en tono menor." },
    { name: "El Espejo del Conde Presumido", note: "Se pasaba aquí las tardes mirándose." },
    { name: "Aguas del Barquero Ausente", note: "La barca sigue esperando." },
    { name: "El Estanque de las Ranas Opinadoras", note: "Tienen algo que decir de cada casa." },
  ],
  aldea: [
    { name: "Villabostezo", note: "Tres casas, un pozo y una opinión firme sobre cada forastero." },
    { name: "Aldea del Gallo Tardío", note: "El gallo canta a mediodía. Nadie se queja." },
    { name: "Pueblo de las Siete Gallinas", note: "Eran ocho. No se habla de la octava." },
    { name: "Fuentecilla de Abajo", note: "La de Arriba se secó por envidia." },
    { name: "Aldea del Herrero Distraído", note: "Hierra las vacas si te descuidas." },
    { name: "Corral de los Valientes", note: "Valientes de nombre, sobre todo." },
    { name: "Villaescasa", note: "Hay de todo, pero poco." },
    { name: "Aldea de la Campana Rajada", note: "Toca a misa y a fuego con el mismo sonido." },
  ],
  ruinas: [
    { name: "Ruinas de la Torre Mocha", note: "Le falta el piso de arriba y, según dicen, un tesoro." },
    { name: "Las Piedras del Rey Olvidado", note: "Tan olvidado que nadie recuerda qué rey era." },
    { name: "Ruinas del Monasterio Ruidoso", note: "Los monjes hicieron voto de silencio y lo rompieron." },
    { name: "El Castillo que Fue", note: "Ya no es, pero algo guarda." },
    { name: "Ruinas de la Posada Embrujada", note: "El fantasma sigue cobrando la cama." },
  ],
};

/** Nombre del castillo de una casa, con la preposición bien puesta. */
export function castleName(house: string): string {
  if (/^casa\b/i.test(house)) return `Castillo de la ${house}`;
  const article = house.match(/^(los|las|el|la)\s+(.*)$/i);
  if (article) {
    const a = article[1]!.toLowerCase();
    return a === "el" ? `Castillo del ${article[2]}` : `Castillo de ${a} ${article[2]}`;
  }
  return `Castillo de ${house}`;
}

/** Capitanes de las casas (diseño v3): uno por casa, elegido con la semilla. */
export const CAPTAIN_NAMES = [
  "Sir Ramiro el Tibio",
  "Doña Urraca la Puntual",
  "Don Fermín Pocacosa",
  "Sor Brígida de las Lanzas",
  "Sir Gonzalo el Despistado",
  "Doña Elvira Mediacota",
  "Don Lope el Madrugador",
  "Sir Nuño Calzasmal",
  "Doña Toda la Prudente",
  "Don Bermudo el Optimista",
  "Sir Pelayo Cuestabajo",
  "Doña Jimena la Tozuda",
] as const;

/** Nombre del Capitán de una casa: el mismo durante toda la partida. */
export function captainName(seed: string, house: number): string {
  let h = 0;
  for (const ch of `${seed}:${house}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CAPTAIN_NAMES[h % CAPTAIN_NAMES.length]!;
}

/**
 * Nombres solemnes de las alianzas (bloque 8): Fray Abundio los compone con
 * una cosa y un adjetivo, como «Alianza de la Roca Eterna». Se guardan sin
 * artículo; las frases ponen «la».
 */
export const ALLIANCE_NAME_PARTS = {
  kinds: ["Alianza", "Liga", "Hermandad", "Concordia", "Santa Unión", "Entente"],
  things: [
    { word: "Roca", feminine: true },
    { word: "Espada", feminine: true },
    { word: "Corona", feminine: true },
    { word: "Torre", feminine: true },
    { word: "Llama", feminine: true },
    { word: "Rosa", feminine: true },
    { word: "Muralla", feminine: true },
    { word: "Luna", feminine: true },
    { word: "Puente", feminine: false },
    { word: "Roble", feminine: false },
    { word: "Juramento", feminine: false },
    { word: "Estandarte", feminine: false },
    { word: "Cáliz", feminine: false },
    { word: "Nabo", feminine: false },
    { word: "Yelmo", feminine: false },
    { word: "Río", feminine: false },
  ],
  adjectives: [
    ["Eterna", "Eterno"],
    ["Inquebrantable", "Inquebrantable"],
    ["Sagrada", "Sagrado"],
    ["Dorada", "Dorado"],
    ["Fiel", "Fiel"],
    ["Invicta", "Invicto"],
    ["Perpetua", "Perpetuo"],
    ["Bendita", "Bendito"],
    ["Imperecedera", "Imperecedero"],
    ["Leal", "Leal"],
    ["Serena", "Sereno"],
    ["Provisional", "Provisional"],
  ],
} as const;

/** Nombre de alianza a partir de una semilla (el servidor pone el azar). */
export function allianceName(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const { kinds, things, adjectives } = ALLIANCE_NAME_PARTS;
  const kind = kinds[h % kinds.length]!;
  const thing = things[Math.floor(h / kinds.length) % things.length]!;
  const adj = adjectives[Math.floor(h / kinds.length / things.length) % adjectives.length]!;
  return `${kind} ${thing.feminine ? "de la" : "del"} ${thing.word} ${adj[thing.feminine ? 0 : 1]}`;
}

/** Si un nombre es uno de los que compone Fray Abundio (el cliente no puede inventarlos). */
export function isAllianceName(name: string): boolean {
  const { kinds, things, adjectives } = ALLIANCE_NAME_PARTS;
  return kinds.some((k) =>
    things.some((t) => adjectives.some((a) => name === `${k} ${t.feminine ? "de la" : "del"} ${t.word} ${a[t.feminine ? 0 : 1]}`)),
  );
}
