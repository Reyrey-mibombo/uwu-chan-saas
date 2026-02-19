const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_heatmap')
    .setDescription('View activity heatmap')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 30)').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const heatmap = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      heatmap[key] = 0;
    }

    activities.forEach(a => {
      const key = a.createdAt.toISOString().split('T')[0];
      if (heatmap[key] !== undefined) heatmap[key]++;
    });

    const sorted = Object.entries(heatmap).sort((a, b) => b[0].localeCompare(a[0]));
    const maxVal = Math.max(...Object.values(heatmap), 1);
    const total = activities.length;
    const avgPerDay = (total / days).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('🔥 Activity Heatmap')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Total Activities', value: total.toString(), inline: true },
        { name: 'Days Tracked', value: days.toString(), inline: true },
        { name: 'Avg/Day', value: avgPerDay.toString(), inline: true }
      )
      .setDescription(sorted.slice(0, 14).map(([date, count]) => {
        const intensity = Math.min(5, Math.floor((count / maxVal) * 5));
        const bars = '▓'.repeat(intensity) + '░'.repeat(5 - intensity);
        return `${date}: ${bars} ${count}`;
      }).join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
