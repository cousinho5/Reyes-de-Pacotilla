// Bloque 8: piezas puras del servidor de alianzas.
import { describe, expect, it } from "vitest";
import { ALLIANCE, type Tile } from "@reyes/engine";
import { alliancesView, cooldownEnd, cooling } from "../src/alianzas";
import { crowding } from "../src/jobs";
import { toEngineAlliances, toEngineTiles, type AllianceRow, type TileRow } from "../src/state";

const row = (over: Partial<AllianceRow>): AllianceRow => ({
  id: 1,
  game_id: 1,
  name: "Alianza de la Roca Eterna",
  house_a: 1,
  house_b: 2,
  proposed_by: 1,
  status: "proposed",
  proposed_at: "2026-10-26T10:00:00.000Z",
  expires_resolution: 3,
  signed_resolution: null,
  signed_at: null,
  broken_by: null,
  broken_at: null,
  ends_resolution: null,
  closed_at: null,
  ...over,
});

describe("alianzas en el servidor", () => {
  it("al motor solo llegan las que están en vigor o en aviso", () => {
    const rows = [
      row({ id: 1, status: "active", signed_resolution: 2 }),
      row({ id: 2, house_b: 3, status: "breaking", signed_resolution: 1, ends_resolution: 5 }),
      row({ id: 3, house_b: 4, status: "proposed" }),
      row({ id: 4, house_b: 5, status: "ended" }),
    ];
    expect(toEngineAlliances(rows)).toEqual([
      { a: 1, b: 2, status: "active", endsAt: null, since: 2 },
      { a: 1, b: 3, status: "breaking", endsAt: 5, since: 1 },
    ]);
  });

  it(`quien rompe no firma otra en ${ALLIANCE.cooldownDays} días (hora de la partida)`, () => {
    const rows = [row({ status: "ended", broken_by: 2, broken_at: "2026-10-26T10:00:00.000Z" })];
    expect(cooling(rows, 2, new Date("2026-11-01T10:00:00.000Z"))).toBe(true);
    expect(cooling(rows, 1, new Date("2026-11-01T10:00:00.000Z"))).toBe(false);
    expect(cooling(rows, 2, new Date("2026-11-02T10:00:01.000Z"))).toBe(false);
    expect(cooldownEnd(rows, 2, new Date("2026-10-27T00:00:00.000Z"))?.toISOString()).toBe("2026-11-02T10:00:00.000Z");
  });

  it("el registro es público; las propuestas, solo de sus dos casas", () => {
    const rows = [row({ id: 1, status: "active", signed_resolution: 2 }), row({ id: 2, house_a: 3, house_b: 4, proposed_by: 4 })];
    const now = new Date("2026-10-27T00:00:00.000Z");
    expect(alliancesView(rows, 5, now).lista).toHaveLength(1);
    expect(alliancesView(rows, 5, now).propuestas).toEqual([]);
    expect(alliancesView(rows, 3, now).propuestas).toEqual([{ id: 2, nombre: "Alianza de la Roca Eterna", de: 4, para: 3, caducaTras: 3 }]);
  });

  it("las tropas de paso se leen en el formato del motor", () => {
    const t: TileRow = {
      id: 7, x: 0, y: 0, type: "campos", name: "x", owner_house_id: 2, troops: 3, jinetes: 0, catapultas: 0, fortified_until: null,
      castle_of: null, besieged_by: null, siege_nights: 0, river: 0, guests: [{ house: 1, troops: 4, jinetes: 1 }],
    };
    expect(toEngineTiles([t])[0]!.guests).toEqual([{ house: 1, troops: 4, jinetes: 1 }]);
  });

  it(`Fray Abundio avisa cuando las tropas de un aliado dentro llegan a ${ALLIANCE.warnTroops}, una vez`, () => {
    const tile = (guests: number): Tile => ({ id: 1, x: 0, y: 0, type: "campos", owner: 2, troops: 1, ...(guests ? { guests: [{ house: 1, troops: guests }] } : {}) });
    const second: Tile = { id: 2, x: 1, y: 0, type: "campos", owner: 2, troops: 1, guests: [{ house: 1, troops: 4 }] };
    expect(crowding([tile(0)], [tile(ALLIANCE.warnTroops - 4), second])).toEqual([{ host: 2, guest: 1, troops: ALLIANCE.warnTroops }]);
    expect(crowding([tile(ALLIANCE.warnTroops)], [tile(ALLIANCE.warnTroops + 2)])).toEqual([]);
    expect(crowding([tile(0)], [tile(ALLIANCE.warnTroops - 1)])).toEqual([]);
  });
});
