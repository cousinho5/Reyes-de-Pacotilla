// Bloque 7: las cuentas de la portada que no dibujan nada (la hora del cielo,
// el saludo y las frases de Fray Abundio, de la sección 23 del banco).

export type HomeHour = "amanecer" | "dia" | "atardecer" | "noche";
export const HOME_HOURS: HomeHour[] = ["amanecer", "dia", "atardecer", "noche"];

/** La franja del día según el reloj del móvil: amanecer 6-9, día 9-18, atardecer 18-21, noche 21-6. */
export function hourAt(d: Date): HomeHour {
  const h = d.getHours();
  return h < 6 || h >= 21 ? "noche" : h < 9 ? "amanecer" : h < 18 ? "dia" : "atardecer";
}

/** Para las capturas y la mesa de pruebas: `?hora=noche` fija el cielo. */
export function hourFromUrl(search: string): HomeHour | null {
  const h = new URLSearchParams(search).get("hora");
  return HOME_HOURS.includes(h as HomeHour) ? (h as HomeHour) : null;
}

export const greeting = (hour: HomeHour) => (hour === "atardecer" ? "Buenas tardes" : hour === "noche" ? "Buenas noches" : "Buenos días");

/** 23.1: la bienvenida a quien no ha entrado. */
export const WELCOME = [
  "El trono de Aldricia sigue vacío. Se buscan candidatos con ambición y sin alergia al pollo.",
  "Seis semanas, un trono y ninguna llave. El cronista ya ha afilado la pluma.",
  "Aquí se forjan reyes de verdad. Bueno, de pacotilla, pero reyes.",
  "El difunto Aldric insiste en que con él el reino iba mejor. El cronista no lo recuerda así.",
];
/** 23.1, de noche: se añaden a las de siempre. */
export const WELCOME_NIGHT = [
  "A estas horas solo velan los fantasmas y los que no han dado sus órdenes.",
  "El cronista duerme con un ojo abierto. El otro también, por si acaso.",
];

/** 23.4: el pie de la hoja para entrar con el código. */
export const CODE_NOTE = "Fray Abundio no lo apunta, por discreción y porque se le olvidaría.";

/** Las frases de la bienvenida a esta hora. */
export const welcomeLines = (hour: HomeHour) => (hour === "noche" ? [...WELCOME_NIGHT, ...WELCOME] : WELCOME);

/** El código de acceso tal como se escribe: seis letras o números, en mayúsculas. */
export const cleanCode = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
