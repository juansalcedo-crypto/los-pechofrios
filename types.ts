export type Winner = 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;

export interface Team {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  stage: string;
  group: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: Winner;
    fullTime: { home: number | null; away: number | null };
  };
}

export interface StandingRow {
  position: number;
  team: Team;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface GroupStanding {
  group: string;
  table: StandingRow[];
}

export type Pick = 'HOME' | 'DRAW' | 'AWAY';

export interface Bet {
  matchId: number;
  pick: Pick;
  placedAt: string;
}
