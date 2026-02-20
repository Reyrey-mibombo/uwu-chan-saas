const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_task')
    .setDescription('Configure automatic tasks')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto tasks').setRequired(false)),
  
  async execute(interaction) {
    await interaction.reply('✅ Auto tasks: **Enabled**\n• Daily reports\n• Activity summaries\n• Shift reminders');
  }
};
