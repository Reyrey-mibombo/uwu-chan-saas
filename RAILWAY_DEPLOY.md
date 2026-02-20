# Railway Deployment Guide

This guide explains how to deploy all 3 bots to Railway.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. MongoDB database (MongoDB Atlas recommended)

## Deployment Steps

### Step 1: Deploy Strata1 (Main Bot)

1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `uwu-chan-saas` repository
4. Railway will auto-detect the `railway.json` and `package.json`

**Configure Environment Variables:**
```
DISCORD_TOKEN=your_strata1_token
CLIENT_ID=your_strata1_client_id
MONGODB_URI=mongodb+srv://...
LICENSE_ENCRYPTION_KEY=your_key
PORT=3000
NODE_ENV=production
```

5. Click "Deploy"

### Step 2: Deploy Strata2 (Premium Bot)

1. In Railway dashboard, click "New" → "Empty Project"
2. Click "Add Service" → "GitHub Repo"
3. Select your repo
4. **IMPORTANT**: Set the Root Directory to `strata2`
5. Railway will use `strata2/railway.json`

**Configure Environment Variables:**
```
DISCORD_TOKEN=your_strata2_token
CLIENT_ID=your_strata2_client_id
MONGODB_URI=same_as_strata1
LICENSE_ENCRYPTION_KEY=same_as_strata1
PORT=3001
NODE_ENV=production
```

6. Click "Deploy"

### Step 3: Deploy Strata3 (Enterprise Bot)

1. Create another new project
2. Add GitHub repo service
3. Set Root Directory to `strata3`
4. Railway will use `strata3/railway.json`

**Configure Environment Variables:**
```
DISCORD_TOKEN=your_strata3_token
CLIENT_ID=your_strata3_client_id
MONGODB_URI=same_as_strata1
LICENSE_ENCRYPTION_KEY=same_as_strata1
PORT=3002
NODE_ENV=production
```

5. Click "Deploy"

## Step 4: Deploy Commands

After all 3 bots are running, you need to deploy the slash commands:

### Option A: Local Deployment (Recommended for first time)

```bash
# Clone your repo
git clone https://github.com/Reyrey-mibombo/uwu-chan-saas.git
cd uwu-chan-saas

# Install dependencies
npm install

# Create .env files with your Railway environment variables
cp .env.example .env
# Edit .env with your actual tokens from Railway

# Deploy commands
node deploy.js                    # Strata1 (55 commands)
cd strata2 && node deploy.js      # Strata2 (75 commands)
cd strata3 && node deploy.js      # Strata3 (100 commands)
```

### Option B: Railway Deployment (One-time setup)

Add these to your Railway environment variables for each bot:

**For Strata1:**
```
TEST_GUILD_ID=your_test_server_id
```

Then add a one-time deploy command in Railway:
1. Go to your Strata1 service
2. Click "Settings"
3. Add Deploy Command: `node deploy.js`
4. Deploy once
5. Remove the deploy command after

**Repeat for Strata2 and Strata3**

## Railway Project Structure

You should have **3 separate projects** in Railway:

```
📁 Railway Dashboard
├── 📁 Strata1-Core (Root folder)
│   └── Service: uwu-chan-saas
├── 📁 Strata2-Premium (Root: strata2)
│   └── Service: strata2
└── 📁 Strata3-Enterprise (Root: strata3)
    └── Service: strata3
```

## Important Notes

1. **Each bot needs its own Discord application** (3 separate bots)
2. **All 3 bots MUST share the same MongoDB URI**
3. **All 3 bots MUST have the same LICENSE_ENCRYPTION_KEY**
4. **Use different PORTs**: 3000, 3001, 3002

## Monitoring

Railway provides:
- **Logs**: View real-time logs for each bot
- **Metrics**: CPU, Memory usage
- **Health Checks**: Automatic restarts on failure

## Updating Bots

When you push changes to GitHub:
1. Railway auto-deploys all 3 bots
2. No manual intervention needed

## Troubleshooting

**Bot shows offline:**
- Check DISCORD_TOKEN is correct
- Check logs in Railway dashboard

**Commands not appearing:**
- Run `node deploy.js` locally with correct tokens
- Check TEST_GUILD_ID if using guild commands

**Database connection errors:**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas IP whitelist (allow all IPs for Railway)

**Port already in use:**
- Each bot must use a different PORT
- Default: 3000, 3001, 3002

## Cost

Railway pricing:
- **Free tier**: Limited hours/month (good for testing)
- **Hobby**: $5/month per service (recommended for production)
- You need 3 services = $15/month for all 3 bots

## Support

- Railway Docs: https://docs.railway.app
- Discord.js Docs: https://discord.js.org
- Check SETUP.md for more details
