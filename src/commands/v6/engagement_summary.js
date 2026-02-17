const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_summary')
    .setDescription('View engagement summary for this server')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setMinValue(1).setMaxValue(90)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const uniqueUsers = new Set(activities.map(a => a.userId)).size;
    const typeBreakdown = {};
    activities.forEach(act => {
      typeBreakdown[act.type] = (typeBreakdown[act.type] || 0) + 1;
    });

    const engagementLevel = uniqueUsers > 50 ? 'High' : uniqueUsers > 20 ? 'Medium' : 'Low';
    const engagementEmoji = engagementLevel === 'High' ? '🔥' : engagementLevel === 'Medium' ? '📊' : '📉';

    const embed = new EmbedBuilder()
      .setTitle('📋 Engagement Summary')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Engagement Level', value: `${engagementEmoji} ${engagementLevel}`, inline: true },
        { name: 'Total Activities', value: activities.length.toString(), inline: true },
        { name: 'Unique Users', value: uniqueUsers.toString(), inline: true },
        { name: 'Period', value: `${days} days`, inline: true },
        { name: 'Avg/Day', value: (activities.length / days).toFixed(1), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
