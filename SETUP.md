# Uwu-Chan SaaS - 3-Bot Setup Guide

## Overview

This repository contains 3 Discord bots to work around Discord's 100 command limit:

- **Strata1** (Root folder): Core bot with free commands + payment handling
- **Strata2**: Premium commands (requires Premium or Enterprise)
- **Strata3**: Enterprise commands (requires Enterprise only)

## Bot Structure

| Bot | Commands | Tier Required | Description |
|-----|----------|---------------|-------------|
| Strata1 | v1, v2, premium (55) | Free | Core + Buy/Activate commands |
| Strata2 | v3, v4, v5 (75) | Premium+ | Staff & Moderation features |
| Strata3 | v6, v7, v8 (100) | Enterprise | Advanced Analytics & Visuals |

## Setup Instructions

### Step 1: Create Discord Applications

1. Go to https://discord.com/developers/applications
2. Create 3 new applications:
   - **Strata1** - Your main bot
   - **Strata2** - Premium features bot
   - **Strata3** - Enterprise features bot
3. For each bot:
   - Go to "Bot" tab → "Add Bot"
   - Click "Reset Token" and copy it
   - Go to "OAuth2" → "General" and copy "Client ID"
   - Enable these intents: Server Members, Message Content, Presence

### Step 2: Invite Bots to Server

Use these URLs (replace CLIENT_ID with your bot's ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

### Step 3: Set Up MongoDB

1. Create a MongoDB database (MongoDB Atlas recommended)
2. Get your connection string
3. **All 3 bots must use the SAME database!**

### Step 4: Configure Environment Files

Copy the example files and fill in your values:

```bash
# Strata1
cp .env.example .env

# Strata2
cd strata2
cp .env.example .env
cd ..

# Strata3
cd strata3
cp .env.example .env
cd ..
```

Edit each `.env` file with your:
- Discord tokens
- Client IDs
- MongoDB URI
- Encryption keys

### Step 5: Install Dependencies

```bash
# Install for all 3 bots
npm install
cd strata2 && npm install && cd ..
cd strata3 && npm install && cd ..
```

### Step 6: Deploy Commands

```bash
# Deploy Strata1 (55 commands)
node deploy.js

# Deploy Strata2 (75 commands)
cd strata2
node deploy.js
cd ..

# Deploy Strata3 (100 commands)
cd strata3
node deploy.js
cd ..
```

### Step 7: Start the Bots

Run each bot in a separate terminal:

```bash
# Terminal 1
node src/index.js

# Terminal 2
cd strata2
node src/index.js

# Terminal 3
cd strata3
node src/index.js
```

## Tier System

| Tier | Price | Bots Unlocked | Commands |
|------|-------|---------------|----------|
| Free | $0 | Strata1 only | v1, v2 (50) |
| Premium | $9.99/mo | Strata1 + Strata2 | v1-v5 (130) |
| Enterprise | $19.99/mo | All 3 bots | v1-v8 (230) |

## How It Works

1. **Strata1** handles all payments via `/buy` and `/premium` commands
2. When a user buys Premium/Enterprise, the license is saved to MongoDB
3. **Strata2** and **Strata3** check the same database for active licenses
4. All bots share the same license system through MongoDB

## Important Notes

- **All 3 bots must share the same MongoDB database**
- **All 3 bots must have the same LICENSE_ENCRYPTION_KEY**
- **Each bot needs its own Discord token and Client ID**
- **Each bot runs on a different port (3000, 3001, 3002)**

## Troubleshooting

**Bot says "Premium Required" but I have Premium:**
- Make sure all 3 bots are connected to the same MongoDB
- Check that the license was created successfully

**Commands not showing up:**
- Run `node deploy.js` for each bot
- Check Discord Developer Portal for errors

**Database connection errors:**
- Verify MONGODB_URI is correct
- Ensure IP whitelist allows your server

## Support

For issues, please check:
1. All .env files are properly configured
2. All 3 bots are running
3. MongoDB is accessible from all bots
4. Discord tokens are valid
