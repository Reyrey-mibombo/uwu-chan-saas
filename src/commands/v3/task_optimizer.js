const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_optimizer')
    .setDescription('Optimize and analyze tasks')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period to analyze')
        .setRequired(false)
        .addChoices(
          { name: '7 Days', value: '7' },
          { name: '14 Days', value: '14' },
          { name: '30 Days', value: '30' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const period = parseInt(interaction.options.getString('period') || '14');

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - period);

    const activities = await Activity.find({
      guildId,
      type: { $in: ['command', 'message', 'warning'] },
      createdAt: { $gte: daysAgo }
    }).lean();

    const users = await User.find({
      'guilds.guildId': guildId,
      staff: { $exists: true }
    }).lean();

    const userActivityCounts = {};
    activities.forEach(a => {
      if (!userActivityCounts[a.userId]) {
        userActivityCounts[a.userId] = { commands: 0, messages: 0, warnings: 0, total: 0 };
      }
      if (a.type === 'command') userActivityCounts[a.userId].commands++;
      if (a.type === 'message') userActivityCounts[a.userId].messages++;
      if (a.type === 'warning') userActivityCounts[a.userId].warnings++;
      userActivityCounts[a.userId].total++;
    });

    const userStats = users.map(u => {
      const activity = userActivityCounts[u.userId] || { commands: 0, messages: 0, warnings: 0, total: 0 };
      return {
        userId: u.userId,
        username: u.username,
        rank: u.staff?.rank || 'member',
        points: u.staff?.points || 0,
        ...activity
      };
    });

    const sortedByActivity = [...userStats].sort((a, b) => b.total - a.total);
    const sortedByEfficiency = userStats
      .map(u => ({
        ...u,
        efficiency: u.warnings > 0 ? (u.commands / u.warnings) : u.commands || 0
      }))
      .sort((a, b) => b.efficiency - a.efficiency);

    const embed = new EmbedBuilder()
      .setTitle('🎯 Task Optimizer')
      .setColor(0x9b59b6)
      .setDescription(`Task analysis for the last ${period} days`);

    embed.addFields(
      { name: 'Total Commands', value: activities.filter(a => a.type === 'command').length.toString(), inline: true },
      { name: 'Total Messages', value: activities.filter(a => a.type === 'message').length.toString(), inline: true },
      { name: 'Total Warnings', value: activities.filter(a => a.type === 'warning').length.toString(), inline: true }
    );

    if (sortedByActivity.length > 0) {
      const topActive = sortedByActivity.slice(0, 5).map(u => `${u.username}: ${u.total} actions`);
      embed.addFields({ name: 'Most Active', value: topActive.join('\n'), inline: false });
    }

    if (sortedByEfficiency.length > 0) {
      const topEfficient = sortedByEfficiency.slice(0, 5).map(u => `${u.username}: ${u.efficiency.toFixed(1)} ratio`);
      embed.addFields({ name: 'Most Efficient', value: topEfficient.join('\n'), inline: false });
    }

    const suggestions = generateTaskSuggestions(userStats, period);
    embed.addFields({ name: '💡 Suggestions', value: suggestions, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};

function generateTaskSuggestions(userStats, period) {
  const suggestions = [];

  const inactive = userStats.filter(u => u.total === 0);
  if (inactive.length > 0) {
    suggestions.push(`${inactive.length} staff members have no activity - check in with them`);
  }

  const highWarning = userStats.filter(u => u.warnings > 5);
  if (highWarning.length > 0) {
    suggestions.push(`Staff with high warnings: ${highWarning.slice(0, 3).map(u => u.username).join(', ')}`);
  }

  const lowActivity = userStats.filter(u => u.total > 0 && u.total < period / 3);
  if (lowActivity.length > 0) {
    suggestions.push(`Consider mentoring: ${lowActivity.slice(0, 3).map(u => u.username).join(', ')}`);
  }

  return suggestions.length > 0 ? suggestions.join('\n') : 'Team is performing well!';
}
