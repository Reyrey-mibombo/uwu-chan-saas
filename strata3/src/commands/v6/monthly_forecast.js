const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_forecast')
    .setDescription('View monthly activity forecast'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = 60;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const dailyData = {};
    activities.forEach(act => {
      const day = act.createdAt.toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + 1;
    });

    const sortedDays = Object.keys(dailyData).sort();
    const values = sortedDays.map(d => dailyData[d]);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    
    const weeklyAvg = values.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const monthlyForecast = Math.round(weeklyAvg * 30);
    const growth = values.length > 7 ? ((weeklyAvg - avg) / avg * 100) : 0;

    const embed = new EmbedBuilder()
      .setTitle('📅 Monthly Forecast')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Predicted Monthly Total', value: monthlyForecast.toString(), inline: true },
        { name: 'Daily Average', value: avg.toFixed(1), inline: true },
        { name: 'Weekly Average', value: weeklyAvg.toFixed(1), inline: true },
        { name: 'Growth Rate', value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
