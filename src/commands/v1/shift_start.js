const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Start your work shift'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const staffSystem = client.systems.staff;
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const existingShift = await require('../../database/mongo').Shift.findOne({
        userId,
        guildId,
        endTime: null
      });

      if (existingShift) {
        return interaction.editReply({ embeds: [createErrorEmbed('You already have an active shift!')] });
      }

      const result = await staffSystem.startShift(userId, guildId);

      const streakText = result.streakDays && result.streakDays > 1
        ? `\n🔥 **Daily Operational Streak:** \`${result.streakDays} Days\``
        : '';

      const embed = await createCustomEmbed(interaction, {
        title: '✅ Shift Interface Initialized',
        description: `Your active duty shift has successfully commenced.${streakText}\n\n⏱️ **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:t> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
        fields: [
          { name: 'Shift ID', value: `\`${result.shiftId.toString()}\``, inline: true }
        ],
        color: 'success'
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`pause_shift_${result.shiftId.toString()}`)
            .setLabel('⏸️ Pause Shift')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`end_shift_${result.shiftId.toString()}`)
            .setLabel('⏹️ End Shift')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while starting your shift.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
