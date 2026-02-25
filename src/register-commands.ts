import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('rs')
    .setDescription('Displays a player\'s rank score chart')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Player name (e.g., Mozzy#3563)')
        .setRequired(true)
        .setMinLength(3))
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to display (default: 14)')
        .setRequired(false))
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Displays a player\'s rank position chart')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Player name (e.g., Mozzy#3563)')
        .setRequired(true)
        .setMinLength(3))
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to display (default: 14)')
        .setRequired(false))
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Displays the top players leaderboard')
    .addBooleanOption(option =>
      option.setName('guild')
        .setDescription('Only show players from this Discord server')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Center the leaderboard around this player')
        .setRequired(false))
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays help information and available commands')
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1]),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

export async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log('Successfully reloaded application (/) commands for guild.');
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('Successfully reloaded application (/) commands globally.');
    }
  } catch (error) {
    console.error(error);
  }
}

if (require.main === module) {
  registerCommands();
}
