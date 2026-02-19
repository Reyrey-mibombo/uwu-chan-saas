const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('engagement_trends')
    .setDescription('View engagement trend analysis'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    const week1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const week2 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const week3 = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

    const w1 = await Activity.countDocuments({ guildId, createdAt: { $gte: week1 } });
    const w2 = await Activity.countDocuments({ guildId, createdAt: { $gte: week2, $lt: week1 } });
    const w3 = await Activity.countDocuments({ guildId, createdAt: { $gte: week3, $lt: week2 } });

    const avg = (w1 + w2 + w3) / 3;
    const trend = w1 > w2 ? '📈 Growing' : w1 < w2 ? '📉 Declining' : '➡️ Stable';
    const score = avg > 0 ? Math.min(100, Math.round((w1 / avg) * 50 + 50)) : 50;

    const prediction = score >= 70 ? 'Continue current strategy' :
                       score >= 50 ? 'Consider new engagement tactics' : 'Review server activity';

    const embed = new EmbedBuilder()
      .setTitle('📈 Engagement Trends')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Trend', value: trend, inline: true },
        { name: 'Score', value: `${score}/100`, inline: true },
        { name: 'This Week', value: w1.toString(), inline: true },
        { name: 'Last Week', value: w2.toString(), inline: true },
        { name: 'Prediction', value: prediction, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
