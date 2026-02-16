const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_dashboard')
    .setDescription('View interactive dashboard with real-time stats')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)'))
    .addStringOption(opt => opt.setName('metric').setDescription('Metric to display')
      .addChoices(
        { name: 'Activity', value: 'activity' },
        { name: 'Commands', value: 'command' },
        { name: 'Messages', value: 'message' },
        { name: 'Shifts', value: 'shift' },
        { name: 'Promotions', value: 'promotion' }
      )),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const metric = interaction.options.getString('metric') || 'activity';
    const guildId = interaction.guild.id;
    const days = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = { guildId, createdAt: { $gte: startDate } };
    if (targetUser) query.userId = targetUser.id;

    const activities = await Activity.find(query).sort({ createdAt: -1 });

    const typeCounts = {};
    activities.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });

    const totalActivities = activities.length;
    const uniqueUsers = new Set(activities.map(a => a.userId)).size;
    const avgPerDay = (totalActivities / days).toFixed(1);

    const topUsers = await Activity.aggregate([
      { $match: { guildId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Interactive Dashboard - ${metric.charAt(0).toUpperCase() + metric.slice(1)}`)
      .setColor(0x1abc9c)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Activities', value: `${totalActivities}`, inline: true },
        { name: 'Active Users', value: `${uniqueUsers}`, inline: true },
        { name: 'Avg/Day', value: `${avgPerDay}`, inline: true }
      );

    if (Object.keys(typeCounts).length > 0) {
      const typeList = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `${type}: ${count}`)
        .join('\n');
      embed.addFields({ name: 'Activity Types', value: typeList, inline: false });
    }

    if (topUsers.length > 0) {
      const topList = topUsers.map((u, i) => `${i + 1}. User ${u._id}: ${u.count}`).join('\n');
      embed.addFields({ name: 'Top Contributors', value: topList, inline: false });
    }

    if (targetUser) {
      embed.setThumbnail(targetUser.displayAvatarURL());
    }

    await interaction.reply({ embeds: [embed] });
  }
};
