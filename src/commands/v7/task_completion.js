const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_completion')
    .setDescription('View task and shift completion rates over the last 30 days'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const shifts = await Shift.find({ guildId, startTime: { $gte: thirtyDaysAgo } }).lean();
    if (!shifts.length) return interaction.editReply('📊 No shift data found for the past 30 days.');

    const completed = shifts.filter(s => s.endTime).length;
    const withNotes = shifts.filter(s => s.endTime && s.notes && s.notes.trim() !== '').length;
    const rate = ((completed / shifts.length) * 100).toFixed(1);
    const noteRate = completed > 0 ? ((withNotes / completed) * 100).toFixed(1) : '0';
    const bar = '▓'.repeat(Math.round(parseFloat(rate) / 10)) + '░'.repeat(10 - Math.round(parseFloat(rate) / 10));

    const uniqueStaff = [...new Set(shifts.map(s => s.userId))].length;
    const avgDuration = completed > 0
      ? (shifts.filter(s => s.endTime).reduce((sum, s) => {
        return sum + (s.duration || (new Date(s.endTime) - new Date(s.startTime)) / 3600000);
      }, 0) / completed).toFixed(1)
      : '0';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('✅ Task Completion Report')
       >= 80 ? 0x2ecc71 : parseFloat(rate) >= 50 ? 0xf39c12 : 0xe74c3c)
      .addFields(
        { name: '🔄 Total Shifts', value: shifts.length.toString(), inline: true },
        { name: '✅ Completed', value: completed.toString(), inline: true },
        { name: '❌ Incomplete', value: (shifts.length - completed).toString(), inline: true },
        { name: '📊 Completion Rate', value: `\`${bar}\` **${rate}%**` },
        { name: '📝 Note Rate', value: `${noteRate}%`, inline: true },
        { name: '⏱️ Avg Duration', value: `${avgDuration}h`, inline: true },
        { name: '👥 Staff Involved', value: uniqueStaff.toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
