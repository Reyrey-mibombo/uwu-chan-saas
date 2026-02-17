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

const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
let token = "", id = "";
env.split("\n").forEach(l => {
  if (l.startsWith("DISCORD_TOKEN=")) token = l.split("=")[1].trim();
  if (l.startsWith("CLIENT_ID=")) id = l.split("=")[1].trim();
});

if (!token || !id) { console.log("ERROR: No token/id in .env"); process.exit(1); }

console.log("Deploying...");

const rest = new REST({ timeout: 10000 });
rest.setToken(token);

rest.put(Routes.applicationCommands(id), { body: commands })
  .then(r => console.log("SUCCESS! Deployed", r.length, "commands"))
  .catch(e => console.log("ERROR:", e.message));
