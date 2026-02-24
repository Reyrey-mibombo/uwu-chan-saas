# Railway Deployment - Step by Step

Follow these exact steps to deploy your 3 bots.

## Step 1: Prepare Your Code

Make sure your GitHub has the latest code:
```bash
cd uwu-chan-saas
git add .
git commit -m "Ready for Railway"
git push origin master
```

## Step 2: Create Discord Bots

1. Go to https://discord.com/developers/applications
2. Click "New Application" (blue button top right)
3. Name it "Strata1" → Create
4. Click "Bot" on left sidebar → "Add Bot" → "Yes, do it!"
5. Click "Reset Token" → COPY THE TOKEN (save it!)
6. Click "OAuth2" on left → copy "Client ID"
7. **Repeat steps 2-6** for "Strata2" and "Strata3"

You now have:
- 3 bot tokens
- 3 client IDs

## Step 3: Deploy Strata1 (First Bot)

### 3.1 Create Project
1. Go to https://railway.app/dashboard
2. Click **"New"** button (top right)
3. Click **"Project"**
4. Click **"Deploy from GitHub repo"**
5. Select your `uwu-chan-saas` repository
6. Click **"Add Variables"**

### 3.2 Add Environment Variables

Copy-paste these EXACTLY:

**Variable 1:**
- Key: `DISCORD_TOKEN`
- Value: (paste Strata1 token from Step 2)

**Variable 2:**
- Key: `CLIENT_ID`
- Value: (paste Strata1 Client ID)

**Variable 3:**
- Key: `MONGODB_URI`
- Value: `mongodb+srv://username:password@cluster.mongodb.net/uwu-chan`
- (Get this from MongoDB Atlas)

**Variable 4:**
- Key: `LICENSE_ENCRYPTION_KEY`
- Value: `31584c62edff70cf8dd51ab8e207a26c`
- (Or generate new: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`)

**Variable 5:**
- Key: `PORT`
- Value: `3000`

**Variable 6:**
- Key: `NODE_ENV`
- Value: `production`

Click **"Deploy"** (red button)

### 3.3 Wait for Deploy
- Watch the logs (bottom of screen)
- Wait for "Build successful"
- Bot should show "Bot logged in as Strata1#1234"

## Step 4: Deploy Strata2 (Second Bot)

### 4.1 Create Project
1. Go back to https://railway.app/dashboard
2. Click **"New"** → **"Project"**
3. Click **"Deploy from GitHub repo"**
4. Select `uwu-chan-saas`
5. **IMPORTANT**: Click "Settings" (gear icon)
6. Find "Root Directory" → type: `strata2`
7. Click **"Add Variables"**

### 4.2 Add Environment Variables

**Variable 1:**
- Key: `DISCORD_TOKEN`
- Value: (paste Strata2 token from Step 2)

**Variable 2:**
- Key: `CLIENT_ID`
- Value: (paste Strata2 Client ID)

**Variable 3:**
- Key: `MONGODB_URI`
- Value: (SAME as Strata1!)

**Variable 4:**
- Key: `LICENSE_ENCRYPTION_KEY`
- Value: (SAME as Strata1!)

**Variable 5:**
- Key: `PORT`
- Value: `3001` (different from Strata1!)

**Variable 6:**
- Key: `NODE_ENV`
- Value: `production`

Click **"Deploy"**

### 4.3 Wait for Deploy
- Watch logs
- Should show "[STRATA2] Bot logged in..."

## Step 5: Deploy Strata3 (Third Bot)

### 5.1 Create Project
1. Dashboard → **"New"** → **"Project"**
2. **"Deploy from GitHub repo"**
3. Select `uwu-chan-saas`
4. Settings → Root Directory: `strata3`
5. **"Add Variables"**

### 5.2 Add Environment Variables

**Variable 1:**
- Key: `DISCORD_TOKEN`
- Value: (Strata3 token)

**Variable 2:**
- Key: `CLIENT_ID`
- Value: (Strata3 Client ID)

**Variable 3:**
- Key: `MONGODB_URI`
- Value: (SAME database)

**Variable 4:**
- Key: `LICENSE_ENCRYPTION_KEY`
- Value: (SAME key)

**Variable 5:**
- Key: `PORT`
- Value: `3002` (different!)

**Variable 6:**
- Key: `NODE_ENV`
- Value: `production`

Click **"Deploy"**

## Step 6: Deploy Slash Commands (IMPORTANT!)

Bots are running but commands aren't registered yet!

### Option A: Deploy from your computer (Easiest)

1. Open terminal on your computer
2. Clone repo: `git clone https://github.com/Reyrey-mibombo/uwu-chan-saas.git`
3. `cd uwu-chan-saas`
4. `npm install`
5. Create `.env` file:
```
DISCORD_TOKEN=your_strata1_token
CLIENT_ID=your_strata1_client_id
TEST_GUILD_ID=your_server_id
```
6. Run: `node deploy.js` (deploys Strata1 commands)
7. Edit `.env` with Strata2 token and client_id
8. Run: `cd strata2 && node deploy.js` (deploys Strata2)
9. Edit `.env` with Strata3 token and client_id  
10. Run: `cd strata3 && node deploy.js` (deploys Strata3)

### Option B: Deploy from Railway (One-time)

1. Go to Strata1 project in Railway
2. Click "Settings"
3. Add variable: `TEST_GUILD_ID=your_discord_server_id`
4. Click "Deploy"
5. Open "Shell" (top right)
6. Type: `node deploy.js` → Enter
7. Wait for "SUCCESS! Deployed 55 commands"
8. **Repeat for Strata2 and Strata3**

## Step 7: Invite Bots to Your Server

Create 3 invite links (replace CLIENT_ID with each bot's ID):

```
https://discord.com/api/oauth2/authorize?client_id=STRATA1_CLIENT_ID&permissions=8&scope=bot%20applications.commands

https://discord.com/api/oauth2/authorize?client_id=STRATA2_CLIENT_ID&permissions=8&scope=bot%20applications.commands

https://discord.com/api/oauth2/authorize?client_id=STRATA3_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Open each link in browser and invite to your server.

## Step 8: Test!

1. Type `/help` in Discord - should show Strata1 commands
2. Type `/premium` - should show buy options
3. Buy Premium/Enterprise (or use free trial)
4. Try Strata2 commands: `/achievement_tracker`
5. Try Strata3 commands: `/achievement_display`

## What You Should See in Railway

```
📁 Railway Dashboard
│
├── 📁 uwu-chan-saas (Strata1)
│   └── 🟢 Running (55 commands)
│
├── 📁 strata2 (Strata2)  
│   └── 🟢 Running (75 commands)
│
└── 📁 strata3 (Strata3)
    └── 🟢 Running (100 commands)
```

## Troubleshooting

**"Error: No token/id in .env"**
→ You forgot to add environment variables in Railway

**"Deploy error: Cannot find module"**
→ Run `npm install` locally first

**"Commands not showing in Discord"**
→ Run `node deploy.js` for each bot

**"Permission denied" when inviting bot**
→ Make sure you have "Manage Server" permission

**"Bot says Premium Required"**
→ Run `/premium` → Start Free Trial (Strata1 only)

## Cost

- **Free tier**: Limited hours (good for testing)
- **Hobby**: $5/month per bot = $15/month total
- All 3 bots need to be on Hobby for 24/7 uptime

## Need Help?

- Check logs in Railway (click on service → "Logs" tab)
- Make sure all 3 bots use SAME MongoDB
- Make sure all 3 bots use SAME LICENSE_ENCRYPTION_KEY
- Each bot needs DIFFERENT PORT (3000, 3001, 3002)

You've got this! 🚀
