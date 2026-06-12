import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing FOOTBALL_DATA_API_KEY in Vercel.' });

  try {
    const r = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': key },
    });
    if (!r.ok) return res.status(500).json({ error: 'football-data responded ' + r.status });
    const data = await r.json();
    // Single shared cache at Vercel's edge (30s) - consistent for everyone.
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
    return res.status(200).json({ matches: data.matches });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
