import type { NextApiRequest, NextApiResponse } from 'next';

// Shared bets stored in Supabase (REST API, no extra dependencies).
// Needs SUPABASE_URL and SUPABASE_ANON_KEY env vars in Vercel.

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

function sbHeaders() {
  return {
    apikey: SB_KEY as string,
    Authorization: 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SB_URL || !SB_KEY) {
    return res.status(503).json({
      error: 'Missing SUPABASE_URL / SUPABASE_ANON_KEY in Vercel environment variables.',
    });
  }
  const base = SB_URL.replace(/\/$/, '') + '/rest/v1/polla_bets';

  try {
    // ---- List all bets ----
    if (req.method === 'GET') {
      const r = await fetch(base + '?select=*&order=created_at.desc&limit=3000', {
        headers: sbHeaders(),
      });
      if (!r.ok) return res.status(500).json({ error: 'Supabase responded ' + r.status });
      const bets = await r.json();
      return res.status(200).json({ bets });
    }

    // ---- Place a bet ----
    if (req.method === 'POST') {
      const b = req.body || {};
      const player = String(b.player || '').trim().slice(0, 30);
      const amount = Math.round(Number(b.amount));
      const betType = b.bet_type === 'SCORE' ? 'SCORE' : '1X2';

      if (!player) return res.status(400).json({ error: 'Player name is required.' });
      if (!b.match_id) return res.status(400).json({ error: 'Missing match.' });
      if (!Number.isFinite(amount) || amount <= 0)
        return res.status(400).json({ error: 'Bet amount must be greater than 0.' });

      // Betting window: open until kickoff, plus a 12-minute grace
      // period after kickoff ONLY while the score is still 0-0.
      const GRACE_MS = 12 * 60 * 1000;
      const ko = b.kickoff ? new Date(b.kickoff).getTime() : 0;
      if (!ko || Date.now() > ko + GRACE_MS)
        return res.status(400).json({ error: 'Betting is closed for this match.' });
      if (Date.now() > ko) {
        // Inside the grace window: verify with the live API that it is still 0-0
        const fk = process.env.FOOTBALL_DATA_API_KEY;
        if (fk) {
          const mr = await fetch('https://api.football-data.org/v4/matches/' + Number(b.match_id), {
            headers: { 'X-Auth-Token': fk },
          });
          if (mr.ok) {
            const md = await mr.json();
            const gh = md?.score?.fullTime?.home ?? 0;
            const ga = md?.score?.fullTime?.away ?? 0;
            if (md?.status === 'FINISHED' || gh !== 0 || ga !== 0)
              return res.status(400).json({ error: 'Late window closed — someone already scored.' });
          }
        }
      }
      if (betType === '1X2' && !['HOME', 'DRAW', 'AWAY'].includes(b.pick))
        return res.status(400).json({ error: 'Choose 1, X or 2.' });
      if (betType === 'SCORE') {
        const h = Number(b.score_home);
        const a = Number(b.score_away);
        if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20)
          return res.status(400).json({ error: 'Enter a valid score.' });
      }

      const row = {
        player,
        match_id: Number(b.match_id),
        match_label: String(b.match_label || '').slice(0, 120),
        kickoff: b.kickoff,
        bet_type: betType,
        pick: betType === '1X2' ? b.pick : null,
        score_home: betType === 'SCORE' ? Number(b.score_home) : null,
        score_away: betType === 'SCORE' ? Number(b.score_away) : null,
        amount,
      };
      const r = await fetch(base, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify(row),
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(500).json({ error: 'Supabase: ' + t.slice(0, 200) });
      }
      const inserted = await r.json();
      return res.status(200).json({ bet: inserted[0] });
    }

    // ---- Cancel own bet (only before kickoff) ----
    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      const player = String(req.query.player || '').trim();
      if (!id || !player) return res.status(400).json({ error: 'Missing id or player.' });

      const check = await fetch(
        base + '?id=eq.' + encodeURIComponent(id) + '&select=id,player,kickoff',
        { headers: sbHeaders() }
      );
      const rows = await check.json();
      if (!rows.length) return res.status(404).json({ error: 'Bet not found.' });
      if (rows[0].player !== player) return res.status(403).json({ error: 'Not your bet.' });
      if (new Date(rows[0].kickoff).getTime() <= Date.now())
        return res.status(400).json({ error: 'Match already started — bet is locked.' });

      const del = await fetch(base + '?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: sbHeaders(),
      });
      if (!del.ok) return res.status(500).json({ error: 'Supabase responded ' + del.status });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
