const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Shift } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_alerts')
    .setDescription('List shifts that ended without notes or have issues'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [noNotes, stuck] = await Promise.all([
      Shift.find({ guildId, endTime: { $ne: null }, notes: { $in: [null, ''] }, startTime: { $gte: sevenDaysAgo } }).lean(),
      Shift.find({ guildId, endTime: null, startTime: { $lte: new Date(Date.now() - 4 * 3600000) } }).lean()
    ]);

    const noNotesList = noNotes.slice(0, 5).map(s =>
      `� <@${s.userId}> � <t:${Math.floor(new Date(s.startTime).getTime() / 1000)}:d> � No notes`
    ).join('\n') || '? All shifts have notes.';

    const stuckList = stuck.slice(0, 5).map(s => {
      const hrs = ((Date.now() - new Date(s.startTime).getTime()) / 3600000).toFixed(1);
      return `� <@${s.userId}> � Open **${hrs}h**`;
    }).join('\n') || '? No stuck shifts.';

    const embed = createEnterpriseEmbed()
      .setTitle('?? Task Alerts')
      
      .addFields(
        { name: '?? Shifts Without Notes (7d)', value: noNotes.length.toString(), inline: true },
        { name: '?? Stuck Shifts (4h+)', value: stuck.length.toString(), inline: true },
        { name: '?? Missing Notes', value: noNotesList },
        { name: '? Stuck Shifts', value: stuckList }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_task_alerts').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





