const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_chart')
    .setDescription('View activity prediction chart')
    .addIntegerOption(opt => opt.setName('days').setDescription('Historical days').setMinValue(14).setMaxValue(60)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const dailyData = {};
    activities.forEach(act => {
      const day = act.createdAt.toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + 1;
    });

    const sortedDays = Object.keys(dailyData).sort();
    const recentValues = sortedDays.slice(-7).map(d => dailyData[d]);
    const avgRecent = recentValues.length > 0 ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length : 0;
    
    const trend = recentValues.length > 1 ? (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length : 0;
    const prediction = avgRecent + trend * 7;
    
    const direction = trend > 0.5 ? '📈 Bullish' : trend < -0.5 ? '📉 Bearish' : '➡️ Stable';
    const confidence = Math.max(60, 100 - Math.abs(trend) * 15);

    const embed = new EmbedBuilder()
      .setTitle('📈 Prediction Chart')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Current Trend', value: direction, inline: true },
        { name: '7-Day Avg', value: avgRecent.toFixed(1), inline: true },
        { name: 'Next Week Pred.', value: Math.round(prediction).toString(), inline: true },
        { name: 'Confidence', value: `${confidence.toFixed(0)}%`, inline: true },
        { name: 'Data Points', value: activities.length.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
