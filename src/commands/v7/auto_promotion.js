const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_promotion')
    .setDescription('Configure automatic promotions')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto promotion').setRequired(false)),
  
  async execute(interaction) {
    await interaction.reply('⬆️ Auto promotion: **Enabled**\n• Requires: Points threshold + manager approval');
  }
};
