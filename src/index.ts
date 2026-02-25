import { startBot } from './bot';
import { startCron } from './cron';
import { registerCommands } from './register-commands';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Starting Cardboard Grind Bot...');
  
  // Register commands if needed (optional, can be done via separate script or here)
  await registerCommands();
  
  // Start the cron job
  await startCron();
  
  // Start the Discord bot
  startBot();
}

main().catch(console.error);
