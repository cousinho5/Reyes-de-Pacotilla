import { useState } from "react";
import { navigate } from "../App";

/** Crear partida con la clave de administración (la del secreto ADMIN_SECRET). */
export function Create() {
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [creador, setCreador] = useState("");
  const [semanas, setSemanas] = useState(2);
  const [prueba, setPrueba] = useState(false);
  const [bots, setBots] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ invitacion: string; acceso: string | null } | null>(null);

  if (done) {
    const link = `${window.location.origin}/unirse/${done.invitacion}`;
    return (
      <main className="page">
        <h1>Partida creada</h1>
        {done.acceso && (
          <section className="card">
            <p>Tu código de acceso. Guárdalo: es tu llave para entrar desde cualquier dispositivo.</p>
            <p className="access-code">{done.acceso}</p>
          </section>
        )}
        <section className="card">
          <p>
            {prueba
              ? "Ahora elige tu casa. Después, en la sala de espera, empieza la prueba: los bots se añaden solos."
              : "Ahora elige tu casa. Después comparte la invitación desde la sala de espera."}
          </p>
          <p className="mono">{link}</p>
          <button className="primary" onClick={() => navigate(`/unirse/${done.invitacion}`)}>
            Elegir mi casa
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Nueva partida</h1>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/partidas", {
              method: "POST",
              credentials: "same-origin",
              headers: { "content-type": "application/json", "x-admin": clave },
              body: JSON.stringify(prueba ? { nombre, semanas, creador, prueba, bots } : { nombre, semanas, creador }),
            });
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
              codigoInvitacion?: string;
              codigoAcceso?: string | null;
            };
            if (!res.ok) throw new Error(data.error ?? "No se pudo crear la partida.");
            setDone({ invitacion: data.codigoInvitacion!, acceso: data.codigoAcceso ?? null });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Clave de administración
          <input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        </label>
        <label>
          Nombre de la partida
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Primer interregno" required />
        </label>
        <label>
          Tu nombre (si aún no tienes cuenta)
          <input value={creador} onChange={(e) => setCreador(e.target.value)} placeholder="Como te llaman los amigos" />
        </label>
        <label>
          Duración
          <select value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
            <option value={2}>2 semanas (partida piloto)</option>
            <option value={4}>4 semanas</option>
            <option value={6}>6 semanas (estándar)</option>
            <option value={8}>8 semanas</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={prueba} onChange={(e) => setPrueba(e.target.checked)} />
          Partida de prueba (yo contra bots, con el tiempo a mi ritmo)
        </label>
        {prueba && (
          <label>
            Bots rivales
            <select value={bots} onChange={(e) => setBots(Number(e.target.value))}>
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} bots ({n + 1} casas)
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {prueba ? "Crear prueba" : "Crear partida"}
        </button>
      </form>
    </main>
  );
}
