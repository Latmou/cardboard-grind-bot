import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/database.sqlite';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rank INTEGER,
    rankScore INTEGER,
    league TEXT,
    leagueNumber INTEGER,
    clubTag TEXT,
    timestamp INTEGER NOT NULL,
    season TEXT
  )
`);

// Add season column if it doesn't exist (for migration)
try {
  db.exec('ALTER TABLE scores ADD COLUMN season TEXT');
} catch (e) {
  // Column already exists or table is new
}

// Create index for faster searching
db.exec(`CREATE INDEX IF NOT EXISTS idx_name_timestamp_season ON scores (name, timestamp, season)`);

export default db;

export interface ScoreRow {
  name: string;
  rank: number;
  rankScore: number;
  league: string;
  leagueNumber: number;
  clubTag: string;
  timestamp: number;
  season?: string;
}

const CURRENT_SEASON = process.env.THE_FINALS_SEASON || 's4';

export function saveScores(scores: ScoreRow[]) {
  const insert = db.prepare(`
    INSERT INTO scores (name, rank, rankScore, league, leagueNumber, clubTag, timestamp, season)
    VALUES (@name, @rank, @rankScore, @league, @leagueNumber, @clubTag, @timestamp, @season)
  `);

  const insertMany = db.transaction((rows: ScoreRow[]) => {
    for (const row of rows) {
      if (!row.season) row.season = CURRENT_SEASON;
      insert.run(row);
    }
  });

  insertMany(scores);
}

export function getPlayerScores(name: string, days: number) {
  const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  return db.prepare(`
    SELECT * FROM scores 
    WHERE name LIKE ? AND timestamp >= ? AND season = ?
    ORDER BY timestamp ASC
  `).all(`%${name}%`, cutoff, CURRENT_SEASON) as ScoreRow[];
}

export function getTopPlayers(limit: number = 50) {
  const latestTimestamp = db.prepare('SELECT MAX(timestamp) as maxTs FROM scores WHERE season = ?').get(CURRENT_SEASON) as { maxTs: number };
  if (!latestTimestamp || !latestTimestamp.maxTs) return [];

  return db.prepare(`
    SELECT * FROM scores 
    WHERE timestamp = ? AND season = ?
    ORDER BY rank ASC 
    LIMIT ?
  `).all(latestTimestamp.maxTs, CURRENT_SEASON, limit) as ScoreRow[];
}

export function getPlayersByNames(names: string[], daysAgo: number = 0) {
  let targetTimestamp: number;
  if (daysAgo === 0) {
    const latest = db.prepare('SELECT MAX(timestamp) as maxTs FROM scores WHERE season = ?').get(CURRENT_SEASON) as { maxTs: number };
    if (!latest || !latest.maxTs) return [];
    targetTimestamp = latest.maxTs;
  } else {
    const cutoff = Math.floor(Date.now() / 1000) - (daysAgo * 24 * 60 * 60);
    const ts = db.prepare('SELECT timestamp FROM scores WHERE timestamp <= ? AND season = ? ORDER BY timestamp DESC LIMIT 1').get(cutoff, CURRENT_SEASON) as { timestamp: number } | undefined;
    if (!ts) return [];
    targetTimestamp = ts.timestamp;
  }

  const placeholders = names.map(() => '?').join(',');
  return db.prepare(`
    SELECT * FROM scores 
    WHERE timestamp = ? AND name IN (${placeholders}) AND season = ?
    ORDER BY rank ASC
  `).all(targetTimestamp, ...names, CURRENT_SEASON) as ScoreRow[];
}

export function getLeaderboardAroundPlayer(name: string, limit: number = 50) {
  const latestTimestamp = db.prepare('SELECT MAX(timestamp) as maxTs FROM scores WHERE season = ?').get(CURRENT_SEASON) as { maxTs: number };
  if (!latestTimestamp || !latestTimestamp.maxTs) return [];

  const player = db.prepare(`
    SELECT rank FROM scores 
    WHERE name = ? AND timestamp = ? AND season = ?
  `).get(name, latestTimestamp.maxTs, CURRENT_SEASON) as { rank: number } | undefined;

  if (!player) return [];

  const offset = Math.max(1, player.rank - Math.floor(limit / 2));
  
  return db.prepare(`
    SELECT * FROM scores 
    WHERE timestamp = ? AND season = ?
    ORDER BY rank ASC 
    LIMIT ? OFFSET ?
  `).all(latestTimestamp.maxTs, CURRENT_SEASON, limit, offset - 1) as ScoreRow[];
}
