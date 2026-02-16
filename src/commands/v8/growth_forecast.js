const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_forecast')
    .setDescription('View growth forecast based on activity trends')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze (default 30)').setMinValue(7).setMaxValue(90)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 30;
    const guildId = interaction.guild.id;
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const midDate = new Date();
    midDate.setDate(midDate.getDate() - days / 2);

    const firstHalf = await Activity.countDocuments({
      guildId,
      createdAt: { $gte: startDate, $lt: midDate }
    });
    const secondHalf = await Activity.countDocuments({
      guildId,
      createdAt: { $gte: midDate, $lte: now }
    });

    const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1) : 0;
    const trend = growthRate > 0 ? '📈' : growthRate < 0 ? '📉' : '➡️';
    const projection = secondHalf * (1 + growthRate / 100);

    const userCount = await User.countDocuments({ 'guilds.guildId': guildId });
    const newUsers = await User.countDocuments({
      'guilds.guildId': guildId,
      createdAt: { $gte: startDate }
    });

    const embed = new EmbedBuilder()
      .setTitle('📈 Growth Forecast')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Analysis Period', value: `Last ${days} days`, inline: true },
        { name: 'First Half Activities', value: `${firstHalf}`, inline: true },
        { name: 'Second Half Activities', value: `${secondHalf}`, inline: true },
        { name: 'Growth Rate', value: `${trend} ${growthRate}%`, inline: true },
        { name: 'Projected Next Period', value: `${Math.round(projection)} activities`, inline: true },
        { name: 'Total Guild Members', value: `${userCount}`, inline: true },
        { name: 'New Members (Period)', value: `${newUsers}`, inline: true }
      );

    const outlook = growthRate > 10 ? 'Excellent growth trend!' : growthRate > 0 ? 'Positive growth trend.' : growthRate > -10 ? 'Slight decline.' : 'Declining activity - consider promotions/events.';
    embed.setDescription(outlook);

    await interaction.reply({ embeds: [embed] });
  }
};
