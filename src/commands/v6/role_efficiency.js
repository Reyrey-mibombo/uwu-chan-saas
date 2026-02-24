const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_efficiency')
    .setDescription('Compare performance efficiency across different staff ranks'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({}).lean();

    if (!users.length) {
      return interaction.editReply('📊 No staff data found yet.');
    }

    const rankGroups = {};
    users.forEach(u => {
      const rank = u.staff?.rank || 'member';
      if (!rankGroups[rank]) rankGroups[rank] = { totalPoints: 0, totalConsistency: 0, count: 0 };
      rankGroups[rank].totalPoints += u.staff?.points || 0;
      rankGroups[rank].totalConsistency += u.staff?.consistency || 100;
      rankGroups[rank].count++;
    });

    const rankOrder = ['owner', 'admin', 'manager', 'senior', 'staff', 'trial', 'member'];
    const sortedRanks = Object.entries(rankGroups).sort((a, b) => {
      const ia = rankOrder.indexOf(a[0]);
      const ib = rankOrder.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const allAvgPoints = sortedRanks.map(([, g]) => g.totalPoints / g.count);
    const maxAvg = Math.max(...allAvgPoints, 1);

    const fields = sortedRanks.map(([rank, g]) => {
      const avgPts = (g.totalPoints / g.count).toFixed(1);
      const avgCon = (g.totalConsistency / g.count).toFixed(1);
      const bar = '▓'.repeat(Math.round((g.totalPoints / g.count / maxAvg) * 8)) + '░'.repeat(8 - Math.round((g.totalPoints / g.count / maxAvg) * 8));
      return {
        name: `🎖️ ${rank.charAt(0).toUpperCase() + rank.slice(1)} (${g.count} staff)`,
        value: `Points avg: \`${bar}\` **${avgPts}** | Consistency: **${avgCon}%**`,
        inline: false
      };
    });

    const embed = new EmbedBuilder()
      .setTitle('🎖️ Role Efficiency Analysis')
      .setColor(0x27ae60)
      .addFields(fields)
      .setFooter({ text: `${interaction.guild.name} • Role Efficiency` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
