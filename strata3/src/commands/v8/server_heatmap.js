const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_heatmap')
    .setDescription('View server activity heatmap'),
  async execute(interaction) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const heatmap = await Activity.aggregate([
      { $match: { guildId: interaction.guildId, createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxCount = Math.max(...heatmap.map(h => h.count), 1);

    const embed = new EmbedBuilder()
      .setColor(0xFF4500)
      .setTitle('Server Activity Heatmap')
      .setDescription(heatmap.map(h => {
        const bar = '█'.repeat(Math.ceil((h.count / maxCount) * 10));
        return `${days[h._id - 1]}: ${bar} (${h.count})`;
      }).join('\n') || 'No activity data.')
      .setFooter({ text: 'Last 7 days' });

    await interaction.reply({ embeds: [embed] });
  }
};
