import { useEffect, useState } from "react";
import { api, type Me } from "../api";
import { navigate } from "../App";
import { FrayAbundio, ShieldIcon, TileArt } from "../art";

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
        <div className="hero-art board" aria-hidden>
          {(["campos", "bosque", "castillo", "montana", "puerto"] as const).map((t) => (
            <TileArt key={t} type={t} flag="#d6a64b" />
          ))}
        </div>
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
                <button className="row-button game-row" onClick={() => navigate(`/partida/${p.id}`)}>
                  <ShieldIcon color={p.color} escudo={p.escudo} size={32} />
                  <span>
                    <strong>{p.nombre}</strong>
                    <br />
                    <small>
                      {p.casa} · {estado(p.estado)}
                      {p.prueba && " · prueba"}
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
          <section className="card welcome">
            <FrayAbundio mood="adulador" size={72} />
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
