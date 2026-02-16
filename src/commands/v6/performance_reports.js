const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_reports')
    .setDescription('View staff performance reports')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setMinValue(7).setMaxValue(90).setDefaultValue(30)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await User.find({ 'guilds.guildId': guildId, 'staff.rank': { $ne: 'member' } });
    
    const staffPerformance = users.map(u => ({
      userId: u.userId,
      points: u.staff?.points || 0,
      consistency: u.staff?.consistency || 0,
      warnings: u.staff?.warnings || 0,
      shiftTime: u.staff?.shiftTime || 0
    })).sort((a, b) => b.points - a.points).slice(0, 10);

    const totalPoints = staffPerformance.reduce((sum, u) => sum + u.points, 0);
    const avgConsistency = staffPerformance.length > 0 
      ? staffPerformance.reduce((sum, u) => sum + u.consistency, 0) / staffPerformance.length 
      : 0;

    const leaderboard = staffPerformance.length > 0
      ? staffPerformance.map((u, i) => `${i + 1}. <@${u.userId}> - ${u.points}pts (${u.consistency.toFixed(0)}%)`).join('\n')
      : 'No staff data available';

    const embed = new EmbedBuilder()
      .setTitle('📊 Performance Reports')
      .setColor(0x3498db)
      .addFields(
        { name: 'Staff Count', value: users.length.toString(), inline: true },
        { name: 'Total Points', value: totalPoints.toString(), inline: true },
        { name: 'Avg Consistency', value: `${avgConsistency.toFixed(1)}%`, inline: true },
        { name: 'Leaderboard', value: leaderboard, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
