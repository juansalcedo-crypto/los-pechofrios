'use client';

import type { Match, Pick } from '@/lib/types';

const NOMBRES_PICK: Record<Pick, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

function winnerToPick(w: Match['score']['winner']): Pick | null {
  if (w === 'HOME_TEAM') return 'HOME';
  if (w === 'AWAY_TEAM') return 'AWAY';
  if (w === 'DRAW') return 'DRAW';
  return null;
}

export default function MatchCard({
  match,
  myPick,
  onPick,
}: {
  match: Match;
  myPick: Pick | null;
  onPick: (matchId: number, pick: Pick) => void;
}) {
  const fecha = new Date(match.utcDate);
  const enVivo = match.status === 'IN_PLAY' || match.status === 'PAUSED';
  const terminado = match.status === 'FINISHED';
  const resultado = winnerToPick(match.score.winner);
  const acerto = terminado && myPick != null && myPick === resultado;
  const fallo = terminado && myPick != null && myPick !== resultado;
  const bloqueado = terminado || enVivo;

  const clase = ['boleta', acerto ? 'acierto' : '', fallo ? 'fallo' : ''].join(' ').trim();

  return (
    <article className={clase}>
      <div className="boleta-meta">
        <span>{match.group ?? match.stage.replaceAll('_', ' ')}</span>
        {enVivo ? (
          <span className="badge live">● En vivo</span>
        ) : terminado ? (
          <span className="badge fin">Final</span>
        ) : (
          <span className="badge prog">
            {fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ·{' '}
            {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="equipos">
        <div className="equipo">
          {match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" />}
          <span>{match.homeTeam.shortName || match.homeTeam.name}</span>
        </div>
        {terminado || enVivo ? (
          <div className="marcador">
            {match.score.fullTime.home ?? 0} – {match.score.fullTime.away ?? 0}
          </div>
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
          let clasePick = 'pick';
          if (terminado && elegido) clasePick += acerto ? ' gano' : ' perdio';
          else if (elegido) clasePick += ' elegido';
          return (
            <button
              key={p}
              className={clasePick}
              disabled={bloqueado}
              onClick={() => onPick(match.id, p)}
              aria-pressed={elegido}
            >
              {NOMBRES_PICK[p]}
              <small>
                {p === 'HOME'
                  ? match.homeTeam.tla || 'Local'
                  : p === 'AWAY'
                    ? match.awayTeam.tla || 'Visita'
                    : 'Empate'}
              </small>
            </button>
          );
        })}
      </div>

      {terminado && myPick && (
        <p className={`veredicto ${acerto ? 'bien' : 'mal'}`}>
          {acerto ? '✓ La pegaste, crack' : '✗ Pecho frío confirmado'}
        </p>
      )}
    </article>
  );
}
