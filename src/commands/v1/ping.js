const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const { createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('📡 Advanced system telemetry, latency, and resource monitoring'),

  async execute(interaction, client) {
    // Universal Client Support: Fallback to interaction.client if 'client' isn't passed by your handler
    const botClient = client || interaction.client;

    // 1. Defer Reply immediately to calculate accurate API latency
    const sent = await interaction.deferReply({ fetchReply: true });

    // 2. Build Initial Response
    const initialEmbed = generateStatsEmbed(botClient, sent, interaction);
    
    // Create Refresh Button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('refresh_ping')
        .setLabel('🔄 Refresh Stats')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [initialEmbed], components: [row] });

    // 3. Create Collector for Refresh Button
    const filter = i => i.customId === 'refresh_ping' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter, 
      componentType: ComponentType.Button,
      time: 60000 // Active for 1 minute
    });

    collector.on('collect', async i => {
      // Fetch the reply again to ensure the message exists
      const reply = await i.deferUpdate({ fetchReply: true });
      
      // Regenerate stats
      const refreshedEmbed = generateStatsEmbed(botClient, reply, i, true);
      await i.editReply({ embeds: [refreshedEmbed] });
    });

    collector.on('end', () => {
      // Disable the button after inactivity to keep UI clean
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('refresh_ping')
          .setLabel('⏱️ Session Expired')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }
};

// ================== HELPER FUNCTIONS ==================

function generateStatsEmbed(client, message, interaction, isRefresh = false) {
  // --- 1. Latency Calculation ---
  const wsPing = client.ws.ping;
  
  // API Ping Calculation
  let apiPing;
  if (isRefresh) {
    // For button clicks: Time from button press to now
    apiPing = Date.now() - interaction.createdTimestamp;
  } else {
    // For slash commands: Time between command creation and reply creation
    apiPing = message.createdTimestamp - interaction.createdTimestamp;
  }

  // --- 2. Dynamic Color based on Health ---
  let color = 0x57F287; // Green (Good)
  if (wsPing > 100 || apiPing > 200) color = 0xFEE75C; // Yellow (Okay)
  if (wsPing > 300 || apiPing > 500) color = 0xED4245; // Red (Bad)

  // --- 3. Resource Usage ---
  
  // Host Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

  // Bot Process Memory (Heap) - Real RAM usage of the bot process
  const heapUsed = process.memoryUsage().heapUsed;
  const heapTotal = process.memoryUsage().heapTotal;
  const heapPercent = ((heapUsed / heapTotal) * 100).toFixed(1);
  const heapUsedMB = (heapUsed / 1024 / 1024).toFixed(2);

  // CPU Load
  const cpuUsage = os.loadavg()[0]; // 1 minute average
  const cpuCores = os.cpus().length;
  const cpuPercent = ((cpuUsage / cpuCores) * 100).toFixed(1);

  // Uptime
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor(uptime / 3600) % 24;
  const minutes = Math.floor(uptime / 60) % 60;
  const uptimeString = `${days}d ${hours}h ${minutes}m`;

  // Guild Count (Handles Sharding automatically)
  const guildCount = client.guilds.cache.size;

  // --- 4. Build Embed ---
  return new ()
    .setTitle('📡 System Telemetry & Diagnostics')
    .setDescription('Real-time performance metrics and connection status.')
    .setColor(color)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 64 }))
    .addFields(
      {
        name: '⏱️ Network Latency',
        value: `**WebSocket:** \`${wsPing}ms\`\n**API Roundtrip:** \`${apiPing}ms\``,
        inline: true
      },
      {
        name: '🤖 Bot Process',
        value: `**Uptime:** \`${uptimeString}\`\n**Heap:** \`${heapUsedMB} MB\`\n**Servers:** \`${guildCount}\``,
        inline: true
      },
      {
        name: '💾 Host Memory',
        value: `**Usage:** \`${formatBytes(usedMem)} / ${formatBytes(totalMem)}\`\n${createProgressBar(memPercent)} \`(${memPercent}%)\``,
        inline: false
      },
      {
        name: '⚙️ CPU Load (1m Avg)',
        value: `${createProgressBar(cpuPercent)} \`(${cpuPercent}% across ${cpuCores} cores)\``,
        inline: false
      },
      {
        name: '🛠️ Environment',
        value: `**Node.js:** \`${process.versions.node}\`\n**Discord.js:** \`${require('discord.js').version}\`\n**Platform:** \`${os.platform()}\``,
        inline: true
      }
    )
    .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();
}

// Formats bytes into readable GB/MB
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Creates a visual progress bar
function createProgressBar(percent, length = 15) {
  const p = Math.min(parseFloat(percent), 100); // Clamp 0-100
  const filled = Math.round((p / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
