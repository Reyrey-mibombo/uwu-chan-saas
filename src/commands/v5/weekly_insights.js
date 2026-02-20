const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_insights')
    .setDescription('View weekly insights'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: weekAgo } }),
      Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } })
    ]);

    const thisWeekByType = { message: 0, command: 0, shift: 0, warning: 0 };
    thisWeek.forEach(a => { if (thisWeekByType[a.type] !== undefined) thisWeekByType[a.type]++; });

    const lastWeekByType = { message: 0, command: 0, shift: 0, warning: 0 };
    lastWeek.forEach(a => { if (lastWeekByType[a.type] !== undefined) lastWeekByType[a.type]++; });

    const thisWeekUsers = new Set(thisWeek.map(a => a.userId)).size;
    const lastWeekUsers = new Set(lastWeek.map(a => a.userId)).size;

    const getInsight = (curr, prev, type) => {
      if (prev === 0) return curr > 0 ? '📈 Increased' : '➖ No activity';
      const change = ((curr - prev) / prev * 100).toFixed(1);
      if (change > 10) return `📈 +${change}%`;
      if (change < -10) return `📉 ${change}%`;
      return '➡️ Stable';
    };

    const embed = new EmbedBuilder()
      .setTitle('💡 Weekly Insights')
      .setColor(0x16a085)
      .addFields(
        { name: 'Messages', value: getInsight(thisWeekByType.message, lastWeekByType.message, 'messages'), inline: true },
        { name: 'Commands', value: getInsight(thisWeekByType.command, lastWeekByType.command, 'commands'), inline: true },
        { name: 'Shifts', value: getInsight(thisWeekByType.shift, lastWeekByType.shift, 'shifts'), inline: true },
        { name: 'Warnings', value: getInsight(thisWeekByType.warning, lastWeekByType.warning, 'warnings'), inline: true },
        { name: 'Active Users', value: `${thisWeekUsers} (${getInsight(thisWeekUsers, lastWeekUsers, 'users')})`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
