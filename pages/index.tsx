import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

// ============ Types ============
type PickT = 'HOME' | 'DRAW' | 'AWAY';
type View = 'today' | 'active' | 'results' | 'winners' | 'ai';

interface Team { id: number; name: string; shortName?: string; tla?: string; crest?: string }
interface Match {
  id: number; utcDate: string; status: string; stage: string; group: string | null;
  homeTeam: Team; awayTeam: Team;
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
}
interface Bet {
  id: string; player: string; match_id: number; match_label: string; kickoff: string;
  bet_type: '1X2' | 'SCORE'; pick: PickT | null;
  score_home: number | null; score_away: number | null; amount: number; created_at: string;
}

const PLAYER_KEY = 'pechofrios_player_v1';
const TZ = 'America/Bogota';
const CHIP_VALUES = [5000, 10000, 20000, 50000];

const fmtMoney = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');

function winnerToPick(w: string | null): PickT | null {
  if (w === 'HOME_TEAM') return 'HOME';
  if (w === 'AWAY_TEAM') return 'AWAY';
  if (w === 'DRAW') return 'DRAW';
  return null;
}
function dayStr(d: string | Date) {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
}
function isLive(m: Match) { return m.status === 'IN_PLAY' || m.status === 'PAUSED'; }
function isDone(m: Match) { return m.status === 'FINISHED'; }
function isOpen(m: Match) { return !isLive(m) && !isDone(m) && new Date(m.utcDate).getTime() > Date.now(); }
function betWon(m: Match, b: Bet): boolean {
  if (b.bet_type === '1X2') return winnerToPick(m.score.winner) === b.pick;
  return m.score.fullTime.home === b.score_home && m.score.fullTime.away === b.score_away;
}
function betLabel(b: Bet, m?: Match): string {
  if (b.bet_type === 'SCORE') return 'Exact ' + b.score_home + '–' + b.score_away;
  if (b.pick === 'DRAW') return 'Draw (X)';
  if (!m) return b.pick === 'HOME' ? 'Home (1)' : 'Away (2)';
  return b.pick === 'HOME'
    ? (m.homeTeam.tla || m.homeTeam.shortName || 'Home') + ' (1)'
    : (m.awayTeam.tla || m.awayTeam.shortName || 'Away') + ' (2)';
}

// Pari-mutuel settlement: per match + bet type, losers' money is split
// among winners proportionally to their stake. No winners = full refund.
interface Settled { bet: Bet; won: boolean; payout: number }
function settlePool(m: Match, bets: Bet[]): Settled[] {
  const out: Settled[] = [];
  (['1X2', 'SCORE'] as const).forEach((type) => {
    const pool = bets.filter((b) => b.bet_type === type);
    if (!pool.length) return;
    const winners = pool.filter((b) => betWon(m, b));
    const winStake = winners.reduce((s, b) => s + b.amount, 0);
    const loseStake = pool.filter((b) => !betWon(m, b)).reduce((s, b) => s + b.amount, 0);
    pool.forEach((b) => {
      const won = betWon(m, b);
      let payout = 0;
      if (winners.length === 0) payout = b.amount; // nobody hit it → refund
      else if (won) payout = b.amount + (loseStake * b.amount) / winStake;
      out.push({ bet: b, won, payout });
    });
  });
  return out;
}

// ============ Match card with betting panel ============
function MatchCard({ match, bets, player, onPlaced, onCancel }: {
  match: Match; bets: Bet[]; player: string;
  onPlaced: () => void; onCancel: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'1X2' | 'SCORE'>('1X2');
  const [pick, setPick] = useState<PickT | null>(null);
  const [sh, setSh] = useState(0);
  const [sa, setSa] = useState(0);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const kickoff = new Date(match.utcDate);
  const live = isLive(match);
  const done = isDone(match);
  const bettable = isOpen(match);
  const matchBets = bets.filter((b) => b.match_id === match.id);
  const pot = matchBets.reduce((s, b) => s + b.amount, 0);
  const settled = done ? settlePool(match, matchBets) : [];

  async function placeBet() {
    setMsg('');
    if (type === '1X2' && !pick) return setMsg('Pick 1, X or 2 first.');
    if (!amount || amount <= 0) return setMsg('Enter your bet amount.');
    setBusy(true);
    try {
      const r = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player,
          match_id: match.id,
          match_label: (match.homeTeam.shortName || match.homeTeam.name) + ' vs ' + (match.awayTeam.shortName || match.awayTeam.name),
          kickoff: match.utcDate,
          bet_type: type,
          pick,
          score_home: sh,
          score_away: sa,
          amount,
        }),
      });
      const data = await r.json();
      if (!r.ok) setMsg(data.error || 'Could not place bet.');
      else {
        setMsg('✓ Bet placed. Good luck!');
        setAmount(0); setPick(null);
        onPlaced();
      }
    } catch {
      setMsg('Connection error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={'card' + (live ? ' is-live' : '')}>
      <div className="card-top">
        <span className="stage">{match.group || match.stage.split('_').join(' ')}</span>
        {live ? <span className="tag live">● LIVE</span>
          : done ? <span className="tag done">FINAL</span>
          : <span className="tag time">{kickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })} · {kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })}</span>}
      </div>

      <div className="teams">
        <div className="team">
          {match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" />}
          <span>{match.homeTeam.shortName || match.homeTeam.name}</span>
        </div>
        {live || done
          ? <div className="score">{match.score.fullTime.home ?? 0}–{match.score.fullTime.away ?? 0}</div>
          : <div className="score vs">VS</div>}
        <div className="team away">
          {match.awayTeam.crest && <img src={match.awayTeam.crest} alt="" />}
          <span>{match.awayTeam.shortName || match.awayTeam.name}</span>
        </div>
      </div>

      {pot > 0 && (
        <div className="pot">💰 POT <b>{fmtMoney(pot)}</b> · {matchBets.length} bet{matchBets.length > 1 ? 's' : ''}</div>
      )}

      {/* Everyone's bets on this match */}
      {matchBets.length > 0 && (
        <div className="bet-list">
          {matchBets.map((b) => {
            const s = settled.find((x) => x.bet.id === b.id);
            return (
              <div key={b.id} className={'bet-row' + (s ? (s.won ? ' won' : ' lost') : '')}>
                <span className="who">{b.player}</span>
                <span className="what">{betLabel(b, match)}</span>
                <span className="amt">{fmtMoney(b.amount)}</span>
                {s && <span className="pay">{s.won ? '→ ' + fmtMoney(s.payout) : (s.payout > 0 ? '↩ refund' : '✗')}</span>}
                {!s && bettable && b.player === player && (
                  <button className="x" title="Cancel bet" onClick={() => onCancel(b.id)}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {bettable && (
        !open ? (
          <button className="cta" onClick={() => setOpen(true)}>PLACE YOUR BET</button>
        ) : (
          <div className="panel">
            <div className="type-switch">
              <button className={type === '1X2' ? 'on' : ''} onClick={() => setType('1X2')}>Match Winner</button>
              <button className={type === 'SCORE' ? 'on' : ''} onClick={() => setType('SCORE')}>Exact Score</button>
            </div>

            {type === '1X2' ? (
              <div className="picks">
                {(['HOME', 'DRAW', 'AWAY'] as PickT[]).map((p) => (
                  <button key={p} className={'pick' + (pick === p ? ' sel' : '')} onClick={() => setPick(p)}>
                    {p === 'HOME' ? '1' : p === 'DRAW' ? 'X' : '2'}
                    <small>{p === 'HOME' ? match.homeTeam.tla || 'Home' : p === 'AWAY' ? match.awayTeam.tla || 'Away' : 'Draw'}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="score-input">
                <div className="stepper">
                  <button onClick={() => setSh(Math.max(0, sh - 1))}>−</button>
                  <b>{sh}</b>
                  <button onClick={() => setSh(Math.min(20, sh + 1))}>+</button>
                </div>
                <span className="dash">:</span>
                <div className="stepper">
                  <button onClick={() => setSa(Math.max(0, sa - 1))}>−</button>
                  <b>{sa}</b>
                  <button onClick={() => setSa(Math.min(20, sa + 1))}>+</button>
                </div>
              </div>
            )}

            <div className="chips">
              {CHIP_VALUES.map((v) => (
                <button key={v} className="chip" onClick={() => setAmount(amount + v)}>+{v / 1000}K</button>
              ))}
              <button className="chip clear" onClick={() => setAmount(0)}>CLEAR</button>
            </div>
            <div className="amount-row">
              <input
                type="number" min={0} placeholder="Amount"
                value={amount || ''} onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              />
              <button className="gold" disabled={busy} onClick={placeBet}>{busy ? '...' : 'BET ' + (amount ? fmtMoney(amount) : '')}</button>
            </div>
            {msg && <p className={'note' + (msg.startsWith('✓') ? ' ok' : '')}>{msg}</p>}
            <button className="ghost" onClick={() => { setOpen(false); setMsg(''); }}>Close</button>
          </div>
        )
      )}
      {live && <p className="locked">🔒 Betting closed — match in play</p>}
    </article>
  );
}

// ============ AI Analyst ============
function AIView({ matches }: { matches: Match[] }) {
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function ask() {
    if (!q.trim() || busy) return;
    setBusy(true); setErr(''); setA('');
    const up = matches.filter(isOpen).slice(0, 20)
      .map((m) => m.homeTeam.name + ' vs ' + m.awayTeam.name + ' (' + (m.group || m.stage) + ', ' + m.utcDate.slice(0, 10) + ')');
    const past = matches.filter(isDone).slice(-15)
      .map((m) => m.homeTeam.name + ' ' + m.score.fullTime.home + '-' + m.score.fullTime.away + ' ' + m.awayTeam.name);
    try {
      const r = await fetch('/api/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q + ' (answer in English)', context: 'UPCOMING:\n' + up.join('\n') + '\n\nRECENT RESULTS:\n' + past.join('\n') }),
      });
      const d = await r.json();
      if (!r.ok) setErr(d.error || 'Something failed.');
      else setA(d.answer);
    } catch { setErr('Connection error.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="ai-box">
      <div className="ai-form">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Who wins Colombia vs Germany?" />
        <button className="gold" onClick={ask} disabled={busy}>{busy ? 'Dealing…' : 'ASK THE HOUSE'}</button>
      </div>
      {err && <div className="warn">{err}</div>}
      {a && <div className="ai-answer">{a}</div>}
      {!a && !err && <p className="hint">The house analyst reads the real fixture data and gives you a tip. A tip — not a guarantee. The house always reminds you of that.</p>}
    </div>
  );
}

// ============ Main ============
export default function Home() {
  const [player, setPlayer] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [view, setView] = useState<View>('today');
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const p = localStorage.getItem(PLAYER_KEY); if (p) setPlayer(p); } catch {}
  }, []);

  async function load() {
    try {
      const [rm, rb] = await Promise.all([fetch('/api/matches'), fetch('/api/bets')]);
      const dm = await rm.json();
      const db = await rb.json();
      if (dm.error) setErr(dm.error);
      else { setMatches(dm.matches || []); setErr(db.error || ''); }
      if (!db.error) setBets(db.bets || []);
    } catch {
      setErr('Could not load data. Check your connection.');
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  async function cancelBet(id: string) {
    try {
      const r = await fetch('/api/bets?id=' + encodeURIComponent(id) + '&player=' + encodeURIComponent(player), { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) alert(d.error || 'Could not cancel.');
      else load();
    } catch { alert('Connection error.'); }
  }

  function enter() {
    const n = nameInput.trim().slice(0, 30);
    if (!n) return;
    setPlayer(n);
    try { localStorage.setItem(PLAYER_KEY, n); } catch {}
  }

  const today = dayStr(new Date());
  const todays = useMemo(
    () => matches.filter((m) => dayStr(m.utcDate) === today).sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    [matches, today]
  );
  const upcoming = useMemo(
    () => matches.filter((m) => isOpen(m) && dayStr(m.utcDate) !== today).sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    [matches, today]
  );
  const finished = useMemo(
    () => matches.filter(isDone).sort((a, b) => b.utcDate.localeCompare(a.utcDate)),
    [matches]
  );
  const activeBetMatches = useMemo(() => {
    const ids = new Set(bets.filter((b) => {
      const m = matches.find((x) => x.id === b.match_id);
      return m && !isDone(m);
    }).map((b) => b.match_id));
    return matches.filter((m) => ids.has(m.id)).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }, [bets, matches]);

  // Leaderboard across all finished matches
  const board = useMemo(() => {
    const acc: Record<string, { staked: number; returned: number; wins: number; bets: number }> = {};
    bets.forEach((b) => {
      acc[b.player] = acc[b.player] || { staked: 0, returned: 0, wins: 0, bets: 0 };
      acc[b.player].bets += 1;
    });
    finished.forEach((m) => {
      const s = settlePool(m, bets.filter((b) => b.match_id === m.id));
      s.forEach(({ bet, won, payout }) => {
        const a = acc[bet.player];
        if (!a) return;
        a.staked += bet.amount;
        a.returned += payout;
        if (won) a.wins += 1;
      });
    });
    return Object.entries(acc)
      .map(([name, v]) => ({ name, ...v, net: v.returned - v.staked }))
      .sort((a, b) => b.net - a.net);
  }, [bets, finished]);

  const NAV: [View, string][] = [
    ['today', '🎰 Today'], ['active', '🎟 Active Bets'], ['results', '📜 Results'], ['winners', '🏆 Winners'], ['ai', '🤖 AI Tips'],
  ];

  return (
    <>
      <Head>
        <title>Los Pechofríos — World Cup Betting Club</title>
        <meta name="description" content="Private World Cup 2026 betting pool — Los Pechofríos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* ---- Name gate ---- */}
      {!player && (
        <div className="gate">
          <div className="gate-card">
            <div className="gate-mark">LOS PECHOFRÍOS ❄</div>
            <p className="gate-sub">WORLD CUP 2026 · PRIVATE BETTING CLUB</p>
            <p className="gate-q">Who's playing tonight?</p>
            <input
              autoFocus value={nameInput} maxLength={30}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enter()}
              placeholder="Your name"
            />
            <button className="gold big" onClick={enter}>ENTER THE CLUB</button>
            <p className="gate-note">Use the same name every time — your bets and winnings are tracked by name.</p>
          </div>
        </div>
      )}

      <main className="wrap">
        <header className="hero">
          <h1 className="mark">Los Pechofríos ❄</h1>
          <p className="sub">WORLD CUP 2026 BETTING CLUB · AUTO-REFRESH EVERY MINUTE</p>
          {player && (
            <div className="player-chip">
              🎩 {player}
              <button onClick={() => { setPlayer(''); setNameInput(''); try { localStorage.removeItem(PLAYER_KEY); } catch {} }}>switch</button>
            </div>
          )}
        </header>

        <nav className="nav">
          {NAV.map(([id, label]) => (
            <button key={id} className={'nav-btn' + (view === id ? ' on' : '')} onClick={() => setView(id)}>{label}</button>
          ))}
        </nav>

        {err && <div className="warn">{err}</div>}
        {!ready && <p className="empty">Shuffling the deck…</p>}

        {/* ---- TODAY ---- */}
        {ready && view === 'today' && (
          <>
            <h2 className="h">Today's Board · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })}</h2>
            {todays.length
              ? todays.map((m) => <MatchCard key={m.id} match={m} bets={bets} player={player} onPlaced={load} onCancel={cancelBet} />)
              : <p className="empty">No matches today. The table reopens with the next fixture.</p>}
            {upcoming.length > 0 && (
              <>
                <h2 className="h">Coming Up — bet early</h2>
                {upcoming.slice(0, 10).map((m) => <MatchCard key={m.id} match={m} bets={bets} player={player} onPlaced={load} onCancel={cancelBet} />)}
              </>
            )}
          </>
        )}

        {/* ---- ACTIVE BETS ---- */}
        {ready && view === 'active' && (
          <>
            <h2 className="h">Active Bets — money on the table</h2>
            {activeBetMatches.length
              ? activeBetMatches.map((m) => <MatchCard key={m.id} match={m} bets={bets} player={player} onPlaced={load} onCancel={cancelBet} />)
              : <p className="empty">No live tickets. Go to Today and put something on the line.</p>}
          </>
        )}

        {/* ---- RESULTS ---- */}
        {ready && view === 'results' && (
          <>
            <h2 className="h">Past Matches & Settled Pots</h2>
            {finished.length
              ? finished.slice(0, 40).map((m) => <MatchCard key={m.id} match={m} bets={bets} player={player} onPlaced={load} onCancel={cancelBet} />)
              : <p className="empty">No finished matches yet.</p>}
          </>
        )}

        {/* ---- WINNERS ---- */}
        {ready && view === 'winners' && (
          <>
            <h2 className="h">The Leaderboard — who owes who</h2>
            {board.length ? (
              <div className="board">
                <div className="board-row head">
                  <span>#</span><span>Player</span><span>Bets</span><span>Hits</span><span>Staked</span><span>Returned</span><span>Net</span>
                </div>
                {board.map((p, i) => (
                  <div key={p.name} className={'board-row' + (p.name === player ? ' me' : '')}>
                    <span className="pos">{i === 0 && p.net > 0 ? '👑' : i + 1}</span>
                    <span className="name">{p.name}</span>
                    <span>{p.bets}</span>
                    <span>{p.wins}</span>
                    <span>{fmtMoney(p.staked)}</span>
                    <span>{fmtMoney(p.returned)}</span>
                    <span className={'net' + (p.net > 0 ? ' up' : p.net < 0 ? ' down' : '')}>
                      {p.net > 0 ? '+' : ''}{fmtMoney(p.net)}
                    </span>
                  </div>
                ))}
                <p className="hint">How the pot works: per match and bet type, losers' stakes are split among winners proportionally to what each one bet. If nobody hits it, everyone gets refunded. "Net" is what each player is up or down — settle up in cash accordingly. 🤝</p>
              </div>
            ) : <p className="empty">No bets settled yet. The crown awaits.</p>}
          </>
        )}

        {/* ---- AI ---- */}
        {ready && view === 'ai' && (
          <>
            <h2 className="h">Ask the House Analyst</h2>
            <AIView matches={matches} />
          </>
        )}
      </main>

      <style jsx global>{`
        :root {
          --noche: #0a0e1a; --paño: #101726; --borde: #233048;
          --oro: #f2c14e; --oro2: #c99b2f; --celeste: #8fd6ff;
          --verde: #3ddc84; --rojo: #ff5d6c; --tiza: #eef3fb; --gris: #8b9bb4;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { color-scheme: dark; }
        body {
          background: var(--noche); color: var(--tiza);
          font-family: 'Barlow', system-ui, sans-serif; min-height: 100vh;
          background-image:
            radial-gradient(ellipse 70% 45% at 50% -5%, rgba(242,193,78,0.10), transparent),
            radial-gradient(ellipse 50% 35% at 85% 100%, rgba(143,214,255,0.05), transparent);
        }
        .wrap { max-width: 880px; margin: 0 auto; padding: 0 16px 90px; }
        .hero { text-align: center; padding: 36px 16px 18px; }
        .mark {
          font-family: 'Anton', sans-serif; font-size: clamp(2.3rem, 8vw, 4rem);
          text-transform: uppercase; line-height: 0.95;
          background: linear-gradient(180deg, #fff 0%, var(--oro) 60%, var(--oro2) 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          filter: drop-shadow(0 0 18px rgba(242,193,78,0.25));
        }
        .sub { margin-top: 8px; color: var(--gris); font-size: 0.8rem; letter-spacing: 0.16em; }
        .player-chip {
          display: inline-flex; gap: 10px; align-items: center; margin-top: 14px;
          background: var(--paño); border: 1px solid var(--oro2); border-radius: 999px;
          padding: 7px 16px; font-weight: 700; color: var(--oro);
        }
        .player-chip button { background: none; border: none; color: var(--gris); cursor: pointer; font-size: 0.75rem; text-decoration: underline; }
        .nav {
          display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;
          position: sticky; top: 0; padding: 12px 0; z-index: 20;
          background: linear-gradient(180deg, var(--noche) 78%, transparent);
        }
        .nav-btn {
          font-weight: 700; font-size: 0.82rem; letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--gris); background: var(--paño); border: 1px solid var(--borde);
          border-radius: 999px; padding: 9px 15px; cursor: pointer; font-family: inherit;
          transition: color .15s, border-color .15s, box-shadow .15s;
        }
        .nav-btn:hover { color: var(--tiza); }
        .nav-btn.on { color: #1a1404; background: linear-gradient(180deg, var(--oro), var(--oro2)); border-color: var(--oro); box-shadow: 0 0 16px rgba(242,193,78,0.35); }
        .h {
          font-family: 'Anton', sans-serif; font-size: 1.1rem; text-transform: uppercase;
          color: var(--oro); margin: 26px 0 12px; display: flex; align-items: center; gap: 10px;
        }
        .h::after { content: ''; flex: 1; height: 1px; background: var(--borde); }
        .card {
          background: var(--paño); border: 1px solid var(--borde); border-radius: 16px;
          padding: 16px; margin-bottom: 14px; position: relative;
        }
        .card.is-live { border-color: var(--rojo); box-shadow: 0 0 0 1px var(--rojo) inset, 0 0 22px rgba(255,93,108,0.15); }
        .card-top {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--gris); margin-bottom: 12px;
        }
        .tag { border-radius: 999px; padding: 3px 10px; font-weight: 800; font-size: 0.68rem; }
        .tag.live { background: rgba(255,93,108,0.15); color: var(--rojo); animation: pulse 1.5s infinite; }
        .tag.done { background: rgba(139,155,180,0.15); color: var(--gris); }
        .tag.time { background: rgba(242,193,78,0.12); color: var(--oro); }
        @keyframes pulse { 50% { opacity: 0.45; } }
        @media (prefers-reduced-motion: reduce) { .tag.live { animation: none; } }
        .teams { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
        .team { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .team.away { flex-direction: row-reverse; text-align: right; }
        .team img { width: 30px; height: 30px; object-fit: contain; }
        .team span { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .score { font-family: 'Anton', sans-serif; font-size: 1.8rem; min-width: 80px; text-align: center; font-variant-numeric: tabular-nums; }
        .score.vs { color: var(--gris); font-size: 1rem; letter-spacing: 0.2em; }
        .pot {
          margin-top: 12px; text-align: center; font-size: 0.85rem; color: var(--gris);
          background: rgba(242,193,78,0.07); border: 1px dashed var(--oro2); border-radius: 10px; padding: 7px;
        }
        .pot b { color: var(--oro); font-size: 1rem; }
        .bet-list { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }
        .bet-row {
          display: flex; gap: 10px; align-items: center; font-size: 0.85rem;
          background: var(--noche); border: 1px solid var(--borde); border-radius: 9px; padding: 7px 10px;
        }
        .bet-row .who { font-weight: 700; color: var(--celeste); min-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bet-row .what { flex: 1; color: var(--tiza); }
        .bet-row .amt { font-weight: 700; font-variant-numeric: tabular-nums; }
        .bet-row .pay { font-weight: 800; font-variant-numeric: tabular-nums; }
        .bet-row.won { border-color: var(--verde); }
        .bet-row.won .pay { color: var(--verde); }
        .bet-row.lost { opacity: 0.65; }
        .bet-row.lost .pay { color: var(--rojo); }
        .bet-row .x { background: none; border: none; color: var(--gris); cursor: pointer; font-size: 0.9rem; }
        .bet-row .x:hover { color: var(--rojo); }
        .cta {
          width: 100%; margin-top: 12px; padding: 12px;
          font-family: 'Anton', sans-serif; font-size: 1rem; letter-spacing: 0.08em;
          color: #1a1404; background: linear-gradient(180deg, var(--oro), var(--oro2));
          border: none; border-radius: 12px; cursor: pointer;
          box-shadow: 0 4px 0 #8a6a1d, 0 0 18px rgba(242,193,78,0.25);
          transition: transform .08s;
        }
        .cta:active { transform: translateY(2px); box-shadow: 0 2px 0 #8a6a1d; }
        .panel { margin-top: 12px; background: var(--noche); border: 1px solid var(--borde); border-radius: 12px; padding: 12px; }
        .type-switch { display: flex; gap: 6px; margin-bottom: 12px; }
        .type-switch button {
          flex: 1; padding: 9px; border-radius: 9px; border: 1px solid var(--borde);
          background: var(--paño); color: var(--gris); font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .type-switch button.on { color: var(--oro); border-color: var(--oro2); background: rgba(242,193,78,0.08); }
        .picks { display: flex; gap: 8px; }
        .pick {
          flex: 1; padding: 11px 6px; border-radius: 10px; border: 1px solid var(--borde);
          background: var(--paño); color: var(--tiza); font-weight: 800; font-size: 1rem; cursor: pointer; font-family: inherit;
        }
        .pick small { display: block; font-weight: 500; color: var(--gris); font-size: 0.68rem; margin-top: 2px; }
        .pick.sel { border-color: var(--celeste); color: var(--celeste); background: rgba(143,214,255,0.1); box-shadow: 0 0 12px rgba(143,214,255,0.18); }
        .score-input { display: flex; justify-content: center; align-items: center; gap: 14px; }
        .stepper { display: flex; align-items: center; gap: 10px; background: var(--paño); border: 1px solid var(--borde); border-radius: 10px; padding: 6px 10px; }
        .stepper b { font-family: 'Anton', sans-serif; font-size: 1.5rem; min-width: 30px; text-align: center; }
        .stepper button { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--borde); background: var(--noche); color: var(--tiza); font-size: 1.1rem; cursor: pointer; }
        .dash { font-family: 'Anton', sans-serif; font-size: 1.4rem; color: var(--gris); }
        .chips { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }
        .chip {
          padding: 8px 13px; border-radius: 999px; cursor: pointer; font-weight: 800; font-size: 0.8rem; font-family: inherit;
          color: var(--oro); background: var(--paño); border: 2px dashed var(--oro2);
        }
        .chip:hover { background: rgba(242,193,78,0.1); }
        .chip.clear { color: var(--gris); border-color: var(--borde); }
        .amount-row { display: flex; gap: 8px; margin-top: 10px; }
        .amount-row input {
          flex: 1; background: var(--paño); border: 1px solid var(--borde); border-radius: 10px;
          color: var(--tiza); padding: 11px; font-size: 1rem; font-family: inherit; font-variant-numeric: tabular-nums;
        }
        .gold {
          padding: 11px 18px; border: none; border-radius: 10px; cursor: pointer;
          font-weight: 800; font-family: inherit; color: #1a1404; letter-spacing: 0.03em;
          background: linear-gradient(180deg, var(--oro), var(--oro2));
        }
        .gold:disabled { opacity: 0.6; cursor: wait; }
        .gold.big { width: 100%; padding: 13px; font-size: 1rem; margin-top: 12px; }
        .ghost { display: block; margin: 10px auto 0; background: none; border: none; color: var(--gris); cursor: pointer; font-size: 0.8rem; text-decoration: underline; font-family: inherit; }
        .note { margin-top: 8px; font-size: 0.85rem; color: var(--rojo); font-weight: 600; }
        .note.ok { color: var(--verde); }
        .locked { margin-top: 10px; text-align: center; color: var(--gris); font-size: 0.82rem; }
        .board { background: var(--paño); border: 1px solid var(--borde); border-radius: 16px; padding: 8px; overflow-x: auto; }
        .board-row {
          display: grid; grid-template-columns: 36px 1.4fr 0.6fr 0.6fr 1fr 1fr 1fr;
          gap: 8px; align-items: center; padding: 10px 8px; font-size: 0.88rem;
          border-bottom: 1px solid var(--borde); font-variant-numeric: tabular-nums; min-width: 560px;
        }
        .board-row:last-of-type { border-bottom: none; }
        .board-row.head { color: var(--gris); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; }
        .board-row.me { background: rgba(242,193,78,0.06); border-radius: 10px; }
        .board-row .name { font-weight: 700; color: var(--celeste); }
        .board-row .pos { text-align: center; }
        .net.up { color: var(--verde); font-weight: 800; }
        .net.down { color: var(--rojo); font-weight: 800; }
        .warn {
          background: rgba(242,193,78,0.1); border: 1px solid rgba(242,193,78,0.4);
          color: var(--oro); border-radius: 12px; padding: 13px; font-size: 0.9rem; margin: 14px 0;
        }
        .empty { color: var(--gris); text-align: center; padding: 36px 16px; }
        .hint { color: var(--gris); font-size: 0.82rem; margin-top: 12px; line-height: 1.5; padding: 0 8px 8px; }
        .ai-box { background: var(--paño); border: 1px solid var(--borde); border-radius: 16px; padding: 16px; }
        .ai-form { display: flex; gap: 8px; }
        .ai-form input { flex: 1; background: var(--noche); border: 1px solid var(--borde); border-radius: 10px; color: var(--tiza); padding: 12px; font-family: inherit; font-size: 0.95rem; }
        .ai-answer { white-space: pre-wrap; line-height: 1.6; margin-top: 14px; border-top: 1px solid var(--borde); padding-top: 14px; font-size: 0.95rem; }
        .gate {
          position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
          background: rgba(6,9,17,0.92); backdrop-filter: blur(6px); padding: 16px;
        }
        .gate-card {
          width: 100%; max-width: 400px; text-align: center;
          background: var(--paño); border: 1px solid var(--oro2); border-radius: 20px; padding: 32px 24px;
          box-shadow: 0 0 50px rgba(242,193,78,0.15);
        }
        .gate-mark {
          font-family: 'Anton', sans-serif; font-size: 1.9rem; text-transform: uppercase;
          background: linear-gradient(180deg, #fff, var(--oro)); -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .gate-sub { color: var(--gris); font-size: 0.68rem; letter-spacing: 0.18em; margin-top: 6px; }
        .gate-q { margin-top: 22px; font-weight: 600; }
        .gate-card input {
          width: 100%; margin-top: 10px; padding: 13px; text-align: center; font-size: 1.05rem; font-weight: 700;
          background: var(--noche); border: 1px solid var(--borde); border-radius: 12px; color: var(--tiza); font-family: inherit;
        }
        .gate-card input:focus-visible { outline: 2px solid var(--oro); }
        .gate-note { color: var(--gris); font-size: 0.75rem; margin-top: 14px; line-height: 1.5; }
        input:focus-visible, button:focus-visible { outline: 2px solid var(--oro); outline-offset: 2px; }
      `}</style>
    </>
  );
}
