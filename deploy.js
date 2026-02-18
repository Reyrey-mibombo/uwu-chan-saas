const { REST, Routes } = require("discord.js");
const path = require("path");
const fs = require("fs");

const commandsPath = path.join(__dirname, "src/commands");
const versions = ["v1", "v2", "premium"];
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

console.log("Railway token:", process.env.DISCORD_TOKEN ? "set" : "NOT SET");
console.log("Railway client id:", process.env.CLIENT_ID ? "set" : "NOT SET");
console.log("Railway guild id:", process.env.TEST_GUILD_ID ? "set" : "NOT SET");

let token = process.env.DISCORD_TOKEN || "";
let id = process.env.CLIENT_ID || "";
let guildId = process.env.TEST_GUILD_ID || "";

const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
env.split("\n").forEach(l => {
  if (l.startsWith("DISCORD_TOKEN=")) token = token || l.split("=")[1].trim();
  if (l.startsWith("CLIENT_ID=")) id = id || l.split("=")[1].trim();
  if (l.startsWith("TEST_GUILD_ID=")) guildId = guildId || l.split("=")[1].trim();
});

if (!token || !id) { console.log("ERROR: No token/id in .env or env variables"); process.exit(1); }

console.log("Deploying to", guildId ? "guild " + guildId : "global");

const rest = new REST({ timeout: 10000 });
rest.setToken(token);

const route = guildId 
  ? Routes.applicationGuildCommands(id, guildId)
  : Routes.applicationCommands(id);

rest.put(route, { body: commands })
  .then(r => console.log("SUCCESS! Deployed", r.length, "commands"))
  .catch(e => console.log("ERROR:", e.message));
