const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_forecast')
    .setDescription('View weekly activity forecast'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const historyDays = 21;
    const startDate = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const dailyData = {};
    activities.forEach(act => {
      const day = act.createdAt.toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + 1;
    });

    const sortedDays = Object.keys(dailyData).sort();
    const week1 = sortedDays.slice(0, 7);
    const week2 = sortedDays.slice(7, 14);
    const week3 = sortedDays.slice(14, 21);
    
    const w1 = week1.reduce((sum, d) => sum + dailyData[d], 0);
    const w2 = week2.reduce((sum, d) => sum + dailyData[d], 0);
    const w3 = week3.reduce((sum, d) => sum + dailyData[d], 0);
    
    const avg = (w1 + w2 + w3) / 3;
    const trend = (w3 - w1) / 3;
    const forecast = Math.round(avg + trend);

    const direction = trend > 0.5 ? '📈 Upward' : trend < -0.5 ? '📉 Downward' : '➡️ Stable';
    const confidence = Math.max(50, 100 - Math.abs(trend) * 10);

    const embed = new EmbedBuilder()
      .setTitle('📅 Weekly Forecast')
      .setColor(0x3498db)
      .addFields(
        { name: 'This Week (Pred.)', value: forecast.toString(), inline: true },
        { name: 'Trend', value: direction, inline: true },
        { name: '3-Week Avg', value: avg.toFixed(1), inline: true },
        { name: 'Confidence', value: `${confidence.toFixed(0)}%`, inline: true },
        { name: 'Last Week', value: w3.toString(), inline: true },
        { name: 'Week Before', value: w2.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
