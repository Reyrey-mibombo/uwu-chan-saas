const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('optimization_report')
    .setDescription('View server optimization recommendations')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setMinValue(7).setMaxValue(90)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    const users = await User.find({ 'guilds.guildId': guildId });

    const dailyActivity = {};
    activities.forEach(act => {
      const day = act.createdAt.toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });

    const activeDays = Object.keys(dailyActivity).length;
    const utilization = (activeDays / days * 100).toFixed(1);
    
    const typeCounts = {};
    activities.forEach(act => {
      typeCounts[act.type] = (typeCounts[act.type] || 0) + 1;
    });

    const recommendations = [];
    if (utilization < 50) recommendations.push('• Low server utilization - review engagement strategies');
    if (typeCounts.warning > typeCounts.promotion * 2) recommendations.push('• High warning ratio - review moderation approach');
    if (users.length > 100 && activities.length / users.length < 1) recommendations.push('• Low per-user activity - encourage participation');
    if (recommendations.length === 0) recommendations.push('• Server is performing optimally');

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Optimization Report')
      .setColor(0xe67e22)
      .addFields(
        { name: 'Utilization', value: `${utilization}%`, inline: true },
        { name: 'Active Days', value: `${activeDays}/${days}`, inline: true },
        { name: 'Total Activities', value: activities.length.toString(), inline: true },
        { name: 'Recommendations', value: recommendations.join('\n'), inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
