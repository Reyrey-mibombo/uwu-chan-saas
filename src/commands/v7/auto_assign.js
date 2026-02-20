const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_assign')
    .setDescription('Configure auto role assignment')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto assign').setRequired(false)),
  
  async execute(interaction) {
    await interaction.reply('👥 Auto assign: **Enabled**\n• New members: "Member" role\n• Active users: "Active" role');
  }
};
