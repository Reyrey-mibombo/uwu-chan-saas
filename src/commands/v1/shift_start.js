const { SlashCommandBuilder } = require('discord.js');
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

      const embed = createCoolEmbed()
        .setTitle('✅ Shift Started')
        .setDescription(`Your shift has successfully started!\n\n⏱️ **Started at:** <t:${Math.floor(Date.now() / 1000)}:T> (<t:${Math.floor(Date.now() / 1000)}:R>)`)
        .addFields(
          { name: 'Shift ID', value: `\`${result.shiftId.toString()}\``, inline: true }
        )
        .setColor('success');

      await interaction.editReply({ embeds: [embed] });
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
