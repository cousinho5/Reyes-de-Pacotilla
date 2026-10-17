import { useEffect, useState } from "react";
import { api, type HouseForm, type Invitation, type Me } from "../api";
import { navigate } from "../App";
import { ShieldIcon } from "../art";
import { HouseEditor, initialForm } from "../components/HouseEditor";

export function Join({ code }: { code: string }) {
  const [inv, setInv] = useState<Invitation | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [form, setForm] = useState<HouseForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ partida: number; codigo: string | null } | null>(null);

  useEffect(() => {
    api.invitation(code).then(
      (i) => {
        setInv(i);
        setForm(initialForm(i.casas));
      },
      (e) => setError((e as Error).message),
    );
    api.me().then(setMe).catch(() => undefined);
  }, [code]);

  if (done) {
    return (
      <main className="page">
        <h1>¡Bienvenido a la corte!</h1>
        <section className="card">
          {done.codigo ? (
            <>
              <p>Este es tu código de acceso. Guárdalo: es tu llave para entrar desde cualquier dispositivo.</p>
              <p className="access-code">{done.codigo}</p>
              <p>
                <small>Fray Abundio no lo apunta, por discreción y porque se le olvidaría.</small>
              </p>
            </>
          ) : (
            <p>Tu casa ya forma parte de la partida.</p>
          )}
          <button className="primary" onClick={() => navigate(`/partida/${done.partida}`)}>
            Ir a la partida
          </button>
        </section>
      </main>
    );
  }

  if (error && !inv) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <button className="link" onClick={() => navigate("/")}>
          Volver
        </button>
      </main>
    );
  }
  if (!inv || !form) return <main className="page">Cargando…</main>;
  if (inv.yaDentro) {
    return (
      <main className="page">
        <h1>{inv.partida.nombre}</h1>
        <p>Ya tienes una casa en esta partida.</p>
        <button className="primary" onClick={() => navigate(`/partida/${inv.partida.id}`)}>
          Ir a la partida
        </button>
      </main>
    );
  }
  if (inv.partida.estado !== "lobby") {
    return (
      <main className="page">
        <h1>{inv.partida.nombre}</h1>
        <p>Esta partida ya ha empezado. Pide plaza para la siguiente.</p>
      </main>
    );
  }

  const logged = !!me?.usuario;
  return (
    <main className="page">
      <h1>{inv.partida.nombre}</h1>
      <p className="subtitle">
        Partida de {inv.partida.semanas} semanas · {inv.casas.length} de 8 casas
      </p>
      {inv.casas.length > 0 && (
        <p>
          Ya en la corte:{" "}
          {inv.casas.map((h) => (
            <span key={h.nombre} className="chip">
              <ShieldIcon color={h.color} escudo={h.escudo} size={16} title="" /> {h.nombre}
            </span>
          ))}
        </p>
      )}
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const r = await api.join(code, { ...form, nombre: logged ? undefined : nombre, lema: form.lema || undefined });
            setDone({ partida: r.partida, codigo: r.codigoAcceso });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!logged && (
          <label>
            Tu nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como te llaman los amigos" required />
          </label>
        )}
        <HouseEditor value={form} onChange={setForm} taken={inv.casas} />
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={busy || !form.color}>
          Unirme a la partida
        </button>
      </form>
    </main>
  );
}
