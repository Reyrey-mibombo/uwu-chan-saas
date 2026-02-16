const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help information'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 Uwu-chan Help')
      .setColor(0x3498db)
      .setDescription('Available command categories:')
      .addFields(
        { name: 'v1', value: 'Core Free (25 commands)', inline: true },
        { name: 'v2', value: 'Automation Lite (25 commands)', inline: true },
        { name: 'v3-v8', value: 'Premium Tiers', inline: true },
        { name: 'Use /premium', value: 'to view upgrade options', inline: false }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
