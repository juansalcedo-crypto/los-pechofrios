import type { Match, GroupStanding } from './types';

const BASE = 'https://api.football-data.org/v4/competitions/WC';

function headers() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error('Falta FOOTBALL_DATA_API_KEY en las variables de entorno');
  return { 'X-Auth-Token': key };
}

// next.revalidate cachea la respuesta 60s en el servidor:
// la app se "actualiza sola" sin gastar el límite de la API gratuita.
export async function getMatches(): Promise<Match[]> {
  const res = await fetch(`${BASE}/matches`, {
    headers: headers(),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`football-data respondió ${res.status}`);
  const data = await res.json();
  return data.matches as Match[];
}

export async function getStandings(): Promise<GroupStanding[]> {
  const res = await fetch(`${BASE}/standings`, {
    headers: headers(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`football-data respondió ${res.status}`);
  const data = await res.json();
  return (data.standings || [])
    .filter((s: any) => s.type === 'TOTAL')
    .map((s: any) => ({ group: s.group ?? s.stage, table: s.table }));
}
