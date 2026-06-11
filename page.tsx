'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Match, GroupStanding, Pick } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import Standings from '@/components/Standings';
import MyBets from '@/components/MyBets';
import AIPredict from '@/components/AIPredict';

type Tab = 'partidos' | 'grupos' | 'apuestas' | 'ia';
const BETS_KEY = 'pechofrios_bets_v1';

export default function Home() {
  const [tab, setTab] = useState<Tab>('partidos');
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [bets, setBets] = useState<Record<number, Pick>>({});
  const [error, setError] = useState('');
  const [cargado, setCargado] = useState(false);

  // Cargar apuestas guardadas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BETS_KEY);
      if (raw) setBets(JSON.parse(raw));
    } catch {}
  }, []);

  function onPick(matchId: number, pick: Pick) {
    setBets((prev) => {
      const next = { ...prev };
      if (next[matchId] === pick) delete next[matchId];
      else next[matchId] = pick;
      try {
        localStorage.setItem(BETS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // Cargar datos + refresco automático cada 60 segundos
  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const [rm, rs] = await Promise.all([fetch('/api/matches'), fetch('/api/standings')]);
        const dm = await rm.json();
        const ds = await rs.json();
        if (!activo) return;
        if (dm.error) setError(dm.error);
        else {
          setMatches(dm.matches || []);
          setError('');
        }
        if (!ds.error) setStandings(ds.standings || []);
      } catch {
        if (activo) setError('No se pudieron cargar los datos. Revisa tu conexión.');
      } finally {
        if (activo) setCargado(true);
      }
    }
    cargar();
    const intervalo = setInterval(cargar, 60_000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  const { enVivo, proximos, terminados } = useMemo(() => {
    const enVivo = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED');
    const proximos = matches
      .filter((m) => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    const terminados = matches
      .filter((m) => m.status === 'FINISHED')
      .sort((a, b) => b.utcDate.localeCompare(a.utcDate));
    return { enVivo, proximos, terminados };
  }, [matches]);

  return (
    <main className="container">
      <header className="hero">
        <h1 className="wordmark">Los Pechofríos ❄</h1>
        <p className="tagline">
          Polla Mundial 2026 · resultados en vivo · <b>se actualiza sola cada minuto</b>
        </p>
      </header>

      <nav className="tabs" aria-label="Secciones">
        {(
          [
            ['partidos', 'Partidos'],
            ['grupos', 'Grupos'],
            ['apuestas', 'Mis apuestas'],
            ['ia', 'IA Predicciones'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {error && <div className="aviso">{error}</div>}
      {!cargado && <p className="vacio">Cargando datos del Mundial…</p>}

      {cargado && tab === 'partidos' && (
        <>
          {enVivo.length > 0 && (
            <>
              <h2 className="seccion-titulo">En vivo</h2>
              {enVivo.map((m) => (
                <MatchCard key={m.id} match={m} myPick={bets[m.id] ?? null} onPick={onPick} />
              ))}
            </>
          )}
          <h2 className="seccion-titulo">Próximos</h2>
          {proximos.length ? (
            proximos.slice(0, 30).map((m) => (
              <MatchCard key={m.id} match={m} myPick={bets[m.id] ?? null} onPick={onPick} />
            ))
          ) : (
            <p className="vacio">No hay partidos programados por ahora.</p>
          )}
          {terminados.length > 0 && (
            <>
              <h2 className="seccion-titulo">Resultados</h2>
              {terminados.slice(0, 30).map((m) => (
                <MatchCard key={m.id} match={m} myPick={bets[m.id] ?? null} onPick={onPick} />
              ))}
            </>
          )}
        </>
      )}

      {cargado && tab === 'grupos' && <Standings standings={standings} />}
      {cargado && tab === 'apuestas' && <MyBets matches={matches} bets={bets} onPick={onPick} />}
      {cargado && tab === 'ia' && <AIPredict matches={matches} />}
    </main>
  );
}
