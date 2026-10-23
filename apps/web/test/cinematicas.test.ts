import { describe, expect, it } from "vitest";
import type { CinematicItem } from "../src/api";
import * as ev from "../src/art/eventos";
import * as ul from "../src/art/ultima";
import { MAX_AUTO, autoQueue, canPlay, cinematicTitle } from "../src/cinematicQueue";
import { plaza, pregonero } from "../src/art/pregonero";
import { salon_dia, salon_noche } from "../src/art/salon";
import { corona, rey_ahoga_sin_corona, rey_contento } from "../src/art/aldric";

const item = (clave: string, tipo: CinematicItem["tipo"], orden: number, more: Partial<CinematicItem> = {}): CinematicItem => ({
  clave,
  tipo,
  semana: Math.floor(orden / 10),
  orden,
  vista: false,
  sola: true,
  ...more,
});
const all = () => true;

describe("Cinemáticas que salen solas (bloque 13)", () => {
  it("salen en orden y solo las que faltan por ver", () => {
    const q = autoQueue(
      [item("evento:2", "evento", 21), item("prologo", "prologo", 10), item("evento:1", "evento", 11, { vista: true })],
      all,
    );
    expect(q.play.map((i) => i.clave)).toEqual(["prologo", "evento:2"]);
    expect(q.skip).toEqual([]);
  });

  it(`como mucho ${MAX_AUTO} seguidas, más el prólogo y la coronación`, () => {
    const q = autoQueue(
      [
        item("prologo", "prologo", 10),
        item("evento:1", "evento", 11),
        item("fantasma:1", "fantasma", 16),
        item("evento:2", "evento", 21),
        item("fantasma:2", "fantasma", 26),
        item("coronacion", "coronacion", 70),
      ],
      all,
    );
    expect(q.play.map((i) => i.clave)).toEqual(["prologo", "evento:2", "fantasma:2", "coronacion"]);
    expect(q.skip.map((i) => i.clave)).toEqual(["evento:1", "fantasma:1"]);
  });

  it("no cuenta las que no sabe dibujar, las que no salen solas ni las vistas aquí", () => {
    const q = autoQueue(
      [
        item("prologo", "prologo", 10, { sola: false }),
        item("evento:1", "evento", 11, { datos: { nombre: "Carnaval" } }),
        item("evento:2", "evento", 21),
      ],
      canPlay,
      new Set(["evento:3"]),
    );
    expect(q.play.map((i) => i.clave)).toEqual(["evento:1"]);
    expect(autoQueue([item("evento:1", "evento", 11, { datos: {} })], canPlay, new Set(["evento:1"])).play).toEqual([]);
  });

  it("con «solo prólogo y coronación» pasa todas las demás", () => {
    const q = autoQueue(
      [
        item("prologo", "prologo", 10),
        item("evento:1", "evento", 11),
        item("fantasma:1", "fantasma", 16),
        item("coronacion", "coronacion", 70),
      ],
      all,
      new Set(),
      true,
    );
    expect(q.play.map((i) => i.clave)).toEqual(["prologo", "coronacion"]);
    expect(q.skip.map((i) => i.clave)).toEqual(["evento:1", "fantasma:1"]);
  });

  it("sabe dibujar las cinco: el evento y el fantasma, si traen sus datos", () => {
    expect(canPlay(item("prologo", "prologo", 10))).toBe(true);
    expect(canPlay(item("ultima", "ultima", 60))).toBe(true);
    expect(canPlay(item("coronacion", "coronacion", 70))).toBe(true);
    expect(canPlay(item("fantasma:2", "fantasma", 26, { datos: { como: "fantasma", linea: "…" } }))).toBe(true);
    expect(canPlay(item("evento:2", "evento", 21))).toBe(false);
  });

  it("nombra cada una para la lista de Reino", () => {
    expect(cinematicTitle(item("evento:3", "evento", 31, { datos: { nombre: "Carnaval" } }))).toBe("Semana 3: Carnaval");
    expect(cinematicTitle(item("fantasma:2", "fantasma", 26))).toBe("El fantasma de Aldric (semana 2)");
    expect(cinematicTitle(item("fantasma:3", "fantasma", 36, { datos: { como: "muerte" } }))).toBe(
      "Aniversario de la muerte del rey (semana 3)",
    );
    expect(cinematicTitle(item("coronacion", "coronacion", 70))).toBe("La coronación");
  });

  it("el pregonero llega de pxl con su plaza de 160x176", () => {
    expect(plaza.grid.length).toBe(176);
    expect(plaza.grid.every((r) => r.length === 160)).toBe(true);
    expect(pregonero).toHaveLength(2);
  });

  it("el salón y el rey llegan de pxl", () => {
    for (const bg of [salon_noche, salon_dia]) expect(bg.grid.every((r) => r.length === 160)).toBe(true);
    // Todos los dibujos del rey miden lo mismo, para que no salte al cambiar de gesto.
    expect(rey_ahoga_sin_corona.grid.length).toBe(rey_contento.grid.length);
    expect(rey_ahoga_sin_corona.grid[0]!.length).toBe(rey_contento.grid[0]!.length);
    expect(corona.grid.length).toBeGreaterThan(0);
  });

  it("los fondos de las viñetas, el pasillo y el reloj llegan de pxl", () => {
    for (const bg of [ev.granero, ev.puerto, ev.camino, ev.liza, ev.prado, ul.pasillo]) {
      expect(bg.grid.length).toBe(176);
      expect(bg.grid.every((r) => r.length === 160)).toBe(true);
    }
    expect(ul.reloj).toHaveLength(5);
    // Los dos caballeros miden lo mismo, con yelmo y sin él.
    expect(ev.caballero_azul_sin_yelmo.grid.length).toBe(ev.caballero_rojo.grid.length);
  });
});
