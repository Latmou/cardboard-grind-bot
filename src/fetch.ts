import { initDb } from './db';
import { startCron } from './cron';
import axios from 'axios';
import { saveScores, ScoreRow, deleteOldScores } from './db';
import dotenv from 'dotenv';

dotenv.config();

const SEASON = process.env.THE_FINALS_SEASON || 's4';
const API_URL = `https://api.the-finals-leaderboard.com/v1/leaderboard/${SEASON}/crossplay`;

async function forceFetch() {
  console.log('Force fetching scores from API...');
  
  try {
    await initDb();
    
    console.log(`[${new Date().toISOString()}] Fetching scores from API...`);
    const response = await axios.get(API_URL);
    
    if (response.data && Array.isArray(response.data.data)) {
      const timestamp = Math.floor(Date.now() / 1000);
      const scores: ScoreRow[] = response.data.data.map((player: any) => ({
        name: player.name,
        rank: player.rank,
        rankScore: player.rankScore,
        league: player.league,
        leagueNumber: player.leagueNumber,
        clubTag: player.clubTag,
        timestamp: timestamp,
        season: SEASON
      }));

      await saveScores(scores);
      await deleteOldScores(3);
      console.log(`[${new Date().toISOString()}] Successfully saved ${scores.length} scores and cleaned old data.`);
      process.exit(0);
    } else {
      console.error('Invalid API response format');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error fetching scores: ${error.message}`);
    process.exit(1);
  }
}

forceFetch();
