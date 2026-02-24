# uwu-chan-saas

A comprehensive Discord bot for staff management with tiered premium system.

## Features

### Core Features
- **Ticket System** - Report staff, feedback tickets with claim/close functionality
- **Staff Applications** - Application panel with accept/deny workflow
- **Helper Applications** - Separate helper application system
- **Auto Promotion** - Automatic rank promotion based on 9 requirements

### Promotion Requirements
1. Points
2. Shifts
3. Consistency
4. Max Warnings
5. Shift Hours
6. Achievements
7. Reputation
8. Days in Server
9. Clean Record Days

### Command Tiers

| Tier | Versions | Description |
|------|----------|-------------|
| Free | v1, v2 | Base commands, staff tools |
| Premium | v3, v4, v5 | Analytics, moderation, staff features |
| Enterprise | v6, v7, v8 | Advanced insights, automation, ultimate |

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `CLIENT_ID` | Discord application client ID |
| `TEST_GUILD_ID` | Test server ID for command deployment |
| `MONGODB_URI` | MongoDB connection string |
| `LICENSE_ENCRYPTION_KEY` | Encryption key for licenses |
| `PORT` | Server port (default: 3000) |
| `ENABLED_TIERS` | Comma-separated list of command folders to load (e.g., `v1,v2`). If left blank, loads all tiers. |

## Commands

### v1 (Free) - Base Commands
- `/ticketsetup` - Setup ticket system
- `/ticketlogs` - View ticket logs
- `/applysetup` - Setup staff applications
- `/applypanel` - Show application panel
- `/applystatus` - Check application status
- `/set_requirements` - Set promotion requirements
- `/auto_promotion` - Enable/disable auto promotion
- `/promote` - Manual promote
- `/demote` - Manual demote
- `/shift_start` - Start shift
- `/shift_end` - End shift
- `/staff_stats` - View staff stats
- `/leaderboard` - Points leaderboard
- And more...

### v2 (Free) - Staff Tools
- `/helpersetup` - Setup helper applications
- `/helperpanel` - Show helper panel
- `/view_applications` - View pending applications
- `/addpoints` - Add points to user
- `/removepoints` - Remove points
- `/resetpoints` - Reset all points
- `/addreputation` - Add reputation
- `/addachievement` - Add achievement
- `/shiftstats` - Shift statistics
- `/toppoints` - Top point earners

### v3-v8 - Premium/Enterprise
- Advanced analytics
- Automation features
- Visual staff leaderboards
- Predictions and forecasting
- And more...

## Deployment

```bash
# Start the bot
npm start

# Development mode
npm run dev

# Deploy commands
npm run deploy
```

### Multi-Branch Deployment (Railway Setup)
STRATA is designed to run across multiple isolated bot instances depending on the customer's subscription tier. You can configure which commands are loaded by setting the `ENABLED_TIERS` environment variable in your Railway dashboard:

1. **Master Branch (Base / Free Tier)**
   - Environment Variable: `ENABLED_TIERS="v1,v2,premium"`
   - Description: Loads only the basic free commands and the buying commands.
2. **Strata2 Branch (Premium Tier)**
   - Environment Variable: `ENABLED_TIERS="v3,v4,v5"`
   - Description: Dedicated instance for mid-tier analytics and moderation.
3. **Strata3 Branch (Enterprise Tier)**
   - Environment Variable: `ENABLED_TIERS="v6,v7,v8"`
   - Description: Loads the highest level ultimate commands.

*Note: If `ENABLED_TIERS` is not set, the bot will default to loading all `v1` through `v8` commands for local testing.*

## License

MIT
