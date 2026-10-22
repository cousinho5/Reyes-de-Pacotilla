// De dónde sale el dibujo del mapa (bloque 6): de la memoria, de lo guardado en el
// móvil (IndexedDB, como PNG) o del dibujante en segundo plano (world.worker.ts).
// Sin Worker se dibuja aquí, después de dejar pintar la vista previa.

import { renderWorld, toImageData, type WorldOptions } from "./world";
import type { WorldReply, WorldRequest } from "./world.worker";

export type Drawing = ImageBitmap | ImageData;

declare const __BUILD__: string;
/** Cada versión del juego dibuja de nuevo: el arte puede haber cambiado. */
const BUILD = typeof __BUILD__ === "string" ? __BUILD__ : "dev";

// --- En memoria: al volver a la pestaña Mapa sale al momento. ---

const MEMORY_SIZE = 6;
const memory = new Map<string, Drawing>();
export function remembered(key: string): Drawing | undefined {
  const d = memory.get(key);
  if (d) {
    memory.delete(key);
    memory.set(key, d);
  }
  return d;
}
function remember(key: string, d: Drawing) {
  memory.set(key, d);
  while (memory.size > MEMORY_SIZE) memory.delete(memory.keys().next().value!);
}

// --- Guardado en el móvil. ---

const DB_NAME = "reyes-dibujos";
const STORE = "mapas";
/** Dibujos que se guardan como mucho (los más nuevos). */
const KEEP = 8;
let db: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  db ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "hash" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return db;
}
const done = <T>(req: IDBRequest<T>) =>
  new Promise<T | null>((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

async function load(hash: string): Promise<Blob | null> {
  try {
    const d = await openDb();
    if (!d) return null;
    const row = await done(d.transaction(STORE).objectStore(STORE).get(hash));
    return (row as { png?: Blob } | null)?.png ?? null;
  } catch {
    return null;
  }
}
async function save(hash: string, png: Blob) {
  try {
    const d = await openDb();
    if (!d) return;
    const store = d.transaction(STORE, "readwrite").objectStore(STORE);
    store.put({ hash, png, at: Date.now() });
    const rows = (await done(store.getAll())) as { hash: string; at: number }[] | null;
    for (const old of (rows ?? []).sort((a, b) => b.at - a.at).slice(KEEP)) store.delete(old.hash);
  } catch {
    /* sin sitio o sin IndexedDB: se dibujará otra vez */
  }
}

/** Huella de un dibujo: sus opciones y la versión del juego. */
async function fingerprint(key: string): Promise<string> {
  const text = `${BUILD}|${key}`;
  try {
    const sum = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
    return [...new Uint8Array(sum)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Sin crypto.subtle (página sin https): FNV-1a de 32 bits con la longitud.
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    return `${(h >>> 0).toString(16)}-${text.length}`;
  }
}

// --- El dibujante en segundo plano. ---

type Job = { id: number; opts: WorldOptions; resolve: (d: Drawing | null) => void; png: (b: Blob | null) => void };
let worker: Worker | null | undefined;
let busy: Job | null = null;
/** Solo espera el último encargo: si llega otro, el anterior se descarta (ya no se vería). */
let next: Job | null = null;
let ids = 0;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./world.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<WorldReply>) => {
      const job = busy;
      if (!job || job.id !== data.id) return;
      if (data.kind === "rgba") {
        job.resolve(new ImageData(data.rgba, data.width, data.height));
      } else {
        job.png(data.png);
        busy = null;
        pump();
      }
    };
    worker.onerror = () => {
      // Si el dibujante falla, se dibuja aquí lo que quedaba.
      worker = null;
      const left = [busy, next].filter((j): j is Job => j != null);
      busy = next = null;
      left.forEach(drawHere);
    };
  } catch {
    worker = null;
  }
  return worker;
}

function pump() {
  if (busy || !next) return;
  busy = next;
  next = null;
  getWorker()!.postMessage({ id: busy.id, opts: busy.opts } satisfies WorldRequest);
}

function drawHere(job: Job) {
  setTimeout(() => {
    const img = renderWorld(job.opts);
    job.resolve(new ImageData(toImageData(img), img.width, img.height));
    job.png(null);
  }, 0);
}

function draw(opts: WorldOptions): { drawing: Promise<Drawing | null>; png: Promise<Blob | null> } {
  let resolve!: Job["resolve"];
  let png!: Job["png"];
  const drawing = new Promise<Drawing | null>((r) => (resolve = r));
  const pngP = new Promise<Blob | null>((r) => (png = r));
  const job: Job = { id: ++ids, opts, resolve, png };
  if (!getWorker()) {
    drawHere(job);
  } else {
    if (next) {
      next.resolve(null);
      next.png(null);
    }
    next = job;
    pump();
  }
  return { drawing, png: pngP };
}

/**
 * El dibujo del mundo con estas opciones (`key` = sus opciones en JSON). Null si
 * se descartó porque llegó otro encargo antes de empezar.
 */
export async function worldDrawing(opts: WorldOptions, key: string): Promise<Drawing | null> {
  const ready = remembered(key);
  if (ready) return ready;
  const hash = await fingerprint(key);
  const saved = await load(hash);
  if (saved) {
    try {
      const bmp = await createImageBitmap(saved);
      remember(key, bmp);
      return bmp;
    } catch {
      /* PNG roto: se dibuja otra vez */
    }
  }
  const job = draw(opts);
  job.png.then((png) => png && save(hash, png));
  const d = await job.drawing;
  if (d) remember(key, d);
  return d;
}
