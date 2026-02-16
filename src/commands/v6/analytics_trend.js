const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_trend')
    .setDescription('View analytics trend data')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setMinValue(7).setMaxValue(90).setDefaultValue(30)),

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
    const values = sortedDays.map(d => dailyData[d]);
    
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const recentAvg = values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, values.length);
    
    const trend = recentAvg > avg ? '📈 Upward' : recentAvg < avg ? '📉 Downward' : '➡️ Stable';
    const changePercent = avg > 0 ? ((recentAvg - avg) / avg * 100).toFixed(1) : 0;

    const embed = new EmbedBuilder()
      .setTitle('📊 Analytics Trend')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Trend Direction', value: trend, inline: true },
        { name: 'Change', value: `${changePercent}%`, inline: true },
        { name: 'Total Events', value: activities.length.toString(), inline: true },
        { name: 'Daily Average', value: avg.toFixed(1), inline: true },
        { name: 'Recent Average (7d)', value: recentAvg.toFixed(1), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
