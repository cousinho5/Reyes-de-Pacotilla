import { describe, expect, it } from "vitest";
import { cinematicsList, isCinematicKey, kingOf, weekOf, type CinematicsInput } from "../src/cinematicas";

const base: CinematicsInput = { status: "active", weeks: 6, week: 1, events: [], kings: [], seen: [], seed: "s" };

describe("Cinemáticas de cada casa (bloque 13)", () => {
  it("el prólogo sale solo en la primera semana", () => {
    expect(cinematicsList(base)).toMatchObject([{ clave: "prologo", sola: true, vista: false }]);
    expect(cinematicsList({ ...base, week: 3 })[0]).toMatchObject({ clave: "prologo", sola: false });
    expect(cinematicsList({ ...base, status: "lobby" })).toEqual([]);
  });

  it("ordena eventos, fantasma, última semana y coronación", () => {
    const list = cinematicsList({
      ...base,
      status: "finished",
      week: 7,
      events: [
        { week: 2, key: "carnaval", params: '{"key":"carnaval"}' },
        { week: 1, key: "cosecha_gloriosa", params: '{"key":"cosecha_gloriosa","resource":"hierro"}' },
      ],
      kings: [{ week: 1, kind: "fantasma", line: "El fantasma opina." }],
    });
    expect(list.map((c) => c.clave)).toEqual(["prologo", "evento:1", "fantasma:1", "evento:2", "ultima", "coronacion"]);
    expect(list[1]!.datos).toMatchObject({ nombre: "Cosecha Gloriosa", texto: expect.stringContaining("Hierro") });
    // Al acabar, la última semana ya no sale sola; la coronación sí.
    expect(list.find((c) => c.clave === "ultima")!.sola).toBe(false);
    expect(list.find((c) => c.clave === "coronacion")!.sola).toBe(true);
  });

  it("la última semana llega con la semana final", () => {
    expect(cinematicsList({ ...base, week: 5 }).some((c) => c.tipo === "ultima")).toBe(false);
    expect(cinematicsList({ ...base, week: 6 }).find((c) => c.tipo === "ultima")).toMatchObject({ sola: true, semana: 6 });
  });

  it("marca las vistas y las pasadas por alto", () => {
    const list = cinematicsList({
      ...base,
      events: [{ week: 1, key: "carnaval", params: null }],
      seen: [
        { key: "prologo", watched: 1 },
        { key: "evento:1", watched: 0 },
      ],
    });
    expect(list[0]).toMatchObject({ vista: true });
    expect(list[0]!.sinVer).toBeUndefined();
    expect(list[1]).toMatchObject({ vista: true, sinVer: true });
  });

  it("solo admite claves conocidas", () => {
    for (const k of ["prologo", "ultima", "coronacion", "evento:3", "fantasma:12"]) expect(isCinematicKey(k)).toBe(true);
    for (const k of ["evento", "evento:x", "otra", "fantasma:123", "prologo "]) expect(isCinematicKey(k)).toBe(false);
  });

  it("lee al difunto rey de los boletines, también de los de antes", () => {
    expect(kingOf(JSON.stringify({ king: { kind: "muerte", line: "x" } }))).toEqual({ kind: "muerte", line: "x" });
    const old = (line: string) => JSON.stringify({ sections: [{ title: "Del difunto rey", lines: [line] }] });
    expect(kingOf(old("En memoria de Aldric, que dio su vida durante un banquete."))!.kind).toBe("muerte");
    expect(kingOf(old("El espíritu real ha dejado un mensaje."))!.kind).toBe("fantasma");
    expect(kingOf(JSON.stringify({ sections: [] }))).toBeNull();
  });

  it("cuenta las semanas desde el lunes de inicio", () => {
    expect(weekOf("2026-10-05", new Date("2026-10-05T10:00:00Z"))).toBe(1);
    expect(weekOf("2026-10-05", new Date("2026-10-11T21:00:00Z"))).toBe(1);
    expect(weekOf("2026-10-05", new Date("2026-10-12T10:00:00Z"))).toBe(2);
    expect(weekOf(null, new Date())).toBe(0);
    // En Madrid, el lunes empieza dos horas antes que en UTC (horario de verano).
    expect(weekOf("2026-10-05", new Date("2026-10-11T22:30:00Z"), "Europe/Madrid")).toBe(2);
  });
});
