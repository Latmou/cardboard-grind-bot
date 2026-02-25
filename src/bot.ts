import { Client, Events, GatewayIntentBits, AttachmentBuilder, ChatInputCommandInteraction, ActivityType } from 'discord.js';
import { getPlayerScores, getTopPlayers, getPlayersByNames, getLeaderboardAroundPlayer, getLastTimestamp, ScoreRow } from './db';
import { generateRankChart } from './chart';
import { Taunt } from './taunt';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN!;

export function startBot() {
  const client = new Client({ 
    intents: [
      GatewayIntentBits.Guilds, 
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences
    ],
    presence: {
      status: 'online',
      activities: [{
        name: 'The Finals Leaderboard',
        type: ActivityType.Watching
      }]
    }
  });

  client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    console.log(`Presence: ${c.user.presence?.status}`);
    console.log(`Guilds: ${c.guilds.cache.size}`);
    
    // Explicitly set presence again after ready, just in case
    c.user.setPresence({
      status: 'online',
      activities: [{
        name: 'The Finals Leaderboard',
        type: ActivityType.Watching
      }]
    });
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`[${new Date().toISOString()}] Command /${interaction.commandName} used by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild?.name || 'DM'}`);

    if (interaction.commandName === 'rs' || interaction.commandName === 'rank') {
      await handleChartCommand(interaction);
    } else if (interaction.commandName === 'leaderboard') {
      await handleLeaderboardCommand(interaction);
    } else if (interaction.commandName === 'help') {
      await handleHelpCommand(interaction);
    }
  });

  client.login(token);
}

function getBestMatch(search: string, names: string[]): string {
  const searchLower = search.toLowerCase();
  
  // 1. Exact match
  const exactMatch = names.find(n => n.toLowerCase() === searchLower);
  if (exactMatch) return exactMatch;
  
  // 2. Exact match without tag
  const exactNoTagMatch = names.find(n => n.split('#')[0].toLowerCase() === searchLower);
  if (exactNoTagMatch) return exactNoTagMatch;
  
  // 3. Starts with search
  const startsWith = names.find(n => n.toLowerCase().startsWith(searchLower));
  if (startsWith) return startsWith;

  // 4. Starts with search without tag
  const startsWithNoTag = names.find(n => n.split('#')[0].toLowerCase().startsWith(searchLower));
  if (startsWithNoTag) return startsWithNoTag;
  
  // 5. Default to first one
  return names[0];
}

async function handleChartCommand(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const days = interaction.options.getInteger('days') || 14;
  const mode = interaction.commandName === 'rank' ? 'rank' : 'rankScore';

  if (name.length < 3) {
    await interaction.reply({ content: 'Please provide at least 3 characters for the name search.', ephemeral: true });
    return;
  }

  console.log(`[${new Date().toISOString()}] Parameters: name=${name}, days=${days}, mode=${mode}`);

  await interaction.deferReply();

  try {
    let scores = await getPlayerScores(name, days);

    if (scores.length === 0) {
      await interaction.editReply(`No scores found for player (or partial search) **${name}** over the last **${days}** days.`);
      return;
    }

    const uniqueNames = Array.from(new Set(scores.map(s => s.name)));
    const actualName = getBestMatch(name, uniqueNames);
    
    // Filter scores to only include the selected player
    scores = scores.filter(s => s.name === actualName);

    const chartBuffer = await generateRankChart(actualName, scores, days, mode);
    const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

    const typeLabel = mode === 'rank' ? 'rank position' : 'score';

    const isSelf = interaction.user.username.toLowerCase().includes(actualName.split('#')[0].toLowerCase());
    const taunt = Taunt.getChartTaunt({
      actualName,
      isSelf,
      scores,
      days,
      mode
    });

    console.log(`[${new Date().toISOString()}] Selected Chart Taunt for ${actualName}: "${taunt}"`);

    const lastUpdateTs = await getLastTimestamp();
    const lastUpdateDate = new Date(lastUpdateTs * 1000).toLocaleString();
    const footer = `\n*Last data update: ${lastUpdateDate}*`;

    await interaction.editReply({
      content: taunt + footer,
      files: [attachment]
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply('An error occurred while generating the chart.');
  }
}

async function handleLeaderboardCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const guildOption = interaction.options.getBoolean('guild');
    const nameOption = interaction.options.getString('name');

    let players: ScoreRow[] = [];

    if (guildOption) {
      if (!interaction.guild) {
        await interaction.editReply('The `guild` option can only be used within a Discord server (guild).');
        return;
      }
      // Get all members of the guild
      // Note: This requires GuildMembers intent and might be slow for large guilds
      const members = await interaction.guild.members.fetch();
      const memberNames = members.map(m => m.user.username);
      players = await getPlayersByNames(memberNames);
      // Limit to top 50
      players = players.slice(0, 50);
    } else if (nameOption) {
      // First, try to find the exact name or partial matches
      const initialScores = await getPlayerScores(nameOption, 1);
      const uniqueNames = Array.from(new Set(initialScores.map(s => s.name)));

      if (uniqueNames.length === 0) {
        await interaction.editReply(`No player found matching **${nameOption}**.`);
        return;
      }

      const actualName = getBestMatch(nameOption, uniqueNames);
      players = await getLeaderboardAroundPlayer(actualName, 50);
    } else {
      players = await getTopPlayers(50);
    }

    if (players.length === 0) {
      await interaction.editReply('No players found for the requested leaderboard.');
      return;
    }

    let previousPlayers: ScoreRow[] = [];
    if (guildOption) {
      const members = await interaction.guild!.members.fetch();
      const memberNames = members.map(m => m.user.username);
      previousPlayers = await getPlayersByNames(memberNames, 1); // 1 day ago
    }

    const isTop = players[0].rank === 1;
    const isInList = players.some(p => interaction.user.username.toLowerCase().includes(p.name.split('#')[0].toLowerCase()));
    const taunt = Taunt.getLeaderboardTaunt({
      isInList,
      isTop,
      isGuild: !!guildOption,
      topPlayers: players,
      previousTopPlayers: previousPlayers
    });

    console.log(`[${new Date().toISOString()}] Selected Leaderboard Taunt: "${taunt}"`);

    const lastUpdateTs = await getLastTimestamp();
    const lastUpdateDate = new Date(lastUpdateTs * 1000).toLocaleString();
    const footer = `\n*Last data update: ${lastUpdateDate}*`;

    let response = `${taunt}\n\`\`\`\n`;
    response += `Rank | Name${' '.repeat(20)} | Score\n`;
    response += `-`.repeat(40) + `\n`;

    for (const p of players) {
      const rankStr = p.rank.toString().padStart(4, ' ');
      const nameStr = p.name.padEnd(24, ' ');
      const scoreStr = p.rankScore.toLocaleString().padStart(8, ' ');
      let line = '';
      if (nameOption && p.name.toLowerCase().trim().includes(nameOption.toLowerCase())) {
        line = '>';
      }
      line += `${rankStr} | ${nameStr} | ${scoreStr}\n`;
      
      if (response.length + line.length + 4 > 2000) {
        response += `...\n`;
        break;
      }
      response += line;
    }
    response += `\`\`\``;
    response += footer;
    
    await interaction.editReply(response);
  } catch (error) {
    console.error(error);
    await interaction.editReply('An error occurred while fetching the leaderboard.');
  }
}

async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
  const helpMessage = `
**Cardboard Grind Bot - The Finals Leaderboard Bot**
This bot fetches and visualizes leaderboard data for "The Finals".

**Available Commands:**
• \`/rs [name] [days]\`: Displays a player's **rank score** (RS) chart over the last X days.
• \`/rank [name] [days]\`: Displays a player's **rank position** chart over the last X days.
• \`/leaderboard\`: Displays the current top 50 players globally.
• \`/leaderboard guild:true\`: Displays a leaderboard for members of this Discord server.
• \`/leaderboard name:[player]\`: Displays the leaderboard centered around a specific player.
• \`/help\`: Displays this help message.

*Note: Use at least 3 characters for player name searches.*
  `;
  await interaction.reply({ content: helpMessage, ephemeral: true });
}
