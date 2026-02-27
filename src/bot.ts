import { Client, Events, GatewayIntentBits, AttachmentBuilder, ChatInputCommandInteraction, ActivityType, MessageFlags } from 'discord.js';
import { getPlayerScores, getTopPlayers, getPlayersByNames, getLeaderboardAroundPlayer, getLastTimestamp, ScoreRow, registerUser, getRegisteredUsers, getRegisteredUser, getAllRegisteredUsers, getDiscordIdByEmbarkId } from './db';
import { generateRankChart } from './chart';
import { Taunt } from './taunt';
import { syncSingleUserRoles } from './roles';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN!;

export function startBot(): Promise<Client> {
  return new Promise((resolve, reject) => {
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
      resolve(client);
    });

    client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
      reject(error);
    });

    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;

      console.log(`[${new Date().toISOString()}] Command /${interaction.commandName} used by ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild?.name || 'DM'}`);

      if (interaction.commandName === 'rs' || interaction.commandName === 'rank') {
        await handleChartCommand(interaction);
      } else if (interaction.commandName === 'leaderboard') {
        await handleLeaderboardCommand(interaction);
      } else if (interaction.commandName === 'register') {
        await handleRegisterCommand(interaction);
      } else if (interaction.commandName === 'help') {
        await handleHelpCommand(interaction);
      }
    });

    async function handleRegisterCommand(interaction: ChatInputCommandInteraction) {
      const embarkId = interaction.options.getString('embark_id', true);
      const discordId = interaction.user.id;

      try {
        const existingUser = await getDiscordIdByEmbarkId(embarkId);
        if (existingUser && existingUser !== discordId) {
          await interaction.reply({ 
            content: `Embark ID **${embarkId}** is already registered to user <@${existingUser}>.`, 
            flags: [MessageFlags.Ephemeral] 
          });
          return;
        }

        await registerUser(discordId, embarkId);
        
        let nicknameStatus = '';
        if (interaction.guild && interaction.member) {
          try {
            // Attempt to change the user's nickname to their Embark ID
            const member = await interaction.guild.members.fetch(discordId);
            await member.setNickname(embarkId);
            nicknameStatus = ' and updated your nickname';
          } catch (error) {
            console.error(`Failed to update nickname for user ${discordId}:`, error);
            nicknameStatus = ' (could not update nickname, please check bot permissions)';
          }

          try {
            // Also sync roles upon registration
            await syncSingleUserRoles(interaction.guild, discordId, embarkId);
          } catch (error) {
            console.error(`Failed to sync roles for user ${discordId}:`, error);
          }
        }

        await interaction.reply({ 
          content: `Successfully registered your Embark ID as **${embarkId}**${nicknameStatus}. Your rank role will also be updated.`, 
          flags: [MessageFlags.Ephemeral] 
        });
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'An error occurred while registering your Embark ID.', flags: [MessageFlags.Ephemeral] });
      }
    }

    client.login(token).catch(reject);
  });
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
  let name = interaction.options.getString('name');
  const days = interaction.options.getInteger('days');
  const hours = interaction.options.getInteger('hours');
  const mode = interaction.commandName === 'rank' ? 'rank' : 'rankScore';

  // Calculate total duration in hours. Default to 14 days if neither is provided.
  let totalHours = 0;
  if (days !== null) totalHours += days * 24;
  if (hours !== null) totalHours += hours;
  if (totalHours === 0) totalHours = 14 * 24;

  if (!name) {
    name = await getRegisteredUser(interaction.user.id);
    if (!name) {
      await interaction.reply({ 
        content: 'You haven\'t provided a player name and you are not registered. Use `/register [embark_id]` to register your Embark ID or provide a name with this command.', 
        flags: [MessageFlags.Ephemeral] 
      });
      return;
    }
  }

  if (name.length < 3) {
    await interaction.reply({ content: 'Please provide at least 3 characters for the name search.', flags: [MessageFlags.Ephemeral] });
    return;
  }

  console.log(`[${new Date().toISOString()}] Parameters: name=${name}, totalHours=${totalHours}, mode=${mode}`);

  await interaction.deferReply();

  try {
    let scores = await getPlayerScores(name, totalHours);

    if (scores.length === 0) {
      await interaction.editReply(`No scores found for player (or partial search) **${name}** over the last **${totalHours}** hours.`);
      return;
    }

    const uniqueNames = Array.from(new Set(scores.map(s => s.name)));
    const actualName = getBestMatch(name, uniqueNames);
    
    // Filter scores to only include the selected player
    scores = scores.filter(s => s.name === actualName);

    const chartBuffer = await generateRankChart(actualName, scores, totalHours, mode);
    const attachment = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

    const typeLabel = mode === 'rank' ? 'rank position' : 'score';

    const isSelf = interaction.user.username.toLowerCase().includes(actualName.split('#')[0].toLowerCase());
    const taunt = Taunt.getChartTaunt({
      actualName,
      isSelf,
      scores,
      hours: totalHours,
      mode
    });

    console.log(`[${new Date().toISOString()}] Selected Chart Taunt for ${actualName}: "${taunt}"`);

    const lastUpdateTs = await getLastTimestamp();
    const lastUpdateDate = new Date(lastUpdateTs * 1000).toLocaleString('fr-FR', { timeZoneName: 'short' });
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
    const globalOption = interaction.options.getBoolean('global');
    const nameOption = interaction.options.getString('name');

    let players: ScoreRow[] = [];

    // Guild is now default if not global and no name search
    const isGuild = !globalOption && !nameOption;

    if (isGuild) {
      if (!interaction.guild) {
        await interaction.editReply('Guild leaderboard can only be used within a Discord server (guild).');
        return;
      }
      // Get all registered users from the database
      const registeredUsers = await getAllRegisteredUsers();
      const allRegisteredDiscordIds = registeredUsers.map(u => u.discord_id);
      
      // Filter those who are in the current guild
      // We use members.cache or fetch only what we need. 
      // Fetching by IDs is more efficient than fetching all.
      const members = await interaction.guild.members.fetch({ user: allRegisteredDiscordIds });
      const memberIds = members.map(m => m.user.id);
      
      // Only keep embark names for users actually in the guild
      const embarkNames = registeredUsers
        .filter(u => memberIds.includes(u.discord_id))
        .map(u => u.embark_id);
      
      if (embarkNames.length === 0) {
        await interaction.editReply('No registered users found in this server. Use `/register` to register your Embark ID.');
        return;
      }
      
      players = await getPlayersByNames(embarkNames);
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
    if (isGuild) {
      const registeredUsers = await getAllRegisteredUsers();
      const allRegisteredDiscordIds = registeredUsers.map(u => u.discord_id);
      const members = await interaction.guild!.members.fetch({ user: allRegisteredDiscordIds });
      const memberIds = members.map(m => m.user.id);
      const embarkNames = registeredUsers
        .filter(u => memberIds.includes(u.discord_id))
        .map(u => u.embark_id);
      previousPlayers = await getPlayersByNames(embarkNames, 1); // 1 day ago
    }

    const isTop = players[0].rank === 1;
    const isInList = players.some(p => interaction.user.username.toLowerCase().includes(p.name.split('#')[0].toLowerCase()));
    const taunt = Taunt.getLeaderboardTaunt({
      isInList,
      isTop,
      isGuild: !!isGuild,
      topPlayers: players,
      previousTopPlayers: previousPlayers
    });

    console.log(`[${new Date().toISOString()}] Selected Leaderboard Taunt: "${taunt}"`);

    const lastUpdateTs = await getLastTimestamp();
    const lastUpdateDate = new Date(lastUpdateTs * 1000).toLocaleString('en-US', { timeZoneName: 'short' });
    const footer = `\n*Last data update: ${lastUpdateDate}*`;

    let response = `${taunt}\n\`\`\`\n`;
    if (isGuild) {
      response += `Pos | Name${' '.repeat(20)} | Score${' '.repeat(3)}| Rank\n`;
      response += `-`.repeat(57) + `\n`;
    } else {
      response += `Rank | Name${' '.repeat(20)} | Score\n`;
      response += `-`.repeat(47) + `\n`;
    }

    let pos = 1;
    for (const p of players) {
      const rankStr = p.rank.toLocaleString().padStart(6, ' ');
      const nameStr = p.name.padEnd(24, ' ');
      const scoreStr = p.rankScore.toLocaleString().padStart(7, ' ');
      let line = '';
      if (nameOption && p.name.toLowerCase().trim().includes(nameOption.toLowerCase())) {
        line = '>';
      }
      
      if (isGuild) {
        const posStr = pos.toString().padStart(3, ' ');
        line += `${posStr} | ${nameStr} | ${scoreStr} | ${rankStr}\n`;
      } else {
        line += `${rankStr} | ${nameStr} | ${scoreStr}\n`;
      }
      
      if (response.length + line.length + 4 > 2000) {
        response += `...\n`;
        break;
      }
      response += line;
      pos++;
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
• \`/rs [name] [days] [hours]\`: Displays a player's **rank score** (RS) chart. If no name is provided, uses your registered Embark ID.
• \`/rank [name] [days] [hours]\`: Displays a player's **rank position** chart. If no name is provided, uses your registered Embark ID.
• \`/leaderboard\`: Displays a leaderboard for registered members of this Discord server (default).
• \`/leaderboard global:true\`: Displays the current top 50 players globally.
• \`/leaderboard name:[player]\`: Displays the leaderboard centered around a specific player.
• \`/register <embark_id>\`: Link your Discord ID with your Embark ID (e.g., Mozzy#3563) for personalized charts and the guild leaderboard.
• \`/help\`: Displays this help message.

*Note: Use at least 3 characters for player name searches. Duration defaults to 14 days if not specified.*
  `;
  await interaction.reply({ content: helpMessage, flags: [MessageFlags.Ephemeral] });
}
