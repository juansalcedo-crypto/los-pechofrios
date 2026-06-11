import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { data: any; ts: number } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'Falta FOOTBALL_DATA_API_KEY en Vercel.' });

  // Cache de 60s para no pasarse del limite gratuito de la API
  if (cache && Date.now() - cache.ts < 60_000) {
    return res.status(200).json(cache.data);
  }

  try {
    const r = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': key },
    });
    if (!r.ok) return res.status(500).json({ error: 'football-data respondio ' + r.status });
    const data = await r.json();
    cache = { data: { matches: data.matches }, ts: Date.now() };
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ matches: data.matches });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
