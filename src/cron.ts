import axios from 'axios';
import cron from 'node-cron';
import { saveScores, ScoreRow, deleteOldScores, getLastTimestamp } from './db';
import dotenv from 'dotenv';

dotenv.config();

const SEASON = process.env.THE_FINALS_SEASON || 's4';
const API_URL = `https://api.the-finals-leaderboard.com/v1/leaderboard/${SEASON}/crossplay`;

export async function startCron() {
  console.log(`Cron started: fetching scores every 45 minutes for season ${SEASON}`);
  
  const fetchAndSave = async () => {
    try {
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
        await deleteOldScores(3); // Delete data older than 3 months
        console.log(`[${new Date().toISOString()}] Successfully saved ${scores.length} scores and cleaned old data.`);
      } else {
        console.error('Invalid API response format');
      }
    } catch (error: any) {
      console.error(`Error fetching scores: ${error.message}`);
    }
  };

  // Run immediately on start if data is older than 45 minutes
  const lastTs = await getLastTimestamp();
  const fortyFiveMinutesAgo = Math.floor(Date.now() / 1000) - (45 * 60);
  
  if (lastTs < fortyFiveMinutesAgo) {
    console.log(`[${new Date().toISOString()}] Last update was more than 45 minutes ago (or no data), running initial fetch...`);
    await fetchAndSave();
  } else {
    console.log(`[${new Date().toISOString()}] Recent data found (less than 45 minutes old), skipping initial fetch.`);
  }

  // Run every 45 minutes
  cron.schedule('*/45 * * * *', fetchAndSave);
}
