'use client';

import type { Match, Pick } from '@/lib/types';
import MatchCard from './MatchCard';

function winnerToPick(w: Match['score']['winner']): Pick | null {
  if (w === 'HOME_TEAM') return 'HOME';
  if (w === 'AWAY_TEAM') return 'AWAY';
  if (w === 'DRAW') return 'DRAW';
  return null;
}

export default function MyBets({
  matches,
  bets,
  onPick,
}: {
  matches: Match[];
  bets: Record<number, Pick>;
  onPick: (matchId: number, pick: Pick) => void;
}) {
  const conApuesta = matches.filter((m) => bets[m.id]);
  const resueltas = conApuesta.filter((m) => m.status === 'FINISHED');
  const aciertos = resueltas.filter((m) => winnerToPick(m.score.winner) === bets[m.id]).length;
  const fallos = resueltas.length - aciertos;
  const efectividad = resueltas.length ? Math.round((aciertos / resueltas.length) * 100) : null;

  if (!conApuesta.length) {
    return <p className="vacio">Todavía no has apostado a ningún partido. Ve a la pestaña Partidos y elige 1, X o 2.</p>;
  }

  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="valor verde">{aciertos}</div>
          <div className="label">Aciertos</div>
        </div>
        <div className="stat">
          <div className="valor rojo">{fallos}</div>
          <div className="label">Fallos</div>
        </div>
        <div className="stat">
          <div className="valor azul">{efectividad === null ? '—' : `${efectividad}%`}</div>
          <div className="label">Efectividad</div>
        </div>
      </div>
      {conApuesta.map((m) => (
        <MatchCard key={m.id} match={m} myPick={bets[m.id]} onPick={onPick} />
      ))}
    </div>
  );
}
