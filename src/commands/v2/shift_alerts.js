const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_alerts')
    .setDescription('Configure shift alerts')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable alerts').setRequired(false)),
  
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    
    if (enabled !== null) {
      await interaction.reply(`✅ Shift alerts ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      await interaction.reply('📝 Shift alerts are currently **enabled**. Use `/shift_alerts false` to disable.');
    }
  }
};
