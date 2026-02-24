const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_warnings')
    .setDescription('Clear all warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({ content: '❌ Permission denied!', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const result = await Warning.deleteMany({ userId: user.id, guildId: interaction.guildId });

    const embed = new EmbedBuilder()
      .setTitle('✅ Warnings Cleared')
      .setDescription(`Cleared ${result.deletedCount} warnings for ${user.tag}`)
      .setColor(0x2ecc71)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
