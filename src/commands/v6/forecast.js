const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('forecast')
    .setDescription('View activity forecast')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to forecast').setMinValue(7).setMaxValue(60).setDefaultValue(14)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const forecastDays = interaction.options.getInteger('days') || 14;
    const historyDays = Math.min(forecastDays * 2, 60);
    
    const startDate = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const dailyData = {};
    activities.forEach(act => {
      const day = act.createdAt.toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + 1;
    });

    const sortedDays = Object.keys(dailyData).sort();
    const recentDays = sortedDays.slice(-Math.floor(historyDays / 2));
    const values = recentDays.map(d => dailyData[d]);
    
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;
    
    const forecast = Math.round(avg + (trend * forecastDays / 2));
    const confidence = Math.max(0, 100 - Math.abs(trend) * 10);

    const embed = new EmbedBuilder()
      .setTitle('🔮 Activity Forecast')
      .setColor(0x8e44ad)
      .addFields(
        { name: 'Predicted Activity', value: forecast.toString(), inline: true },
        { name: 'Avg Historical', value: avg.toFixed(1), inline: true },
        { name: 'Trend Factor', value: trend > 0 ? '📈 Up' : trend < 0 ? '📉 Down' : '➡️ Flat', inline: true },
        { name: 'Confidence', value: `${confidence.toFixed(0)}%`, inline: true },
        { name: 'Forecast Period', value: `${forecastDays} days`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
