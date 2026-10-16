import { useState } from "react";
import { api } from "../api";
import { navigate } from "../App";

/** Entrar con el código de 6 caracteres (imprescindible en el iPhone instalado). */
export function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="page">
      <h1>Entrar</h1>
      <section className="card">
        <p>Escribe tu código de acceso. Te lo dio el juego al unirte a tu primera partida.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api.login(code);
              navigate("/");
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            className="code-input"
            aria-label="Código de acceso"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={busy || code.replace(/\s/g, "").length < 6}>
            Entrar
          </button>
        </form>
      </section>
      <button className="link" onClick={() => navigate("/")}>
        Volver
      </button>
    </main>
  );
}
