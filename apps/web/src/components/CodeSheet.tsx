// Bloque 7: entrar con el código de acceso sin salir de la portada. Una hoja que
// sube desde abajo con seis casillas; debajo hay un único campo de verdad (para
// pegar el código, el teclado del móvil y el autorrelleno de «código de un solo uso»).

import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { FrayAbundio } from "../art";
import { CODE_NOTE, cleanCode } from "../home";

export function CodeSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    const t = setTimeout(() => input.current?.focus(), 280);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const submit = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(code);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className={`code-sheet${open ? " open" : ""}`}>
      <div className="code-backdrop" onClick={onClose} />
      <form
        className="code-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-title"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="code-grip" aria-hidden />
        <h2 id="code-title">Entrar en la corte</h2>
        <p>Escribe tu código de acceso. Te lo dio el juego al unirte a tu primera partida.</p>
        <label className="code-boxes" onClick={() => input.current?.focus()}>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} className={i === code.length ? "active" : undefined} aria-hidden>
              {code[i] ?? ""}
            </i>
          ))}
          <input
            ref={input}
            aria-label="Código de acceso"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            maxLength={8}
            value={code}
            onChange={(e) => {
              setCode(cleanCode(e.target.value));
              setError(null);
            }}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary big wide" type="submit" disabled={busy || code.length < 6}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <div className="code-fray">
          <FrayAbundio mood="solemne" size={44} />
          <span>{CODE_NOTE}</span>
        </div>
      </form>
    </div>
  );
}
