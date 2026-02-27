const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_reports')
    .setDescription('Generate a full performance report for all staff'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [users, shifts, warnings] = await Promise.all([
      User.find({}).lean(),
      Shift.find({ guildId, startTime: { $gte: thirtyDaysAgo } }).lean(),
      Warning.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean()
    ]);

    if (!users.length) {
      return interaction.editReply('📊 No staff data found yet.');
    }

    const completedShifts = shifts.filter(s => s.endTime).length;
    const shiftRate = shifts.length > 0 ? ((completedShifts / shifts.length) * 100).toFixed(1) : '0';
    const totalPoints = users.reduce((s, u) => s + (u.staff?.points || 0), 0);
    const avgPoints = (totalPoints / users.length).toFixed(1);
    const avgConsistency = (users.reduce((s, u) => s + (u.staff?.consistency || 100), 0) / users.length).toFixed(1);

    const top3 = users.sort((a, b) => (b.staff?.points || 0) - (a.staff?.points || 0)).slice(0, 3);
    const topText = top3.map((u, i) => `\`${i + 1}\` **${u.username || 'Unknown'}** — ${u.staff?.points || 0} pts | ${u.staff?.rank || 'member'}`).join('\n');

    const rankDist = {};
    users.forEach(u => { const r = u.staff?.rank || 'member'; rankDist[r] = (rankDist[r] || 0) + 1; });
    const rankText = Object.entries(rankDist).map(([r, c]) => `${r}: **${c}**`).join(' | ');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📋 Staff Performance Report')
      
      .addFields(
        { name: '👥 Total Staff', value: users.length.toString(), inline: true },
        { name: '⭐ Total Points', value: totalPoints.toString(), inline: true },
        { name: '📊 Avg Points', value: avgPoints, inline: true },
        { name: '🔄 Shifts (30d)', value: shifts.length.toString(), inline: true },
        { name: '✅ Shift Completion', value: `${shiftRate}%`, inline: true },
        { name: '📈 Avg Consistency', value: `${avgConsistency}%`, inline: true },
        { name: '⚠️ Warnings (30d)', value: warnings.length.toString(), inline: true },
        { name: '🎖️ Rank Distribution', value: rankText || 'No data', inline: false },
        { name: '🏆 Top Performers', value: topText || 'No data' }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
