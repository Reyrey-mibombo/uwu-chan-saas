const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_insights')
    .setDescription('View activity insights for this server')
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('Number of days to analyze (7-90)')
        .setMinValue(7)
        .setMaxValue(90)
        .setRequired(false) // optional, default handled in code
    ),

  async execute(interaction) {
    try {
      const guildId = interaction.guildId;
      const days = interaction.options.getInteger('days') ?? 30;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await Activity.find({
        guildId,
        createdAt: { $gte: startDate }
      });

      const typeBreakdown = {};
      const userActivity = {};
      const dailyActivity = {};

      activities.forEach(act => {
        typeBreakdown[act.type] = (typeBreakdown[act.type] || 0) + 1;
        userActivity[act.userId] = (userActivity[act.userId] || 0) + 1;

        const dayKey = act.createdAt.toISOString().split('T')[0];
        dailyActivity[dayKey] = (dailyActivity[dayKey] || 0) + 1;
      });

      const totalActivities = activities.length;
      const avgDaily = days > 0 ? (totalActivities / days).toFixed(1) : "0.0";

      const topUser = Object.entries(userActivity)
        .sort((a, b) => b[1] - a[1])[0];

      const typeList = Object.entries(typeBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `${type}: ${count}`)
        .join('\n') || 'No activity data';

      const embed = new EmbedBuilder()
        .setTitle('📊 Activity Insights')
        .setColor(0x3498db)
        .addFields(
          { name: 'Total Activities', value: totalActivities.toString(), inline: true },
          { name: 'Avg Daily', value: avgDaily.toString(), inline: true },
          { name: 'Days Analyzed', value: days.toString(), inline: true },
          { name: 'Activity by Type', value: typeList, inline: false }
        )
        .setTimestamp();

      if (topUser) {
        embed.addFields({
          name: 'Most Active User',
          value: `<@${topUser[0]}> (${topUser[1]} activities)`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in activity_insights command:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: 'Something went wrong while fetching activity insights.',
          ephemeral: true
        });
      }
    }
  }
};