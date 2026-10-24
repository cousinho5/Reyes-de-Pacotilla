// Bloque 7: la invitación es un bando real que se desenrolla: quién invita, a qué
// corte y cuándo empieza; debajo, las casas que ya están con su escudo y su lema,
// los sitios libres y «Crear mi casa». Quien ya juega entra con su código sin salir.

import { useEffect, useState } from "react";
import { api, type HouseForm, type Invitation, type Me } from "../api";
import { navigate } from "../App";
import { BotMark, ShieldIcon } from "../art";
import { CodeSheet } from "../components/CodeSheet";
import { HouseEditor, initialForm } from "../components/HouseEditor";
import { FrayCard, Hero, Steps, useSky } from "../components/HomeParts";
import { INVITE_INSIDE, INVITE_LINES, INVITE_MISSING, INVITE_STARTED, startText } from "../home";

function Proclamation({ inv }: { inv: Invitation }) {
  const host = inv.anfitrion?.trim();
  return (
    <div className="decree">
      <div className="rod" aria-hidden />
      <div className="paper">
        <small>Bando real</small>
        <p>{host ? <><b>{host}</b> te invita a la corte de</> : "Se te invita a la corte de"}</p>
        <h2>{inv.partida.nombre}</h2>
        <p className="facts">
          Partida de {inv.partida.semanas} semanas · {inv.partida.estado === "lobby" ? startText(inv.partida.inicio) : "ya ha empezado"}
        </p>
        <span className="wax" aria-hidden>
          {(host?.[0] ?? "A").toUpperCase()}
        </span>
      </div>
      <div className="rod bottom" aria-hidden />
    </div>
  );
}

function Court({ inv }: { inv: Invitation }) {
  const seats = inv.plazas ?? 8;
  return (
    <section className="courtiers">
      <h4>
        Ya en la corte · {inv.casas.length} de {seats}
      </h4>
      <ul>
        {inv.casas.map((h) => (
          <li key={h.nombre}>
            <ShieldIcon color={h.color} escudo={h.escudo} size={34} title="" />
            <div>
              <b>
                {h.bot && <BotMark size={14} />}
                {h.nombre}
              </b>
              {h.lema && <i>«{h.lema}»</i>}
            </div>
          </li>
        ))}
        {Array.from({ length: Math.max(0, seats - inv.casas.length) }, (_, i) => (
          <li key={`libre${i}`} className="free">
            <span className="gap" aria-hidden />
            <div>
              <b>Sitio libre</b>
              <i>¿El tuyo?</i>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Join({ code }: { code: string }) {
  const sky = useSky();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [form, setForm] = useState<HouseForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [askCode, setAskCode] = useState(false);
  const [done, setDone] = useState<{ partida: number; codigo: string | null } | null>(null);

  const load = () => {
    api.invitation(code).then(
      (i) => {
        setInv(i);
        setForm((f) => f ?? initialForm(i.casas));
      },
      (e) => setError((e as Error).message),
    );
    api.me().then(setMe).catch(() => undefined);
  };
  useEffect(load, [code]);

  if (done) {
    return (
      <main className="home">
        <Hero sky={sky} small />
        <div className="home-body">
          <section className="home-card">
            <h3>¡Bienvenido a la corte!</h3>
            {done.codigo ? (
              <>
                <p>Este es tu código de acceso. Guárdalo: es tu llave para entrar desde cualquier dispositivo.</p>
                <p className="access-code">{done.codigo}</p>
                <p className="note">Fray Abundio no lo apunta, por discreción y porque se le olvidaría.</p>
              </>
            ) : (
              <p>Tu casa ya forma parte de la partida.</p>
            )}
            <button className="primary big wide" onClick={() => navigate(`/partida/${done.partida}`)}>
              Ir a la partida
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (error && !inv) {
    return (
      <main className="home">
        <Hero sky={sky} small />
        <div className="home-body">
          <FrayCard lines={INVITE_MISSING} mood="escandalizado" />
          <p className="error">{error}</p>
          <button className="ghost" onClick={() => navigate("/")}>
            Volver a la portada
          </button>
        </div>
      </main>
    );
  }
  if (!inv || !form) return <main className="home" aria-busy="true" />;

  const logged = !!me?.usuario;
  const open = inv.partida.estado === "lobby" && !inv.yaDentro;
  return (
    <main className="home">
      <Hero sky={sky} small />
      <div className="home-body">
        <Proclamation inv={inv} />
        <FrayCard
          lines={inv.yaDentro ? INVITE_INSIDE : inv.partida.estado !== "lobby" ? INVITE_STARTED : INVITE_LINES}
          mood={inv.partida.estado !== "lobby" && !inv.yaDentro ? "escandalizado" : "adulador"}
        />
        <Court inv={inv} />
        {inv.yaDentro && (
          <div className="home-actions">
            <button className="primary big" onClick={() => navigate(`/partida/${inv.partida.id}`)}>
              Ir a la partida
            </button>
          </div>
        )}
        {open && !editing && (
          <div className="home-actions">
            <button className="primary big" onClick={() => setEditing(true)}>
              Crear mi casa
            </button>
            {!logged && (
              <button className="link" onClick={() => setAskCode(true)}>
                Ya tengo casa en otra partida: entrar con mi código
              </button>
            )}
          </div>
        )}
        {open && editing && (
          <form
            className="card join-form"
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
            <h3>Tu casa</h3>
            {!logged && (
              <label>
                Tu nombre
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como te llaman los amigos" required />
              </label>
            )}
            <HouseEditor value={form} onChange={setForm} taken={inv.casas} />
            {error && <p className="error">{error}</p>}
            <button className="primary big wide" type="submit" disabled={busy || !form.color}>
              Unirme a la partida
            </button>
          </form>
        )}
        <details className="what-is">
          <summary>¿Qué es Reyes de Pacotilla?</summary>
          <Steps />
        </details>
      </div>
      {askCode && (
        <CodeSheet
          onClose={() => setAskCode(false)}
          onDone={() => {
            setAskCode(false);
            load();
          }}
        />
      )}
    </main>
  );
}
