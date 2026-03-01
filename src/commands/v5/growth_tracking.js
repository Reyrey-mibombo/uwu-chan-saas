const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_tracking')
    .setDescription('Track server growth metrics with macroscopic intelligence'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const guild = interaction.guild;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const thisWeek = await Activity.find({ guildId, createdAt: { $gte: weekAgo } }).lean();
      const lastWeek = await Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }).lean();

      const thisWeekMessages = thisWeek.filter(a => a.type === 'message').length;
      const lastWeekMessages = lastWeek.filter(a => a.type === 'message').length;

      const newMembers = guild.members.cache.filter(m => m.joinedAt && m.joinedAt >= weekAgo).size;
      const activeUsers = new Set(thisWeek.map(a => a.userId)).size;

      const growth = lastWeekMessages > 0
        ? ((thisWeekMessages - lastWeekMessages) / lastWeekMessages * 100).toFixed(1)
        : (thisWeekMessages > 0 ? 100 : 0);

      const growthStatus = growth > 0 ? '📈 POSITIVE' : (growth < 0 ? '📉 NEGATIVE' : '➖ STABLE');
      const growthColor = growth > 0 ? 'success' : (growth < 0 ? 'premium' : 'primary');

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Macroscopic Growth Engine',
        thumbnail: guild.iconURL({ dynamic: true }),
        description: `### 🚀 Sector Expansion Intelligence\nAnalyzing macroscopic growth vectors and signal density for the **${guild.name}** sector. Cross-referencing 7-day trailing footprints.`,
        fields: [
          { name: '👥 Workforce Expansion', value: `\`+${newMembers}\` New Nodes`, inline: true },
          { name: '📡 Message Throughput', value: `\`${thisWeekMessages.toLocaleString()}\` Signals`, inline: true },
          { name: '🌐 Active Operatives', value: `\`${activeUsers}\` Reached`, inline: true },
          { name: '📈 Growth Trajectory', value: `**${growthStatus} (${growth}%)**`, inline: false },
          { name: '🛡️ Sector Status', value: '`🔵 OPTIMIZED` | `Executive V5 Tier`', inline: true }
        ],
        footer: 'Executive Intelligence Matrix • V5 Executive Suite',
        color: growthColor
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Growth Tracking Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Growth Intelligence failure: Unable to decode macroscopic expansion vectors.')] });
    }
  }
};
