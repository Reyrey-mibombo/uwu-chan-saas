const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_graph')
    .setDescription('View activity graph for the server')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 7)').setMinValue(1).setMaxValue(30)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 7;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const dailyCounts = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyCounts[key] = 0;
    }

    activities.forEach(a => {
      const key = a.createdAt.toISOString().split('T')[0];
      if (dailyCounts[key] !== undefined) {
        dailyCounts[key]++;
      }
    });

    const entries = Object.entries(dailyCounts).reverse();
    const maxVal = Math.max(...Object.values(dailyCounts), 1);
    const graph = entries.map(([date, count]) => {
      const barLen = Math.round((count / maxVal) * 10);
      const bar = '▓'.repeat(barLen) + '░'.repeat(10 - barLen);
      return `${date.slice(5)}: ${bar} ${count}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📈 Activity Graph')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${activities.length}`, inline: true }
      )
      .addFields({ name: 'Daily Activity', value: graph || 'No activity', inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
