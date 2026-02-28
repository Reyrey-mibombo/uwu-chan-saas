const { REST, Routes } = require("discord.js");
const path = require("path");
const fs = require("fs");
require('dotenv').config();

const commandsPath = path.join(__dirname, "src/commands");
// Support all tiers, or restrict by environment variable
const defaultVersions = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'premium'];
const versions = process.env.ENABLED_TIERS ? process.env.ENABLED_TIERS.split(',') : defaultVersions;
const commands = [];

for (const version of versions) {
  const vp = path.join(commandsPath, version);
  if (!fs.existsSync(vp)) continue;
  const files = fs.readdirSync(vp).filter(f => f.endsWith(".js"));
  for (const file of files) {
    try {
      const cmd = require(path.join(vp, file));
      if (cmd.data && cmd.execute) commands.push(cmd.data.toJSON());
    } catch (e) { console.log("Error:", e.message); }
  }
}

console.log("Loaded", commands.length, "commands");

let token = process.env.DISCORD_TOKEN || "";
let id = process.env.CLIENT_ID || "";
let guildId = process.env.TEST_GUILD_ID || "";

if (!token || !id) { console.log("ERROR: No token/id in .env or env variables"); process.exit(1); }

console.log("Deploying to", guildId ? "guild " + guildId : "global");
console.log("Token length:", token.length);
console.log("Commands to deploy:", commands.length);

const rest = new REST({ timeout: 120000 });
rest.setToken(token);

const route = guildId
  ? Routes.applicationGuildCommands(id, guildId)
  : Routes.applicationCommands(id);

console.log("Route:", route);

async function deploy() {
  console.log("Starting deploy...");
  try {
    const r = await rest.put(route, { body: commands });
    console.log("SUCCESS! Deployed", r.length, "commands");
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}

deploy();
