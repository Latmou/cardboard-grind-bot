import { startBot } from './bot';
import { startCron } from './cron';
import { registerCommands } from './register-commands';
import { initDb } from './db';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Starting Cardboard Grind Bot...');
  
  // Initialize database
  await initDb();
  
  // Register commands if needed (optional, can be done via separate script or here)
  await registerCommands();
  
  // Start the cron job
  await startCron();
  
  // Start the Discord bot
  startBot();
}

main().catch(console.error);
