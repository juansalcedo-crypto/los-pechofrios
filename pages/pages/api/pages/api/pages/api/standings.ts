import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { data: any; ts: number } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'Falta FOOTBALL_DATA_API_KEY en Vercel.' });

  if (cache && Date.now() - cache.ts < 300_000) {
    return res.status(200).json(cache.data);
  }

  try {
    const r = await fetch('https://api.football-data.org/v4/competitions/WC/standings', {
      headers: { 'X-Auth-Token': key },
    });
    if (!r.ok) return res.status(500).json({ error: 'football-data respondio ' + r.status });
    const data = await r.json();
    const standings = (data.standings || [])
      .filter((s: any) => s.type === 'TOTAL')
      .map((s: any) => ({ group: s.group || s.stage, table: s.table }));
    cache = { data: { standings }, ts: Date.now() };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ standings });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
