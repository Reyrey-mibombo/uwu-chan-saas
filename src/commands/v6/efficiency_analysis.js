const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('efficiency_analysis')
    .setDescription('Analyze user and staff efficiency')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setMinValue(7).setMaxValue(90)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await User.find({ 'guilds.guildId': guildId, 'staff.rank': { $ne: 'member' } });
    
    let totalConsistency = 0;
    let totalPoints = 0;
    let staffWithShifts = 0;
    
    users.forEach(u => {
      if (u.staff) {
        totalConsistency += u.staff.consistency || 0;
        totalPoints += u.staff.points || 0;
        if (u.staff.shiftTime > 0) staffWithShifts++;
      }
    });

    const avgConsistency = users.length > 0 ? totalConsistency / users.length : 0;
    const avgPoints = users.length > 0 ? totalPoints / users.length : 0;
    const efficiencyScore = Math.round(avgConsistency * 0.6 + Math.min(100, avgPoints / 10) * 0.4);

    const recentActivity = await Activity.countDocuments({ guildId, createdAt: { $gte: startDate } });
    const activityRate = users.length > 0 ? recentActivity / users.length : 0;

    const embed = new EmbedBuilder()
      .setTitle('⚡ Efficiency Analysis')
      .setColor(0x3498db)
      .addFields(
        { name: 'Efficiency Score', value: `${efficiencyScore}/100`, inline: true },
        { name: 'Avg Consistency', value: `${avgConsistency.toFixed(1)}%`, inline: true },
        { name: 'Avg Points', value: avgPoints.toFixed(0), inline: true },
        { name: 'Staff Count', value: users.length.toString(), inline: true },
        { name: 'Activity Rate', value: activityRate.toFixed(1), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
