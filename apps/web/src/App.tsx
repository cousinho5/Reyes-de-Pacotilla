import { resolveCampaign, type Tile } from "@reyes/engine";

// Pantalla provisional: demuestra que el cliente usa el mismo motor que el
// servidor (el futuro botón Simular). Las pantallas reales llegan con el MVP 1.
const demoTiles: Tile[] = [
  { id: 1, x: 0, y: 0, type: "castillo", owner: 1, troops: 7, castleOf: 1 },
  { id: 2, x: 1, y: 0, type: "campos", owner: null, troops: 4 },
];
const demo = resolveCampaign({
  resolution: 1,
  tiles: demoTiles,
  orders: [{ kind: "move", house: 1, from: 1, to: 2, troops: 7 }],
});
const villa = demo.tiles.find((t) => t.id === 2)!;

export function App() {
  return (
    <main className="pergamino">
      <h1>Reyes de Pacotilla</h1>
      <p className="subtitulo">Aldricia, el Reino Más o Menos Unido</p>
      <p>
        El trono está vacío y Fray Abundio ya afila la pluma. El juego está en obras; los albañiles piden
        paciencia (y propina).
      </p>
      <section className="cronica">
        <h2>Simulación de prueba</h2>
        <p>
          7 tropas marchan sobre Villa Mediocre (4 de guarnición). Resultado: la casilla queda en manos de la casa{" "}
          {villa.owner} con {villa.troops} tropas.
        </p>
        <p className="margen">Nota del cronista: las cifras son exactas. Los adjetivos, no tanto.</p>
      </section>
    </main>
  );
}
