const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with advanced bot and host latency metrics'),

  async execute(interaction, client) {
    try {
      const sent = await interaction.deferReply({ fetchReply: true });
      const wsPing = client.ws.ping;
      const apiPing = sent.createdTimestamp - interaction.createdTimestamp;

      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor(uptime / 3600) % 24;
      const minutes = Math.floor(uptime / 60) % 60;
      const seconds = Math.floor(uptime) % 60;
      const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = ((usedMemory / totalMemory) * 100).toFixed(2);

      const cpuUsage = os.loadavg()[0].toFixed(2);
      const platform = os.platform() === 'win32' ? 'Windows' : os.platform() === 'linux' ? 'Linux' : os.platform();

      const embed = await createCustomEmbed(interaction, {
        title: '🏓 Pong! System Diagnostics',
        description: 'Advanced latency and host machine metrics fetched in real-time.',
        thumbnail: client.user.displayAvatarURL(),
        fields: [
          { name: '🌐 WebSockets', value: `\`${wsPing}ms\``, inline: true },
          { name: '📡 API Roundtrip', value: `\`${apiPing}ms\``, inline: true },
          { name: '💻 Host OS', value: `\`${platform}\``, inline: true },
          { name: '⏱️ Process Uptime', value: `\`${uptimeString}\``, inline: false },
          { name: '🧠 Host Memory', value: `\`${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB (${memoryUsage}%)\``, inline: true },
          { name: '⚙️ CPU Load (1m)', value: `\`${cpuUsage}%\``, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while calculating system metrics.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
