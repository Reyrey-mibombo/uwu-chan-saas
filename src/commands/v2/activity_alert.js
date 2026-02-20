const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_alert')
    .setDescription('Configure activity alerts')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable alerts').setRequired(false)),
  
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    
    if (enabled !== null) {
      await interaction.reply(`✅ Activity alerts ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      await interaction.reply('🔔 Activity alerts are **enabled**.');
    }
  }
};
