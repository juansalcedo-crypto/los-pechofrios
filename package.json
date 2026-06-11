import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

// ---------- Tipos ----------
type Pick = 'HOME' | 'DRAW' | 'AWAY';
type Tab = 'partidos' | 'grupos' | 'apuestas' | 'ia';

interface Team { id: number; name: string; shortName?: string; tla?: string; crest?: string }
interface Match {
  id: number; utcDate: string; status: string; stage: string; group: string | null;
  homeTeam: Team; awayTeam: Team;
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
}
interface StandingRow {
  position: number; team: Team; playedGames: number; won: number; draw: number;
  lost: number; points: number; goalDifference: number;
}
interface GroupStanding { group: string; table: StandingRow[] }

const BETS_KEY = 'pechofrios_bets_v1';
const NOMBRES_PICK: Record<Pick, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

function winnerToPick(w: string | null): Pick | null {
  if (w === 'HOME_TEAM') return 'HOME';
  if (w === 'AWAY_TEAM') return 'AWAY';
  if (w === 'DRAW') return 'DRAW';
  return null;
}

// ---------- Boleta de partido ----------
function MatchCard({ match, myPick, onPick }: { match: Match; myPick: Pick | null; onPick: (id: number, p: Pick) => void }) {
  const fecha = new Date(match.utcDate);
  const enVivo = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const terminado = match.status === 'FINISHED';
  const resultado = winnerToPick(match.score.winner);
  const acerto = terminado && myPick != null && myPick === resultado;
  const fallo = terminado && myPick != null && myPick !== resultado;

  return (
    <article className={'boleta' + (acerto ? ' acierto' : '') + (fallo ? ' fallo' : '')}>
      <div className="boleta-meta">
        <span>{match.group || match.stage.split('_').join(' ')}</span>
        {enVivo ? (
          <span className="badge live">● En vivo</span>
        ) : terminado ? (
          <span className="badge fin">Final</span>
        ) : (
          <span className="badge prog">
            {fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="equipos">
        <div className="equipo">
          {match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" />}
          <span>{match.homeTeam.shortName || match.homeTeam.name}</span>
        </div>
        {terminado || enVivo ? (
          <div className="marcador">{match.score.fullTime.home ?? 0} – {match.score.fullTime.away ?? 0}</div>
        ) : (
          <div className="marcador vs">vs</div>
        )}
        <div className="equipo away">
          {match.awayTeam.crest && <img src={match.awayTeam.crest} alt="" />}
          <span>{match.awayTeam.shortName || match.awayTeam.name}</span>
        </div>
      </div>

      <div className="picks">
        {(['HOME', 'DRAW', 'AWAY'] as Pick[]).map((p) => {
          const elegido = myPick === p;
          let cls = 'pick';
          if (terminado && elegido) cls += acerto ? ' gano' : ' perdio';
          else if (elegido) cls += ' elegido';
          return (
            <button key={p} className={cls} disabled={terminado || enVivo} onClick={() => onPick(match.id, p)} aria-pressed={elegido}>
              {NOMBRES_PICK[p]}
              <small>{p === 'HOME' ? match.homeTeam.tla || 'Local' : p === 'AWAY' ? match.awayTeam.tla || 'Visita' : 'Empate'}</small>
            </button>
          );
        })}
      </div>

      {terminado && myPick && (
        <p className={'veredicto ' + (acerto ? 'bien' : 'mal')}>
          {acerto ? '✓ La pegaste, crack' : '✗ Pecho frío confirmado'}
        </p>
      )}
    </article>
  );
}

// ---------- Tabla de grupos ----------
function Standings({ standings }: { standings: GroupStanding[] }) {
  if (!standings.length) return <p className="vacio">Las tablas aparecerán cuando arranque la fase de grupos.</p>;
  return (
    <div>
      {standings.map((g) => (
        <section key={g.group}>
          <h2 className="seccion-titulo">{g.group.replace('GROUP_', 'Grupo ')}</h2>
          <div className="tabla-wrap">
            <table className="grupo">
              <thead>
                <tr>
                  <th>#</th><th>Equipo</th><th className="c">PJ</th><th className="c">G</th>
                  <th className="c">E</th><th className="c">P</th><th className="c">DG</th><th className="c">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.table.map((row) => (
                  <tr key={row.team.id} className={row.position <= 2 ? 'clasifica' : ''}>
                    <td className="num">{row.position}</td>
                    <td>
                      <div className="celda-equipo">
                        {row.team.crest && <img src={row.team.crest} alt="" />}
                        {row.team.shortName || row.team.name}
                      </div>
                    </td>
                    <td className="num">{row.playedGames}</td>
                    <td className="num">{row.won}</td>
                    <td className="num">{row.draw}</td>
                    <td className="num">{row.lost}</td>
                    <td className="num">{row.goalDifference > 0 ? '+' + row.goalDifference : row.goalDifference}</td>
                    <td className="pts">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------- IA ----------
function AIPredict({ matches }: { matches: Match[] }) {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function preguntar() {
    if (!pregunta.trim() || cargando) return;
    setCargando(true); setError(''); setRespuesta('');
    const proximos = matches
      .filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED').slice(0, 20)
      .map((m) => m.homeTeam.name + ' vs ' + m.awayTeam.name + ' (' + (m.group || m.stage) + ', ' + m.utcDate.slice(0, 10) + ')');
    const recientes = matches
      .filter((m) => m.status === 'FINISHED').slice(-15)
      .map((m) => m.homeTeam.name + ' ' + m.score.fullTime.home + '-' + m.score.fullTime.away + ' ' + m.awayTeam.name);
    const context = 'PROXIMOS:\n' + (proximos.join('\n') || '(sin datos)') + '\n\nRESULTADOS RECIENTES:\n' + (recientes.join('\n') || '(sin datos)');
    try {
      const r = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pregunta, context }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error || 'Algo falló, intenta de nuevo.');
      else setRespuesta(data.answer);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="chat-box">
      <div className="chat-form">
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && preguntar()}
          placeholder="Ej: ¿Quién gana Colombia vs Alemania?"
          aria-label="Pregunta al analista de IA"
        />
        <button className="boton" onClick={preguntar} disabled={cargando}>
          {cargando ? 'Analizando…' : 'Analizar'}
        </button>
      </div>
      {error && <div className="aviso">{error}</div>}
      {respuesta && <div className="chat-respuesta">{respuesta}</div>}
      {!respuesta && !error && (
        <p style={{ color: 'var(--gris)', fontSize: '0.85rem', marginTop: 12 }}>
          El analista usa los datos reales de la API para darte un pronóstico. Es un pronóstico, no una garantía — pecho frío avisado no pierde plata.
        </p>
      )}
    </div>
  );
}

// ---------- Página principal ----------
export default function Home() {
  const [tab, setTab] = useState<Tab>('partidos');
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [bets, setBets] = useState<Record<number, Pick>>({});
  const [error, setError] = useState('');
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BETS_KEY);
      if (raw) setBets(JSON.parse(raw));
    } catch {}
  }, []);

  function onPick(matchId: number, pick: Pick) {
    setBets((prev) => {
      const next = { ...prev } as Record<number, Pick>;
      if (next[matchId] === pick) delete next[matchId];
      else next[matchId] = pick;
      try { localStorage.setItem(BETS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const [rm, rs] = await Promise.all([fetch('/api/matches'), fetch('/api/standings')]);
        const dm = await rm.json();
        const ds = await rs.json();
        if (!activo) return;
        if (dm.error) setError(dm.error);
        else { setMatches(dm.matches || []); setError(''); }
        if (!ds.error) setStandings(ds.standings || []);
      } catch {
        if (activo) setError('No se pudieron cargar los datos. Revisa tu conexión.');
      } finally {
        if (activo) setCargado(true);
      }
    }
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => { activo = false; clearInterval(intervalo); };
  }, []);

  const enVivo = useMemo(() => matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED'), [matches]);
  const proximos = useMemo(
    () => matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED').sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    [matches]
  );
  const terminados = useMemo(
    () => matches.filter((m) => m.status === 'FINISHED').sort((a, b) => b.utcDate.localeCompare(a.utcDate)),
    [matches]
  );

  const conApuesta = matches.filter((m) => bets[m.id]);
  const resueltas = conApuesta.filter((m) => m.status === 'FINISHED');
  const aciertos = resueltas.filter((m) => winnerToPick(m.score.winner) === bets[m.id]).length;
  const fallos = resueltas.length - aciertos;
  const efectividad = resueltas.length ? Math.round((aciertos / resueltas.length) * 100) : null;

  return (
    <>
      <Head>
        <title>Los Pechofríos — Polla Mundial 2026</title>
        <meta name="description" content="Resultados en vivo del Mundial 2026, polla entre amigos y predicciones con IA." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="container">
        <header className="hero">
          <h1 className="wordmark">Los Pechofríos ❄</h1>
          <p className="tagline">Polla Mundial 2026 · resultados en vivo · <b>se actualiza sola cada minuto</b></p>
        </header>

        <nav className="tabs" aria-label="Secciones">
          {([['partidos', 'Partidos'], ['grupos', 'Grupos'], ['apuestas', 'Mis apuestas'], ['ia', 'IA Predicciones']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>

        {error && <div className="aviso">{error}</div>}
        {!cargado && <p className="vacio">Cargando datos del Mundial…</p>}

        {cargado && tab === 'partidos' && (
          <>
            {enVivo.length > 0 && (
              <>
                <h2 className="seccion-titulo">En vivo</h2>
                {enVivo.map((m) => <MatchCard key={m.id} match={m} myPick={bets[m.id] ?? null} onPick={onPick} />)}
              </>
            )}
            <h2 className="seccion-titulo">Próximos</h2>
            {proximos.length ? (
              proximos.slice(0, 30).map((m) => <MatchCard key={m.id} match={m} myPick={bets[m.id] ?? null} onPick={onPick} />)
            ) : (
              <p className="vacio">No hay partidos programados por ahora.</p>
            )}
            {terminados.length > 0 && (
              <>
                <h2 className="seccion-titulo">Resultados</h2>
                {terminados.slice(0, 30).map((m) => <MatchCard key={m.id} match={m} myPick={bets[m.id] ?? null} onPick={onPick} />)}
              </>
            )}
          </>
        )}

        {cargado && tab === 'grupos' && <Standings standings={standings} />}

        {cargado && tab === 'apuestas' && (
          conApuesta.length ? (
            <>
              <div className="stats">
                <div className="stat"><div className="valor verde">{aciertos}</div><div className="label">Aciertos</div></div>
                <div className="stat"><div className="valor rojo">{fallos}</div><div className="label">Fallos</div></div>
                <div className="stat"><div className="valor azul">{efectividad === null ? '—' : efectividad + '%'}</div><div className="label">Efectividad</div></div>
              </div>
              {conApuesta.map((m) => <MatchCard key={m.id} match={m} myPick={bets[m.id]} onPick={onPick} />)}
            </>
          ) : (
            <p className="vacio">Todavía no has apostado a ningún partido. Ve a la pestaña Partidos y elige 1, X o 2.</p>
          )
        )}

        {cargado && tab === 'ia' && <AIPredict matches={matches} />}
      </main>

      <style jsx global>{`
        :root {
          --hielo: #0b1220; --escarcha: #121c2e; --borde: #1f2d44;
          --celeste: #8fd6ff; --cancha: #34d17b; --roja: #ff5d5d;
          --ambar: #ffc94d; --tiza: #eaf2fa; --gris: #8da2bb;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { color-scheme: dark; }
        body {
          background: var(--hielo); color: var(--tiza);
          font-family: 'Barlow', system-ui, sans-serif; min-height: 100vh;
          background-image: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(143,214,255,0.08), transparent);
        }
        .container { max-width: 880px; margin: 0 auto; padding: 0 16px 80px; }
        header.hero { text-align: center; padding: 40px 16px 24px; }
        .wordmark {
          font-family: 'Anton', sans-serif; font-size: clamp(2.4rem, 8vw, 4.2rem);
          line-height: 0.95; text-transform: uppercase;
          background: linear-gradient(180deg, #fff 0%, var(--celeste) 55%, #4a9fd4 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .tagline { margin-top: 10px; color: var(--gris); font-size: 0.95rem; letter-spacing: 0.12em; text-transform: uppercase; }
        .tagline b { color: var(--celeste); font-weight: 600; }
        nav.tabs {
          display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;
          position: sticky; top: 0; padding: 12px 0; z-index: 10;
          background: linear-gradient(180deg, var(--hielo) 75%, transparent);
        }
        .tab {
          font-family: 'Barlow', sans-serif; font-weight: 600; font-size: 0.9rem;
          letter-spacing: 0.04em; text-transform: uppercase; color: var(--gris);
          background: var(--escarcha); border: 1px solid var(--borde); border-radius: 999px;
          padding: 9px 18px; cursor: pointer; transition: color 0.15s, border-color 0.15s;
        }
        .tab:hover { color: var(--tiza); }
        .tab:focus-visible { outline: 2px solid var(--celeste); outline-offset: 2px; }
        .tab.active { color: #06121f; background: var(--celeste); border-color: var(--celeste); }
        .boleta {
          background: var(--escarcha); border: 1px solid var(--borde);
          border-radius: 14px; padding: 16px; margin-bottom: 12px; position: relative;
        }
        .boleta::before {
          content: ''; position: absolute; left: 12px; right: 12px; top: -1px; height: 1px;
          background-image: radial-gradient(circle, var(--hielo) 2.5px, transparent 3px);
          background-size: 14px 6px; background-position: 0 -2px;
        }
        .boleta.acierto { border-color: var(--cancha); box-shadow: 0 0 0 1px var(--cancha) inset; }
        .boleta.fallo { border-color: var(--roja); box-shadow: 0 0 0 1px var(--roja) inset; }
        .boleta-meta {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--gris); margin-bottom: 12px;
        }
        .badge { border-radius: 999px; padding: 3px 10px; font-weight: 700; font-size: 0.7rem; }
        .badge.live { background: rgba(255,93,93,0.15); color: var(--roja); animation: pulse 1.6s infinite; }
        .badge.fin { background: rgba(141,162,187,0.15); color: var(--gris); }
        .badge.prog { background: rgba(143,214,255,0.12); color: var(--celeste); }
        @keyframes pulse { 50% { opacity: 0.5; } }
        @media (prefers-reduced-motion: reduce) { .badge.live { animation: none; } }
        .equipos { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
        .equipo { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .equipo.away { flex-direction: row-reverse; text-align: right; }
        .equipo img { width: 30px; height: 30px; object-fit: contain; }
        .equipo span { font-weight: 600; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .marcador { font-family: 'Anton', sans-serif; font-size: 1.7rem; font-variant-numeric: tabular-nums; min-width: 76px; text-align: center; }
        .marcador.vs { color: var(--gris); font-size: 1.1rem; }
        .picks { display: flex; gap: 8px; margin-top: 14px; }
        .pick {
          flex: 1; background: var(--hielo); border: 1px solid var(--borde); border-radius: 10px;
          color: var(--tiza); font-family: 'Barlow', sans-serif; font-weight: 700;
          font-size: 0.85rem; padding: 10px 6px; cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .pick:hover { border-color: var(--celeste); }
        .pick:focus-visible { outline: 2px solid var(--celeste); outline-offset: 2px; }
        .pick.elegido { background: rgba(143,214,255,0.15); border-color: var(--celeste); color: var(--celeste); }
        .pick:disabled { cursor: default; opacity: 0.55; }
        .pick.gano { background: rgba(52,209,123,0.15); border-color: var(--cancha); color: var(--cancha); opacity: 1; }
        .pick.perdio { background: rgba(255,93,93,0.12); border-color: var(--roja); color: var(--roja); opacity: 1; }
        .pick small { display: block; font-weight: 500; color: var(--gris); font-size: 0.7rem; margin-top: 2px; }
        .veredicto { margin-top: 10px; font-size: 0.85rem; font-weight: 600; }
        .veredicto.bien { color: var(--cancha); }
        .veredicto.mal { color: var(--roja); }
        .seccion-titulo {
          font-family: 'Anton', sans-serif; font-size: 1.15rem; text-transform: uppercase;
          color: var(--celeste); margin: 28px 0 12px; display: flex; align-items: center; gap: 10px;
        }
        .seccion-titulo::after { content: ''; flex: 1; height: 1px; background: var(--borde); }
        .tabla-wrap { overflow-x: auto; margin-bottom: 24px; }
        table.grupo { width: 100%; border-collapse: collapse; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
        table.grupo th {
          text-align: left; color: var(--gris); font-size: 0.7rem; text-transform: uppercase;
          letter-spacing: 0.08em; padding: 8px; border-bottom: 1px solid var(--borde);
        }
        table.grupo th.c { text-align: center; }
        table.grupo td { padding: 9px 8px; border-bottom: 1px solid var(--borde); }
        table.grupo td.num { text-align: center; color: var(--gris); }
        table.grupo td.pts { font-weight: 700; color: var(--celeste); text-align: center; }
        table.grupo tr.clasifica td:first-child { box-shadow: inset 3px 0 0 var(--cancha); }
        .celda-equipo { display: flex; align-items: center; gap: 8px; }
        .celda-equipo img { width: 20px; height: 20px; object-fit: contain; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 24px; }
        .stat { background: var(--escarcha); border: 1px solid var(--borde); border-radius: 14px; padding: 16px; text-align: center; }
        .stat .valor { font-family: 'Anton', sans-serif; font-size: 2rem; }
        .stat .valor.verde { color: var(--cancha); }
        .stat .valor.rojo { color: var(--roja); }
        .stat .valor.azul { color: var(--celeste); }
        .stat .label { color: var(--gris); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
        .chat-box { background: var(--escarcha); border: 1px solid var(--borde); border-radius: 14px; padding: 16px; margin-top: 20px; }
        .chat-respuesta { white-space: pre-wrap; line-height: 1.6; font-size: 0.95rem; margin-top: 14px; border-top: 1px solid var(--borde); padding-top: 14px; }
        .chat-form { display: flex; gap: 8px; }
        .chat-form input {
          flex: 1; background: var(--hielo); border: 1px solid var(--borde); border-radius: 10px;
          color: var(--tiza); padding: 12px; font-family: inherit; font-size: 0.95rem;
        }
        .chat-form input:focus-visible { outline: 2px solid var(--celeste); outline-offset: 1px; }
        .boton { background: var(--celeste); color: #06121f; border: none; border-radius: 10px; font-weight: 700; padding: 12px 20px; cursor: pointer; font-family: inherit; }
        .boton:disabled { opacity: 0.6; cursor: wait; }
        .aviso {
          background: rgba(255,201,77,0.1); border: 1px solid rgba(255,201,77,0.35);
          color: var(--ambar); border-radius: 12px; padding: 14px; font-size: 0.9rem; margin: 16px 0;
        }
        .vacio { color: var(--gris); text-align: center; padding: 40px 16px; }
      `}</style>
    </>
  );
}
