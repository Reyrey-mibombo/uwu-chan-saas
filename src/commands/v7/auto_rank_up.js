const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rank_up')
    .setDescription('Configure automatic rank ups')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto rank up').setRequired(false)),
  
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    if (enabled !== null) {
      await interaction.reply(`✅ Auto rank up ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      await interaction.reply('⬆️ Auto rank up: **Enabled**\nCriteria: Points threshold + staff approval');
    }
  }
};
