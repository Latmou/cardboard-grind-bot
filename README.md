# The Finals Leaderboard Discord Bot

This Discord bot automatically fetches "The Finals" leaderboard scores every 10 minutes and allows users to visualize their progress via a chart.

## Features

- **Cron Job**: Fetches data from The Finals API every 10 minutes.
- **Taunts**: Features 156 unique and varied taunts to spice up the competition.
- **Database**: Records score history for the top 10,000 players.
- **`/rank` command**: 
    - `name` (required): Player name (e.g., `Mozzy#3563`).
    - `days` (optional, default 14): Number of days of history to display on the chart.

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
| `GUILD_ID` | (Optional) Your server ID for fast command registration. If empty, commands are registered globally (can take up to 1h). |
| `THE_FINALS_SEASON` | Current season for the API (e.g., `s4`). |
| `DATABASE_PATH` | Path to the SQLite file (default `/app/data/database.sqlite`). |

## Bot Usage

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
6. Copy the generated URL at the bottom and paste it into your browser to invite the bot.

### How to add the bot to your contacts (even without a server)?
If you don't have a server (guild), you can add the bot directly to your user account:
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application and go to the **Installation** tab.
3. In the **Installation Contexts** section, check the **User Install** box.
4. In **Default Install Settings**, ensure `applications.commands` is selected in the scopes.
5. In the **Install Link** section, choose **Discord Provided Link**.
6. Copy the displayed URL and paste it into your browser.
7. A Discord window will open: click "Authorize" or "Add" to link the bot to your account.
8. **How to find it later?** 
    - Open any chat (your direct messages or any server).
    - Type `/` and you should see your bot's icon in the list on the left of the slash commands.
    - **If the bot still doesn't appear:**
        1. Check that you have filled in `DISCORD_CLIENT_ID` in your `.env` file.
        2. Ensure you have restarted the bot (`docker-compose up -d --build`).
        3. **Tip for immediate testing:** Fill in `GUILD_ID` in the `.env` with the ID of a server where you have the bot. This will force instant registration on that server instead of waiting for global propagation (which can take 1h).
        4. Check the bot logs to confirm registration: `docker-compose logs bot`.
    - If commands don't appear immediately (in global mode), wait about **1 hour** (Discord's global propagation time).
9. The bot exclusively uses **slash commands** (e.g., `/rank`).

## Bot Configuration (Developer Portal)

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application.
3. In the **Bot** tab, get the `TOKEN`.
4. Go to **OAuth2** -> **General**, get the `CLIENT ID`.
5. Go to **OAuth2** -> **URL Generator**, check `bot` and `applications.commands`.
6. **Crucial**: In the **Bot** tab, scroll down to **Privileged Gateway Intents** and enable **Server Members Intent**. This is required for the `/leaderboard guild:true` feature.
7. (Optional) In the **OAuth2** -> **URL Generator** tab, you can test the invitation (see Usage section).

## Project Structure

- `src/db.ts`: SQLite database management.
- `src/cron.ts`: Scheduled task for data fetching.
- `src/chart.ts`: Chart generation with Chart.js.
- `src/bot.ts`: Discord bot logic and slash command handling.
- `src/register-commands.ts`: Script to register commands with Discord.
