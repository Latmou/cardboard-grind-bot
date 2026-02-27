import { startBot } from './bot';
import { startCron } from './cron';
import { registerCommands } from './register-commands';
import { initDb } from './db';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Starting Cardboard Grind Bot...');
  
  try {
    // Initialize database
    await initDb();
    console.log('Database initialized.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Continue anyway, bot might still work for some things or we want it online to show it's "alive"
  }
  
  try {
    // Register commands if needed
    await registerCommands();
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
  
  // Start the Discord bot
  try {
    const client = await startBot();
    
    try {
      // Start the cron job with the bot client
      await startCron(client);
    } catch (error) {
      console.error('Failed to start cron job:', error);
    }
  } catch (error) {
    console.error('Failed to start Discord bot:', error);
    process.exit(1);
  }
}

main().catch(console.error);
