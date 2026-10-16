import { useEffect, useState } from "react";
import { api, type Me } from "../api";
import { navigate } from "../App";
import { HOUSE_COLORS } from "../ui";

export function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [invite, setInvite] = useState("");

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe({ usuario: null, partidas: [] }));
  }, []);

  const estado = (e: string) => (e === "lobby" ? "En la sala de espera" : e === "active" ? "En juego" : "Terminada");

  return (
    <main className="page">
      <header className="hero">
        <h1>Reyes de Pacotilla</h1>
        <p className="subtitle">Aldricia, el Reino Más o Menos Unido</p>
      </header>

      {me?.usuario ? (
        <section className="card">
          <h2>Bienvenido, {me.usuario.nombre}</h2>
          {me.partidas.length === 0 && <p>Aún no estás en ninguna partida. Pide un enlace de invitación.</p>}
          <ul className="list">
            {me.partidas.map((p) => (
              <li key={p.id}>
                <button className="row-button" onClick={() => navigate(`/partida/${p.id}`)}>
                  <span className="swatch" style={{ background: HOUSE_COLORS[p.color]?.hex }} />
                  <span>
                    <strong>{p.nombre}</strong>
                    <br />
                    <small>
                      {p.casa} · {estado(p.estado)}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="link"
            onClick={async () => {
              await api.logout();
              setMe({ usuario: null, partidas: [] });
            }}
          >
            Salir
          </button>
        </section>
      ) : (
        me && (
          <section className="card">
            <p>El trono está vacío y Fray Abundio ya afila la pluma.</p>
            <button className="primary" onClick={() => navigate("/entrar")}>
              Entrar con mi código
            </button>
          </section>
        )
      )}

      <section className="card">
        <h2>¿Tienes una invitación?</h2>
        <form
          className="inline"
          onSubmit={(e) => {
            e.preventDefault();
            const code = invite.trim().split("/").pop();
            if (code) navigate(`/unirse/${code}`);
          }}
        >
          <input
            aria-label="Código o enlace de invitación"
            placeholder="Código o enlace"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
          />
          <button type="submit">Ir</button>
        </form>
      </section>
    </main>
  );
}
