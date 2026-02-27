# The Finals Leaderboard Discord Bot

This Discord bot automatically fetches "The Finals" leaderboard scores every 45 minutes and allows users to visualize their progress via a chart.

## Prerequisites

- Docker and Docker Compose
- A Discord Developer account to create the bot

## Installation

1. Clone this repository.
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Fill in the environment variables in `.env` (see next section).
4. Launch the bot with Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

## Configuration (.env)

| Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Your Discord bot token. |
| `DISCORD_CLIENT_ID` | Your Discord application ID. |
| `GUILD_ID` | (Optional) Your server ID for fast command registration. If empty, commands are registered globally (can take up to 1h). See [How to find Guild ID](#how-to-find-guild-id). |
| `THE_FINALS_SEASON` | Current season for the API (e.g., `s4`). |
| `DATABASE_URL` | PostgreSQL connection string (default `postgresql://botuser:botpassword@db:5432/finalsdb`). |

### How to find Guild ID?
1. Open Discord and go to **User Settings** (the gear icon at the bottom left).
2. Go to **Advanced** (under App Settings).
3. Enable **Developer Mode**.
4. Right-click on your server's icon in the server list on the left.
5. Click **Copy Server ID** (this is your `GUILD_ID`).

## Bot Configuration (Developer Portal)

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application.
3. In the **Bot** tab, get the `TOKEN`.
4. Go to **OAuth2** -> **General**, get the `CLIENT ID`.
5. Go to **OAuth2** -> **URL Generator**, check `bot` and `applications.commands`.
6. **Crucial**: In the **Bot** tab, scroll down to **Privileged Gateway Intents** and enable **Server Members Intent**. This is required for the `/leaderboard global:false` feature and to allow the bot to change nicknames.
7. (Optional) In the **OAuth2** -> **URL Generator** tab, you can test the invitation (see Usage section).

### How to add the bot to your server?
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application.
3. Go to **OAuth2** -> **URL Generator**.
4. Check the boxes (Scopes):
   - `bot`
   - `applications.commands`
5. In **Bot Permissions**, check:
   - `Send Messages`
   - `Attach Files`
   - `Use Slash Commands`
   - `Manage Nicknames` (Required to sync name with `/register`)
   - `Manage Roles` (Required to sync rank roles)
6. Copy the generated URL at the bottom and paste it into your browser to invite the bot.
7. **Important**: The bot's role in Discord must be positioned **above** the rank roles (Diamond, Platinum, etc.) and above the users it needs to manage in the server's Role settings.

### Rank Roles
The bot automatically creates and manages the following roles based on users' current leaderboard rank:
- Ruby (Top 500 players)
- Diamond 1-4
- Platinum 1-4
- Gold 1-4
- Silver 1-4
- Bronze 1-4

These roles are set to "hoist" (display separately in the sidebar). Roles are updated every 45 minutes when the leaderboard data is refreshed.

### Force data fetch
You can manually trigger a data fetch from the API using:
```bash
npm run fetch
```
*(Note: requires `ts-node` or to be run inside the container)*

## Project Structure

- `src/db.ts`: PostgreSQL database management.
- `src/cron.ts`: Scheduled task for data fetching.
- `src/chart.ts`: Chart generation with Chart.js.
- `src/bot.ts`: Discord bot logic and slash command handling.
- `src/register-commands.ts`: Script to register commands with Discord.
- `src/fetch.ts`: Script to manually force data fetching from the API.
