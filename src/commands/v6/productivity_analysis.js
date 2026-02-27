const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('productivity_analysis')
    .setDescription('Analyze commands-per-shift-hour productivity for staff'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [shifts, activities] = await Promise.all([
      Shift.find({ guildId, endTime: { $ne: null }, startTime: { $gte: thirtyDaysAgo } }).lean(),
      Activity.find({ guildId, type: 'command', createdAt: { $gte: thirtyDaysAgo } }).lean()
    ]);

    if (!shifts.length) {
      return interaction.editReply('📊 No completed shift data found in the past 30 days.');
    }

    // Map commands per user
    const cmdMap = {};
    activities.forEach(a => { cmdMap[a.userId] = (cmdMap[a.userId] || 0) + 1; });

    // Map shift hours per user
    const shiftMap = {};
    shifts.forEach(s => {
      if (!shiftMap[s.userId]) shiftMap[s.userId] = { hours: 0, count: 0 };
      const dur = s.duration || (new Date(s.endTime) - new Date(s.startTime)) / 3600000;
      shiftMap[s.userId].hours += dur;
      shiftMap[s.userId].count++;
    });

    const productivity = Object.entries(shiftMap)
      .map(([uid, data]) => ({
        uid,
        hours: data.hours.toFixed(1),
        cmds: cmdMap[uid] || 0,
        productivityScore: data.hours > 0 ? ((cmdMap[uid] || 0) / data.hours).toFixed(2) : '0',
        shifts: data.count
      }))
      .sort((a, b) => parseFloat(b.productivityScore) - parseFloat(a.productivityScore))
      .slice(0, 8);

    const avgHours = Object.values(shiftMap).reduce((s, v) => s + v.hours, 0) / shifts.length;
    const avgCmds = activities.length / Math.max(Object.keys(cmdMap).length, 1);

    const leaderboard = productivity.length
      ? productivity.map((p, i) => `\`${String(i + 1).padStart(2)}\` <@${p.uid}> — **${p.productivityScore}** cmds/h | ${p.hours}h, ${p.cmds} cmds`).join('\n')
      : 'No data.';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⚡ Productivity Analysis')
      
      .addFields(
        { name: '🔄 Total Shifts (30d)', value: shifts.length.toString(), inline: true },
        { name: '⏱️ Avg Shift Length', value: `${avgHours.toFixed(1)}h`, inline: true },
        { name: '⚡ Avg Commands/Staff', value: avgCmds.toFixed(1), inline: true },
        { name: '🏆 Productivity Ranking (cmds/hour)', value: leaderboard }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
