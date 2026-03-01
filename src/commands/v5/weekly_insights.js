const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_insights')
    .setDescription('Sector Periodic Intelligence Report'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const [thisWeek, lastWeek] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: weekAgo } }).lean(),
        Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }).lean()
      ]);

      const processWeek = (activities) => {
        const stats = { message: 0, command: 0, shift: 0, warning: 0 };
        activities.forEach(a => { if (stats[a.type] !== undefined) stats[a.type]++; });
        return { ...stats, activeUsers: new Set(activities.map(a => a.userId)).size };
      };

      const curr = processWeek(thisWeek);
      const prev = processWeek(lastWeek);

      const getTrajectory = (c, p) => {
        if (p === 0) return c > 0 ? '📈 GROWTH (NEW)' : '➖ STABLE';
        const pct = ((c - p) / p * 100).toFixed(1);
        if (pct > 5) return `📈 +${pct}% GROWTH`;
        if (pct < -5) return `📉 ${pct}% DECAY`;
        return '➖ STABLE';
      };

      const embed = await createCustomEmbed(interaction, {
        title: '💡 Sector Periodic Intelligence',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Performance Delta\nStrategic comparison of the current 7-day vector against the previous 14-day baseline for sector **${interaction.guild.name}**.`,
        fields: [
          { name: '📡 Signal Throughput', value: `\`${curr.message}\` | **${getTrajectory(curr.message, prev.message)}**`, inline: false },
          { name: '✅ Command Execution', value: `\`${curr.command}\` | **${getTrajectory(curr.command, prev.command)}**`, inline: false },
          { name: '🔄 Operational Shifts', value: `\`${curr.shift}\` | **${getTrajectory(curr.shift, prev.shift)}**`, inline: false },
          { name: '⚠️ Security Incidents', value: `\`${curr.warning}\` | **${getTrajectory(curr.warning, prev.warning)}**`, inline: false },
          { name: '👥 Active Operatives', value: `\`${curr.activeUsers}\` | **${getTrajectory(curr.activeUsers, prev.activeUsers)}**`, inline: false }
        ],
        footer: 'Periodic Intelligence Comparison • V5 Executive Suite',
        color: 'enterprise'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Weekly Insights Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Periodic Intelligence failure: Unable to synchronize comparison matrices.')] });
    }
  }
};
