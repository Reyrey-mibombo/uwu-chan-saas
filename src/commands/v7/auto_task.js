const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_task')
    .setDescription('View open/incomplete shifts that need attention'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000);

    const openShifts = await Shift.find({
      guildId,
      endTime: null,
      startTime: { $lte: twoHoursAgo }
    }).sort({ startTime: 1 }).lean();

    if (!openShifts.length) {
      const embed = new EmbedBuilder()
        .setTitle('✅ Auto-Task Monitor')
        .setColor(0x2ecc71)
        .setDescription('No open tasks or stuck shifts detected. Everything is running smoothly!')
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const taskList = openShifts.slice(0, 10).map((s, i) => {
      const started = new Date(s.startTime);
      const hoursOpen = ((Date.now() - started.getTime()) / 3600000).toFixed(1);
      const urgency = parseFloat(hoursOpen) > 8 ? '🔴' : parseFloat(hoursOpen) > 4 ? '🟡' : '🟢';
      return `\`${String(i + 1).padStart(2)}\` ${urgency} <@${s.userId}> — Open **${hoursOpen}h** | Started <t:${Math.floor(started.getTime() / 1000)}:R>`;
    }).join('\n');

    const critical = openShifts.filter(s => (Date.now() - new Date(s.startTime).getTime()) > 8 * 3600000).length;

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Open Tasks & Shifts')
      .setColor(critical > 0 ? 0xe74c3c : 0xf39c12)
      .addFields(
        { name: '📋 Open Shifts', value: openShifts.length.toString(), inline: true },
        { name: '🔴 Critical (8h+)', value: critical.toString(), inline: true },
        { name: '📌 Action Needed', value: 'Use `/shift_end` to close these shifts', inline: true },
        { name: '🕐 Open Shift List', value: taskList }
      )
      .setFooter({ text: `${interaction.guild.name} • Auto-Task Monitor` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
