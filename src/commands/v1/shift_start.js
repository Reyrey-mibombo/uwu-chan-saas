const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Start your staff shift'),

  async execute(interaction, client) {
    const staffSystem = client.systems.staffSystem;
    const result = await staffSystem.startShift(interaction.user.id, interaction.guildId);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle('🟢 Shift Started')
        .setColor(0x2ecc71)
        .setDescription(`Your shift has started at ${result.startTime.toLocaleTimeString()}`)
        .addFields(
          { name: '⏰ Start Time', value: result.startTime.toLocaleString(), inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ content: 'Failed to start shift', ephemeral: true });
    }
  }
};
