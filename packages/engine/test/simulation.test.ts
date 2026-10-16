import { describe, expect, it } from "vitest";
import { simulateGame } from "../src";

describe("Simulador de partidas", () => {
  const opts = { seed: "sim-prueba", strategies: ["equilibrada", "comerciante", "conquistadora", "pasiva", "ausente"] as const, weeks: 2 as const };

  it("es determinista", () => {
    const a = simulateGame({ ...opts, strategies: [...opts.strategies] });
    const b = simulateGame({ ...opts, strategies: [...opts.strategies] });
    expect(a).toEqual(b);
  });

  it("produce una clasificación coherente y sin recursos negativos", () => {
    const r = simulateGame({ ...opts, strategies: [...opts.strategies] });
    expect(r.houses.map((h) => h.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(r.houses[0]!.house).toBe(r.winner);
    for (const h of r.houses) {
      for (const v of Object.values(h.leftover)) expect(v).toBeGreaterThanOrEqual(0);
      expect(h.prestigeBySunday).toHaveLength(2);
    }
    // Quien no hace nada no conquista nada.
    expect(r.houses.find((h) => h.strategy === "pasiva")!.tiles).toBe(0);
  });
});
