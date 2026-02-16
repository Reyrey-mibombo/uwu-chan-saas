const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_summary')
    .setDescription('View prediction summary')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze (default 30)').setMinValue(1).setMaxValue(90))
    .addUserOption(opt => opt.setName('user').setDescription('Filter by user (optional)')),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 30;
    const targetUser = interaction.options.getUser('user');
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = { guildId, type: 'prediction', createdAt: { $gte: startDate } };
    if (targetUser) query.userId = targetUser.id;

    const predictions = await Activity.find(query).sort({ createdAt: -1 });

    const total = predictions.length;
    const recent = predictions.slice(0, 5);
    const successCount = predictions.filter(p => p.data?.success).length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : 0;

    const userStats = {};
    predictions.forEach(p => {
      userStats[p.userId] = (userStats[p.userId] || 0) + 1;
    });
    const topPredictors = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topPredictorNames = await Promise.all(
      topPredictors.map(async ([userId, count]) => {
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        return `${user?.username || 'Unknown'}: ${count}`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle('🔮 Prediction Summary')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Predictions', value: `${total}`, inline: true },
        { name: 'Success Rate', value: `${successRate}%`, inline: true }
      );

    if (topPredictorNames.length > 0) {
      embed.addFields({ name: 'Top Predictors', value: topPredictorNames.join('\n'), inline: false });
    }

    if (recent.length > 0) {
      const recentList = recent.map((p, i) => {
        const date = new Date(p.createdAt).toLocaleDateString();
        const status = p.data?.success ? '✅' : '❌';
        return `${i + 1}. ${date} ${status}`;
      }).join('\n');
      embed.addFields({ name: 'Recent Predictions', value: recentList, inline: false });
    }

    if (targetUser) {
      embed.setDescription(`Summary for: **${targetUser.username}**`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
