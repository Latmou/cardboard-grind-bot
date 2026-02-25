import axios from 'axios';
import cron from 'node-cron';
import { saveScores, ScoreRow } from './db';
import dotenv from 'dotenv';

dotenv.config();

const SEASON = process.env.THE_FINALS_SEASON || 's4';
const API_URL = `https://api.the-finals-leaderboard.com/v1/leaderboard/${SEASON}/crossplay`;

export async function startCron() {
  console.log(`Cron started: fetching scores every 10 minutes for season ${SEASON}`);
  
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

        saveScores(scores);
        console.log(`[${new Date().toISOString()}] Successfully saved ${scores.length} scores.`);
      } else {
        console.error('Invalid API response format');
      }
    } catch (error: any) {
      console.error(`Error fetching scores: ${error.message}`);
    }
  };

  // Run immediately on start
  await fetchAndSave();

  // Run every 10 minutes
  cron.schedule('*/10 * * * *', fetchAndSave);
}
