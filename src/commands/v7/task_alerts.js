const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_alerts')
    .setDescription('List shifts that ended without notes or have issues'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [noNotes, stuck] = await Promise.all([
      Shift.find({ guildId, endTime: { $ne: null }, notes: { $in: [null, ''] }, startTime: { $gte: sevenDaysAgo } }).lean(),
      Shift.find({ guildId, endTime: null, startTime: { $lte: new Date(Date.now() - 4 * 3600000) } }).lean()
    ]);

    const noNotesList = noNotes.slice(0, 5).map(s =>
      `• <@${s.userId}> — <t:${Math.floor(new Date(s.startTime).getTime() / 1000)}:d> — No notes`
    ).join('\n') || '✅ All shifts have notes.';

    const stuckList = stuck.slice(0, 5).map(s => {
      const hrs = ((Date.now() - new Date(s.startTime).getTime()) / 3600000).toFixed(1);
      return `• <@${s.userId}> — Open **${hrs}h**`;
    }).join('\n') || '✅ No stuck shifts.';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⚠️ Task Alerts')
      
      .addFields(
        { name: '📝 Shifts Without Notes (7d)', value: noNotes.length.toString(), inline: true },
        { name: '🕐 Stuck Shifts (4h+)', value: stuck.length.toString(), inline: true },
        { name: '📋 Missing Notes', value: noNotesList },
        { name: '⏰ Stuck Shifts', value: stuckList }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
