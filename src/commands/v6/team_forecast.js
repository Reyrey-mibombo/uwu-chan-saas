const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_forecast')
    .setDescription('Forecast team performance')
    .addIntegerOption(opt => opt.setName('days').setDescription('Forecast period').setMinValue(7).setMaxValue(30)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const forecastDays = interaction.options.getInteger('days') || 14;
    const historyDays = forecastDays * 2;
    const startDate = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);

    const users = await User.find({ 'guilds.guildId': guildId, 'staff.rank': { $ne: 'member' } });
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const userPoints = {};
    users.forEach(u => {
      userPoints[u.userId] = u.staff?.points || 0;
    });

    const recentActivities = activities.filter(a => a.createdAt > new Date(Date.now() - forecastDays * 24 * 60 * 60 * 1000));
    const olderActivities = activities.filter(a => a.createdAt <= new Date(Date.now() - forecastDays * 24 * 60 * 60 * 1000));
    
    const recentPerDay = recentActivities.length / forecastDays;
    const olderPerDay = olderActivities.length / forecastDays;
    
    const trend = recentPerDay - olderPerDay;
    const predictedActivity = Math.round(recentPerDay + trend);
    
    const totalPoints = users.reduce((sum, u) => sum + (u.staff?.points || 0), 0);
    const avgConsistency = users.length > 0 
      ? users.reduce((sum, u) => sum + (u.staff?.consistency || 0), 0) / users.length 
      : 0;

    const embed = new EmbedBuilder()
      .setTitle('👥 Team Forecast')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Predicted Activity', value: predictedActivity.toString(), inline: true },
        { name: 'Team Size', value: users.length.toString(), inline: true },
        { name: 'Total Points', value: totalPoints.toString(), inline: true },
        { name: 'Avg Consistency', value: `${avgConsistency.toFixed(1)}%`, inline: true },
        { name: 'Trend', value: trend > 0 ? '📈 Improving' : trend < 0 ? '📉 Declining' : '➡️ Stable', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
