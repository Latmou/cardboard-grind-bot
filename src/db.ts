import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://botuser:botpassword@db:5432/finalsdb',
});

// Initialize database
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
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

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_name_timestamp_season ON scores (name, timestamp, season)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      discord_id TEXT PRIMARY KEY,
      embark_id TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_roles (
      guild_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, role_name)
    )
  `);
}

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

export async function saveScores(scores: ScoreRow[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = `
      INSERT INTO scores (name, rank, rankScore, league, leagueNumber, clubTag, timestamp, season)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    for (const row of scores) {
      const season = row.season || CURRENT_SEASON;
      await client.query(query, [
        row.name,
        row.rank,
        row.rankScore,
        row.league,
        row.leagueNumber,
        row.clubTag,
        row.timestamp,
        season
      ]);
    }
    await client.query('COMMIT');
    console.log(`[${new Date().toISOString()}] Successfully saved ${scores.length} scores to Postgres.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteOldScores(months: number = 3) {
  const cutoff = Math.floor(Date.now() / 1000) - (months * 30 * 24 * 60 * 60);
  const result = await pool.query('DELETE FROM scores WHERE timestamp < $1', [cutoff]);
  if (result.rowCount && result.rowCount > 0) {
    console.log(`[${new Date().toISOString()}] Deleted ${result.rowCount} scores older than ${months} months.`);
  }
  return result.rowCount;
}

export async function getLastTimestamp(): Promise<number> {
  const result = await pool.query('SELECT MAX(timestamp) as max_ts FROM scores');
  return parseInt(result.rows[0]?.max_ts || '0');
}

export async function getPlayerScores(name: string, hours: number): Promise<ScoreRow[]> {
  const cutoff = Math.floor(Date.now() / 1000) - (hours * 60 * 60);
  const result = await pool.query(`
    SELECT * FROM scores 
    WHERE name ILIKE $1 AND timestamp >= $2 AND season = $3
    ORDER BY timestamp ASC
  `, [`%${name}%`, cutoff, CURRENT_SEASON]);
  
  return result.rows.map(row => ({
    name: row.name,
    rank: row.rank,
    rankScore: row.rankscore,
    league: row.league,
    leagueNumber: row.leaguenumber,
    clubTag: row.clubtag,
    timestamp: row.timestamp,
    season: row.season
  }));
}

export async function getTopPlayers(limit: number = 30): Promise<ScoreRow[]> {
  const latestRes = await pool.query('SELECT MAX(timestamp) as max_ts FROM scores WHERE season = $1', [CURRENT_SEASON]);
  const latestTimestamp = latestRes.rows[0]?.max_ts;
  if (!latestTimestamp) return [];

  const result = await pool.query(`
    SELECT * FROM scores 
    WHERE timestamp = $1 AND season = $2
    ORDER BY rank ASC 
    LIMIT $3
  `, [latestTimestamp, CURRENT_SEASON, limit]);

  return result.rows.map(row => ({
    name: row.name,
    rank: row.rank,
    rankScore: row.rankscore,
    league: row.league,
    leagueNumber: row.leaguenumber,
    clubTag: row.clubtag,
    timestamp: row.timestamp,
    season: row.season
  }));
}

export async function getPlayersByNames(names: string[], daysAgo: number = 0): Promise<ScoreRow[]> {
  let targetTimestamp: number;
  if (daysAgo === 0) {
    const latest = await pool.query('SELECT MAX(timestamp) as max_ts FROM scores WHERE season = $1', [CURRENT_SEASON]);
    if (!latest.rows[0]?.max_ts) return [];
    targetTimestamp = latest.rows[0].max_ts;
  } else {
    const cutoff = Math.floor(Date.now() / 1000) - (daysAgo * 24 * 60 * 60);
    const tsRes = await pool.query('SELECT timestamp FROM scores WHERE timestamp <= $1 AND season = $2 ORDER BY timestamp DESC LIMIT 1', [cutoff, CURRENT_SEASON]);
    if (tsRes.rows.length === 0) return [];
    targetTimestamp = tsRes.rows[0].timestamp;
  }

  const result = await pool.query(`
    SELECT * FROM scores 
    WHERE timestamp = $1 AND name = ANY($2) AND season = $3
    ORDER BY rank ASC
  `, [targetTimestamp, names, CURRENT_SEASON]);

  return result.rows.map(row => ({
    name: row.name,
    rank: row.rank,
    rankScore: row.rankscore,
    league: row.league,
    leagueNumber: row.leaguenumber,
    clubTag: row.clubtag,
    timestamp: row.timestamp,
    season: row.season
  }));
}

export async function getLeaderboardAroundPlayer(name: string, limit: number = 30): Promise<ScoreRow[]> {
  const latestRes = await pool.query('SELECT MAX(timestamp) as max_ts FROM scores WHERE season = $1', [CURRENT_SEASON]);
  const latestTimestamp = latestRes.rows[0]?.max_ts;
  if (!latestTimestamp) return [];

  const playerRes = await pool.query(`
    SELECT rank FROM scores 
    WHERE name = $1 AND timestamp = $2 AND season = $3
  `, [name, latestTimestamp, CURRENT_SEASON]);

  if (playerRes.rows.length === 0) return [];
  const playerRank = playerRes.rows[0].rank;

  const offset = Math.max(0, playerRank - Math.floor(limit / 2) - 1);
  
  const result = await pool.query(`
    SELECT * FROM scores 
    WHERE timestamp = $1 AND season = $2
    ORDER BY rank ASC 
    LIMIT $3 OFFSET $4
  `, [latestTimestamp, CURRENT_SEASON, limit, offset]);

  return result.rows.map(row => ({
    name: row.name,
    rank: row.rank,
    rankScore: row.rankscore,
    league: row.league,
    leagueNumber: row.leaguenumber,
    clubTag: row.clubtag,
    timestamp: row.timestamp,
    season: row.season
  }));
}

export async function registerUser(discordId: string, embarkId: string): Promise<void> {
  await pool.query(`
    INSERT INTO users (discord_id, embark_id)
    VALUES ($1, $2)
    ON CONFLICT (discord_id) DO UPDATE SET embark_id = $2
  `, [discordId, embarkId]);
}

export async function getRegisteredUsers(discordIds: string[]): Promise<{ discord_id: string, embark_id: string }[]> {
  const result = await pool.query(`
    SELECT discord_id, embark_id FROM users
    WHERE discord_id = ANY($1)
  `, [discordIds]);
  return result.rows;
}

export async function getAllRegisteredUsers(): Promise<{ discord_id: string, embark_id: string }[]> {
  const result = await pool.query(`
    SELECT discord_id, embark_id FROM users
  `);
  return result.rows;
}

export async function getRegisteredUser(discordId: string): Promise<string | null> {
  const result = await pool.query(`
    SELECT embark_id FROM users
    WHERE discord_id = $1
  `, [discordId]);
  return result.rows.length > 0 ? result.rows[0].embark_id : null;
}

export async function getDiscordIdByEmbarkId(embarkId: string): Promise<string | null> {
  const result = await pool.query(`
    SELECT discord_id FROM users
    WHERE embark_id = $1
  `, [embarkId]);
  return result.rows.length > 0 ? result.rows[0].discord_id : null;
}

export async function getLatestScoresForRegisteredUsers(): Promise<{ discord_id: string, embark_id: string, score: ScoreRow }[]> {
  const latestTimestamp = await getLastTimestamp();
  if (!latestTimestamp) return [];

  const result = await pool.query(`
    SELECT u.discord_id, u.embark_id, s.*
    FROM users u
    JOIN scores s ON u.embark_id = s.name
    WHERE s.timestamp = $1 AND s.season = $2
  `, [latestTimestamp, CURRENT_SEASON]);

  return result.rows.map(row => ({
    discord_id: row.discord_id,
    embark_id: row.embark_id,
    score: {
      name: row.name,
      rank: row.rank,
      rankScore: row.rankscore,
      league: row.league,
      leagueNumber: row.leaguenumber,
      clubTag: row.clubtag,
      timestamp: row.timestamp,
      season: row.season
    }
  }));
}

export async function getLatestScoreForUser(embarkId: string): Promise<ScoreRow | null> {
  const latestTimestamp = await getLastTimestamp();
  if (!latestTimestamp) return null;

  const result = await pool.query(`
    SELECT * FROM scores 
    WHERE name = $1 AND timestamp = $2 AND season = $3
  `, [embarkId, latestTimestamp, CURRENT_SEASON]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    name: row.name,
    rank: row.rank,
    rankScore: row.rankscore,
    league: row.league,
    leagueNumber: row.leaguenumber,
    clubTag: row.clubtag,
    timestamp: row.timestamp,
    season: row.season
  };
}

export async function getStoredRoleId(guildId: string, roleName: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT role_id FROM guild_roles WHERE guild_id = $1 AND role_name = $2',
    [guildId, roleName]
  );
  return result.rows[0]?.role_id || null;
}

export async function saveStoredRoleId(guildId: string, roleName: string, roleId: string) {
  await pool.query(`
    INSERT INTO guild_roles (guild_id, role_name, role_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id, role_name) DO UPDATE SET role_id = $3
  `, [guildId, roleName, roleId]);
}

export default pool;
