import { Client, Guild, Role } from 'discord.js';
import { ScoreRow, getLatestScoresForRegisteredUsers, getLatestScoreForUser, getStoredRoleId, saveStoredRoleId } from './db';

const RANK_ROLES = [
  'Ruby',
  'Diamond',
  'Platinum',
  'Gold',
  'Silver',
  'Bronze'
];

export async function syncUserRoles(client: Client) {
  console.log(`[${new Date().toISOString()}] Starting role sync for registered users...`);
  
  const registeredData = await getLatestScoresForRegisteredUsers();
  if (registeredData.length === 0) {
    console.log('No registered users found with current scores.');
    return;
  }

  const guilds = client.guilds.cache;
  for (const [guildId, guild] of guilds) {
    console.log(`Syncing roles for guild: ${guild.name} (${guildId})`);
    
    // Ensure all rank roles exist in this guild
    const rolesMap = await ensureRolesExist(guild);

    for (const data of registeredData) {
      try {
        const member = await guild.members.fetch(data.discord_id).catch(() => null);
        if (!member) continue;

        const currentRankRoleName = getRankRoleName(data.score);
        if (!currentRankRoleName) continue;

        console.log(`[DEBUG]: ${JSON.stringify(rolesMap)} ${currentRankRoleName}`)

        const targetRole = rolesMap.get(currentRankRoleName);
        if (!targetRole) continue;

        // Check if user already has the correct role
        if (member.roles.cache.has(targetRole.id)) {
          // Check if user has other rank roles (including deprecated ones) they shouldn't have
          const rolesToRemove = RANK_ROLES
            .filter(name => name !== currentRankRoleName)
            .map(name => rolesMap.get(name))
            .filter((role): role is Role => !!role && member.roles.cache.has(role.id));

          if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
            console.log(`Removed old rank roles from ${member.user.tag}`);
          }
          continue;
        }

        // Remove all other rank roles (including deprecated ones)
        const allOtherRankRoles = RANK_ROLES
          .map(name => rolesMap.get(name))
          .filter((role): role is Role => !!role && member.roles.cache.has(role.id));
        
        if (allOtherRankRoles.length > 0) {
          await member.roles.remove(allOtherRankRoles);
        }

        // Add the new role
        await member.roles.add(targetRole);
        console.log(`Assigned role ${currentRankRoleName} to ${member.user.tag}`);
      } catch (error) {
        console.error(`Failed to sync roles for user ${data.discord_id} in guild ${guild.name}:`, error);
      }
    }
  }
}

export async function syncSingleUserRoles(guild: Guild, discordId: string, embarkId: string) {
  const score = await getLatestScoreForUser(embarkId);
  if (!score) return;

  const rolesMap = await ensureRolesExist(guild);
  const currentRankRoleName = getRankRoleName(score);
  if (!currentRankRoleName) return;

  const targetRole = rolesMap.get(currentRankRoleName);
  if (!targetRole) return;

  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) return;

  // Remove other rank roles (including deprecated ones)
  const rolesToRemove = RANK_ROLES
    .map(name => rolesMap.get(name))
    .filter((role): role is Role => !!role && member.roles.cache.has(role.id) && role.id !== targetRole.id);

  if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove);
  }

  if (!member.roles.cache.has(targetRole.id)) {
    await member.roles.add(targetRole);
    console.log(`Assigned role ${currentRankRoleName} to ${member.user.tag} upon registration.`);
  }
}

async function ensureRolesExist(guild: Guild): Promise<Map<string, Role>> {
  const rolesMap = new Map<string, Role>();
  const existingRoles = await guild.roles.fetch();

  // Handle current roles
  for (const roleName of RANK_ROLES) {
    let role: Role | null | undefined = null;

    // 1. Try to find by stored ID in DB
    const storedRoleId = await getStoredRoleId(guild.id, roleName);
    if (storedRoleId) {
      role = existingRoles.get(storedRoleId);
    }

    // 2. Fallback: Search by name (case-insensitive)
    if (!role) {
      role = existingRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    }

    // 3. Create only if it's one of the current target roles
    if (!role && RANK_ROLES.includes(roleName)) {
      try {
        role = await guild.roles.create({
          name: roleName,
          reason: 'Auto-created by Cardboard Grind Bot for rank tracking',
          hoist: true // This makes it show up separately in the sidebar
        });
        console.log(`Created role: ${roleName} in guild ${guild.name}`);
      } catch (error) {
        console.error(`Failed to create role ${roleName} in guild ${guild.name}:`, error);
        continue;
      }
    }

    // Store/Update ID in DB if we found/created it
    if (role) {
      await saveStoredRoleId(guild.id, roleName, role.id);
      rolesMap.set(roleName, role);
    }
  }
  return rolesMap;
}

function getRankRoleName(score: ScoreRow): string | null {
  if (score.rank > 0 && score.rank <= 500) {
    return 'Ruby';
  }

  if (!score.league) return null;
  
  // Return only the league name (Diamond, Platinum, etc.)
  return score.league;
}
