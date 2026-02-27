const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trend_report')
    .setDescription('View trend report')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [currentWeek, lastWeek, currentMonth, lastMonth] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Activity.find({
        guildId,
        createdAt: {
          $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }),
      Activity.find({ guildId, createdAt: { $gte: startDate } }),
      Activity.find({
        guildId,
        createdAt: {
          $gte: new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000),
          $lt: startDate
        }
      })
    ]);

    const weekChange = lastWeek.length > 0
      ? ((currentWeek.length - lastWeek.length) / lastWeek.length * 100).toFixed(1)
      : 0;
    const monthChange = lastMonth.length > 0
      ? ((currentMonth.length - lastMonth.length) / lastMonth.length * 100).toFixed(1)
      : 0;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📈 Trend Report')
      
      .addFields(
        { name: 'This Week', value: `${currentWeek.length} activities`, inline: true },
        { name: 'Last Week', value: `${lastWeek.length} activities`, inline: true },
        { name: 'Weekly Change', value: `${weekChange > 0 ? '+' : ''}${weekChange}%`, inline: true },
        { name: 'This Month', value: `${currentMonth.length} activities`, inline: true },
        { name: 'Last Month', value: `${lastMonth.length} activities`, inline: true },
        { name: 'Monthly Change', value: `${monthChange > 0 ? '+' : ''}${monthChange}%`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
