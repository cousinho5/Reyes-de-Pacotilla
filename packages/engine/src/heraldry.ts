// Escudos de las casas (diseño, sección 18): qué se puede elegir, cuándo es
// válido y cómo se describe en lenguaje heráldico. El cliente compone el
// dibujo a partir de estos pocos campos.

export const HOUSE_COLORS = ["gules", "azur", "sinople", "sable", "purpura", "naranjado", "aguamarina", "leonado"] as const;
export const SHIELD_SHAPES = ["espanol", "apuntado", "almendrado", "rodela", "estandarte"] as const;
export const SHIELD_DIVISIONS = ["pleno", "partido", "cortado", "tronchado"] as const;
export const SHIELD_METALS = ["oro", "plata"] as const;
export const SHIELD_SYMBOLS = [
  "leon", "aguila", "torre", "espada", "corona", "llave", "lobo", "dragon",
  "gallina", "cerdo", "nabo", "caracol", "pato", "queso", "bota", "cuchara",
] as const;

export type HouseColor = (typeof HOUSE_COLORS)[number];
export type ShieldShape = (typeof SHIELD_SHAPES)[number];
export type ShieldDivision = (typeof SHIELD_DIVISIONS)[number];
export type ShieldMetal = (typeof SHIELD_METALS)[number];
export type ShieldSymbol = (typeof SHIELD_SYMBOLS)[number];

export interface Shield {
  color: HouseColor;
  shape: ShieldShape;
  division: ShieldDivision;
  /** Segundo campo; solo con división, y distinto del color de la casa. */
  color2: HouseColor | null;
  symbol: ShieldSymbol;
  metal: ShieldMetal;
}

export const SHAPE_LABEL: Record<ShieldShape, string> = {
  espanol: "Español",
  apuntado: "Apuntado",
  almendrado: "Almendrado",
  rodela: "Rodela",
  estandarte: "Estandarte",
};

export const DIVISION_LABEL: Record<ShieldDivision, string> = {
  pleno: "Pleno",
  partido: "Partido",
  cortado: "Cortado",
  tronchado: "Tronchado",
};

export const HERALDIC_COLOR: Record<string, string> = {
  gules: "gules",
  azur: "azur",
  sinople: "sinople",
  sable: "sable",
  purpura: "púrpura",
  naranjado: "naranjado",
  aguamarina: "aguamarina",
  leonado: "leonado",
};

export const SYMBOL_NAME: Record<string, string> = {
  leon: "león",
  aguila: "águila",
  torre: "torre",
  espada: "espada",
  corona: "corona",
  llave: "llave",
  lobo: "lobo",
  dragon: "dragón",
  gallina: "gallina",
  cerdo: "cerdo",
  nabo: "nabo",
  caracol: "caracol",
  pato: "pato",
  queso: "queso",
  bota: "bota",
  cuchara: "cuchara",
};

/**
 * "de azur con nabo de oro", "partido de gules y azur con nabo de oro".
 * Sin división (o sin segundo color) el escudo es pleno.
 */
export function blazon(color: string, symbol: string, metal = "oro", division = "pleno", color2: string | null = null): string {
  const c1 = HERALDIC_COLOR[color] ?? color;
  const field = division !== "pleno" && color2 ? `${division} de ${c1} y ${HERALDIC_COLOR[color2] ?? color2}` : `de ${c1}`;
  return `${field} con ${SYMBOL_NAME[symbol] ?? symbol} de ${metal}`;
}

/**
 * Comprueba un escudo frente a los de las demás casas de la partida. Devuelve
 * el motivo del rechazo (para enseñárselo al jugador) o null si vale.
 */
export function checkShield(shield: Partial<Record<keyof Shield, unknown>>, others: Pick<Shield, "color" | "shape" | "symbol">[]): string | null {
  const { color, shape, division, color2, symbol, metal } = shield;
  if (!HOUSE_COLORS.includes(color as HouseColor)) return "Ese color no existe.";
  if (!SHIELD_SHAPES.includes(shape as ShieldShape)) return "Esa forma de escudo no existe.";
  if (!SHIELD_DIVISIONS.includes(division as ShieldDivision)) return "Esa división no existe.";
  if (!SHIELD_SYMBOLS.includes(symbol as ShieldSymbol)) return "Ese símbolo no existe.";
  if (!SHIELD_METALS.includes(metal as ShieldMetal)) return "El símbolo es de oro o de plata.";
  if (division === "pleno") {
    if (color2 != null) return "Un escudo pleno tiene un solo color.";
  } else {
    if (!HOUSE_COLORS.includes(color2 as HouseColor)) return "Con división hace falta un segundo color.";
    if (color2 === color) return "El segundo color tiene que ser distinto del primero.";
  }
  if (others.some((o) => o.color === color)) return "Ese color ya está cogido.";
  if (others.some((o) => o.shape === shape && o.symbol === symbol)) return "Otra casa ya lleva ese símbolo en un escudo de esa forma.";
  return null;
}

/** Primer escudo libre (para los bots y como propuesta inicial del creador). */
export function freeShield(others: Pick<Shield, "color" | "shape" | "symbol">[], index = others.length): Shield {
  const color = HOUSE_COLORS.find((c) => !others.some((o) => o.color === c)) ?? HOUSE_COLORS[0];
  const shape = SHIELD_SHAPES[index % SHIELD_SHAPES.length]!;
  const used = new Set(others.map((o) => `${o.shape}:${o.symbol}`));
  let symbol: ShieldSymbol = SHIELD_SYMBOLS[(index * 3) % SHIELD_SYMBOLS.length]!;
  for (let k = 0; used.has(`${shape}:${symbol}`); k++) symbol = SHIELD_SYMBOLS[k % SHIELD_SYMBOLS.length]!;
  const division = SHIELD_DIVISIONS[index % SHIELD_DIVISIONS.length]!;
  const color2 = division === "pleno" ? null : HOUSE_COLORS[(HOUSE_COLORS.indexOf(color) + 3) % HOUSE_COLORS.length]!;
  return { color, shape, division, color2, symbol, metal: index % 2 ? "plata" : "oro" };
}
