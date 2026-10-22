// Dibuja el mundo en segundo plano (bloque 6), para que la pantalla no se congele.
// Primero devuelve los colores, para enseñarlos ya, y después el PNG para guardarlo
// en el móvil (si el navegador tiene OffscreenCanvas).

import { renderWorld, toImageData, type WorldOptions } from "./world";

export type WorldRequest = { id: number; opts: WorldOptions };
export type WorldReply =
  | { id: number; kind: "rgba"; width: number; height: number; rgba: Uint8ClampedArray<ArrayBuffer> }
  | { id: number; kind: "png"; png: Blob | null };

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorldRequest>) => void) | null;
  postMessage(msg: WorldReply, transfer?: Transferable[]): void;
};

scope.onmessage = async ({ data: { id, opts } }) => {
  const img = renderWorld(opts);
  const rgba = toImageData(img);
  let canvas: OffscreenCanvas | null = null;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(img.width, img.height);
    canvas.getContext("2d")?.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
  }
  scope.postMessage({ id, kind: "rgba", width: img.width, height: img.height, rgba }, [rgba.buffer]);
  let png: Blob | null = null;
  try {
    png = canvas ? await canvas.convertToBlob({ type: "image/png" }) : null;
  } catch {
    /* sin PNG: no se guarda, se dibujará otra vez */
  }
  scope.postMessage({ id, kind: "png", png });
};
