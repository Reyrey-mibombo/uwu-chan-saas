const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_summary')
    .setDescription('View analytics summary for the server')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze (default 30)').setMinValue(1).setMaxValue(90)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 30;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    const total = activities.length;

    const uniqueUsers = new Set(activities.map(a => a.userId)).size;

    const typeBreakdown = {};
    activities.forEach(a => {
      typeBreakdown[a.type] = (typeBreakdown[a.type] || 0) + 1;
    });

    const avgPerDay = (total / days).toFixed(1);
    const avgPerUser = uniqueUsers > 0 ? (total / uniqueUsers).toFixed(1) : 0;

    const embed = new EmbedBuilder()
      .setTitle('📈 Analytics Summary')
      .setColor(0x1abc9c)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${total}`, inline: true },
        { name: 'Active Users', value: `${uniqueUsers}`, inline: true },
        { name: 'Avg/Day', value: avgPerDay, inline: true },
        { name: 'Avg/User', value: avgPerUser, inline: true }
      );

    const typeList = Object.entries(typeBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => `${type}: ${count}`)
      .join('\n');

    if (typeList) {
      embed.addFields({ name: 'Top Activity Types', value: typeList, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
