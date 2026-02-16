const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_punish')
    .setDescription('Configure auto-punishment settings')
    .addBooleanOption(option => 
      option.setName('enabled')
        .setDescription('Enable auto-punish')
        .setRequired(true)),
  async execute(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const embed = new EmbedBuilder()
      .setTitle('⚙️ Auto-Punish Settings')
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(`Auto-punish is now ${enabled ? 'enabled' : 'disabled'}`);
    await interaction.reply({ embeds: [embed] });
  }
};
