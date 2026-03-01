const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_chart')
    .setDescription('Macroscopic Engagement Dashboard visualization')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 14)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const days = Math.min(interaction.options.getInteger('days') || 14, 30);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } }).lean();

      const dailyData = {};
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        dailyData[key] = { messages: 0, commands: 0, total: 0 };
      }

      activities.forEach(a => {
        const key = a.createdAt.toISOString().split('T')[0];
        if (dailyData[key]) {
          if (a.type === 'message') dailyData[key].messages++;
          if (a.type === 'command') dailyData[key].commands++;
          dailyData[key].total++;
        }
      });

      const sorted = Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]));
      const chartData = sorted.slice(-14);

      const maxVal = Math.max(...chartData.map(([, d]) => d.total), 1);
      const chart = chartData.map(([date, d]) => {
        const barLen = Math.min(10, Math.floor((d.total / maxVal) * 10));
        const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
        const dayLabel = new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `\`${dayLabel}\` ${bar} **${d.total}**`;
      }).join('\n');

      const totalMessages = activities.filter(a => a.type === 'message').length;
      const totalCommands = activities.filter(a => a.type === 'command').length;

      const embed = await createCustomEmbed(interaction, {
        title: '📈 Macroscopic Engagement Dashboard',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Sector Metabolic Visualization\nTracing metabolic engagement density and operational throughput for the **${interaction.guild.name}** sector. Current capture: **${days} Days**.`,
        fields: [
          { name: '📊 14-Day Trailing Engagement', value: chart || '*No metabolic signals detected.*', inline: false },
          { name: '📡 Total Throughput', value: `\`${totalMessages.toLocaleString()}\` Msgs`, inline: true },
          { name: '✅ Total Pings', value: `\`${totalCommands.toLocaleString()}\` Cmds`, inline: true },
          { name: '⚖️ Capture Vector', value: `\`${days} Days\``, inline: true }
        ],
        footer: 'Strategic Engagement Modeling • V5 Executive Suite',
        color: 'enterprise'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Engagement Chart Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Engagement Intelligence failure: Unable to decode metabolic throughput charts.')] });
    }
  }
};
