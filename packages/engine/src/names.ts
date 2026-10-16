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
};
