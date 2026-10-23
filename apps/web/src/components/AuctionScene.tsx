// Gran Subasta: la escena del subastador en un lienzo de 160x88 visto al doble.
// Tocar un lote avisa con `onPick`; para el teclado y los lectores de pantalla,
// cada lote tiene además un botón invisible encima. La llama tiembla y, apagada
// la vela, sale humo; sin movimiento si el móvil pide reducirlo.

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { AUCTION_H, AUCTION_W, lotAt, renderAuctionScene, type AuctionLotArt } from "../art/auctionScene";

interface Props {
  lots: AuctionLotArt[];
  /** Nombre de cada lote, para los lectores de pantalla. */
  names: string[];
  candle: number;
  color: string;
  hammer: boolean;
  selected?: number | null;
  onPick?: (lot: number) => void;
  label: string;
}

const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const AuctionScene = forwardRef<HTMLDivElement, Props>(function AuctionScene(
  { lots, names, candle, color, hammer, selected, onPick, label },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (still()) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setFrame((f) => f + 1);
    }, 170);
    return () => clearInterval(id);
  }, []);
  const img = useMemo(
    () => renderAuctionScene({ lots, candle, color, hammer, frame }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(lots.map((l) => ({ ...l, ganador: l.ganador?.grid.join("") ?? null }))), candle, color, hammer, frame],
  );

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const rgba = new Uint8ClampedArray(img.rgba);
    // El lote elegido lleva un borde de latón alrededor.
    if (selected != null) {
      for (let y = 0; y < AUCTION_H; y++)
        for (let x = 0; x < AUCTION_W; x++) {
          const i = y * AUCTION_W + x;
          if (img.owner[i] === selected) continue;
          const near =
            (x > 0 && img.owner[i - 1] === selected) ||
            (x < AUCTION_W - 1 && img.owner[i + 1] === selected) ||
            (y > 0 && img.owner[i - AUCTION_W] === selected) ||
            (y < AUCTION_H - 1 && img.owner[i + AUCTION_W] === selected);
          if (near) rgba.set([246, 227, 160, 255], i * 4);
        }
    }
    ctx.putImageData(new ImageData(rgba, AUCTION_W, AUCTION_H), 0, 0);
  }, [img, selected]);

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    const lot = lotAt(img, ((e.clientX - r.left) / r.width) * AUCTION_W, ((e.clientY - r.top) / r.height) * AUCTION_H);
    if (lot != null) onPick(lot);
  };

  return (
    <div className="auction-scene" ref={ref}>
      <canvas ref={canvas} width={AUCTION_W} height={AUCTION_H} onClick={pick} role="img" aria-label={label} />
      {onPick &&
        img.boxes.map(([x, y, w, h], i) => (
          <button
            key={i}
            className="scene-target"
            style={{
              left: `${(x / AUCTION_W) * 100}%`,
              top: `${(y / AUCTION_H) * 100}%`,
              width: `${(w / AUCTION_W) * 100}%`,
              height: `${(h / AUCTION_H) * 100}%`,
            }}
            aria-label={`Lote ${i + 1}: ${names[i] ?? ""}`}
            onClick={() => onPick(i)}
          />
        ))}
    </div>
  );
});
