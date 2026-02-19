const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_graph')
    .setDescription('View prediction trend graph')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to show (default 7)').setMinValue(1).setMaxValue(30))
    .addStringOption(opt => opt.setName('type').setDescription('Prediction type').addChoices(
      { name: 'Growth', value: 'growth' },
      { name: 'Performance', value: 'performance' },
      { name: 'Activity', value: 'activity' }
    )),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 7;
    const type = interaction.options.getString('type') || 'activity';
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const predictions = await Activity.find({
      guildId,
      type: 'prediction',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const grouped = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      grouped[key] = 0;
    }

    predictions.forEach(p => {
      const key = p.createdAt.toISOString().split('T')[0];
      if (grouped[key] !== undefined) {
        grouped[key]++;
      }
    });

    const dataPoints = Object.entries(grouped);
    const maxVal = Math.max(...Object.values(grouped), 1);
    const graphLines = dataPoints.map(([date, val]) => {
      const bar = '█'.repeat(Math.ceil((val / maxVal) * 10));
      return `${date.slice(5)} | ${bar.padEnd(10)} ${val}`;
    }).join('\n');

    const total = predictions.length;
    const avgPerDay = (total / days).toFixed(1);
    const trend = predictions.length > 5 ? '📈 Upward' : predictions.length > 0 ? '➡️ Stable' : '📉 No data';

    const embed = new EmbedBuilder()
      .setTitle('📈 Prediction Graph')
      .setColor(0x3498db)
      .setDescription(`\`\`\`\n${graphLines}\n\`\`\``)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Predictions', value: `${total}`, inline: true },
        { name: 'Avg/Day', value: avgPerDay, inline: true },
        { name: 'Trend', value: trend, inline: true },
        { name: 'Type', value: type.toUpperCase(), inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
