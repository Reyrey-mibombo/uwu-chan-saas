const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('End your staff shift'),

  async execute(interaction, client) {
    const staffSystem = client.systems.staffSystem;
    const result = await staffSystem.endShift(interaction.user.id, interaction.guildId);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle('🔴 Shift Ended')
        .setColor(0xe74c3c)
        .setDescription('Your shift has ended')
        .addFields(
          { name: '⏱️ Duration', value: `${result.hours}h ${result.minutes}m`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ content: result.message || 'No active shift found', ephemeral: true });
    }
  }
};
