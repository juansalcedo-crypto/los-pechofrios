'use client';

import type { GroupStanding } from '@/lib/types';

export default function Standings({ standings }: { standings: GroupStanding[] }) {
  if (!standings.length) {
    return <p className="vacio">Las tablas aparecerán cuando arranque la fase de grupos.</p>;
  }
  return (
    <div>
      {standings.map((g) => (
        <section key={g.group}>
          <h2 className="seccion-titulo">{g.group.replace('GROUP_', 'Grupo ')}</h2>
          <div className="tabla-wrap">
            <table className="grupo">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipo</th>
                  <th style={{ textAlign: 'center' }}>PJ</th>
                  <th style={{ textAlign: 'center' }}>G</th>
                  <th style={{ textAlign: 'center' }}>E</th>
                  <th style={{ textAlign: 'center' }}>P</th>
                  <th style={{ textAlign: 'center' }}>DG</th>
                  <th style={{ textAlign: 'center' }}>Pts</th>
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
                    <td className="num">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
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
