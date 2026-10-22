import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error: script de Node sin tipos.
import { caracteres } from "../../../scripts/recortar-letras.mjs";

describe("letras recortadas (bloque 6)", () => {
  it("tienen todos los caracteres que salen en el código", () => {
    const saved = readFileSync(new URL("../src/fonts/caracteres.txt", import.meta.url), "utf8").trimEnd();
    const missing = [...(caracteres() as string)].filter((c) => !saved.includes(c));
    // Si falla: node scripts/recortar-letras.mjs
    expect(missing.join("")).toBe("");
  });
});
