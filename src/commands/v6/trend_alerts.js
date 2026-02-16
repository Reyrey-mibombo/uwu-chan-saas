const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_alerts')
    .setDescription('View and configure trend alerts')
    .addIntegerOption(opt => opt.setName('threshold').setDescription('Alert threshold %').setMinValue(5).setMaxValue(50).setDefaultValue(20)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const threshold = interaction.options.getInteger('threshold') || 20;
    const days = 14;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const dailyData = {};
    activities.forEach(act => {
      const day = act.createdAt.toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + 1;
    });

    const sortedDays = Object.keys(dailyData).sort();
    const firstHalf = sortedDays.slice(0, Math.floor(sortedDays.length / 2));
    const secondHalf = sortedDays.slice(Math.floor(sortedDays.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + dailyData[d], 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((sum, d) => sum + dailyData[d], 0) / (secondHalf.length || 1);
    
    const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100) : 0;
    const isAlert = Math.abs(changePercent) >= threshold;
    
    const alertStatus = isAlert 
      ? (changePercent > 0 ? '📈 Spike Detected!' : '📉 Drop Detected!')
      : '✅ Within Normal Range';

    const embed = new EmbedBuilder()
      .setTitle('📊 Trend Alerts')
      .setColor(isAlert ? 0xe74c3c : 0x2ecc71)
      .addFields(
        { name: 'Alert Status', value: alertStatus, inline: true },
        { name: 'Change', value: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`, inline: true },
        { name: 'Threshold', value: `±${threshold}%`, inline: true },
        { name: 'First Half Avg', value: firstAvg.toFixed(1), inline: true },
        { name: 'Second Half Avg', value: secondAvg.toFixed(1), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
