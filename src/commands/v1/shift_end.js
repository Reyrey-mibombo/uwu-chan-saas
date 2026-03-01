const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('End your work shift'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const staffSystem = client.systems.staff;
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const result = await staffSystem.endShift(userId, guildId);

      if (!result.success) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not have an active shift to end!')] });
      }

      const hours = result.hours || 0;
      const minutes = result.minutes || 0;
      const totalSeconds = Math.round(result.duration || 0);

      const embed = createCoolEmbed()
        .setTitle('✅ Shift Ended')
        .setDescription('Your shift has successfully ended. Great work!')
        .addFields(
          { name: '⏱️ Duration', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '📊 Total Seconds', value: `\`${totalSeconds}s\``, inline: true }
        )
        .setColor('success');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while ending your shift.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleButtonEndShift(interaction, client) {
    try {
      await interaction.deferUpdate();

      const customId = interaction.customId;
      const targetUserId = interaction.message.interaction?.user.id || interaction.user.id;

      if (interaction.user.id !== targetUserId) {
        return interaction.followUp({ content: '❌ You cannot end someone else\'s shift!', ephemeral: true });
      }

      const staffSystem = client.systems.staff;
      if (!staffSystem) {
        return interaction.followUp({ content: '❌ Staff system is offline.', ephemeral: true });
      }

      const result = await staffSystem.endShift(interaction.user.id, interaction.guildId);

      if (!result.success) {
        return interaction.followUp({ content: '❌ You do not have an active shift to end.', ephemeral: true });
      }

      const embed = createCoolEmbed()
        .setTitle('✅ Shift Ended (Action)')
        .setDescription('Your shift has successfully ended. Great work!')
        .addFields(
          { name: '⏱️ Duration', value: `\`${result.hours || 0}h ${result.minutes || 0}m\``, inline: true }
        )
        .setColor('success');

      await interaction.editReply({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Error handling end shift button:', error);
      await interaction.followUp({ content: '❌ An error occurred ending your shift.', ephemeral: true });
    }
  }
};
