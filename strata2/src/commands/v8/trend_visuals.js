const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_visuals')
    .setDescription('View activity trend visuals')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 30)').setMinValue(7).setMaxValue(90)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trends = await Activity.aggregate([
      { $match: { guildId: interaction.guildId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x32CD32)
      .setTitle('Activity Trends')
      .setDescription(`Last ${days} days`)
      .addFields(
        { name: 'Total Activity', value: `${trends.reduce((s, t) => s + t.count, 0)}`, inline: true },
        { name: 'Days Tracked', value: `${trends.length}`, inline: true },
        { name: 'Avg/Day', value: `${Math.round(trends.reduce((s, t) => s + t.count, 0) / Math.max(trends.length, 1))}`, inline: true }
      );

    if (trends.length > 0) {
      const max = Math.max(...trends.map(t => t.count));
      const visual = trends.slice(-7).map(t => {
        const bar = '█'.repeat(Math.max(1, Math.ceil((t.count / max) * 10)));
        return `${t._id.slice(5)}: ${bar}`;
      }).join('\n');
      embed.addFields({ name: 'Last 7 Days', value: visual });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
