const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_alerts')
    .setDescription('Configure task alerts')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable task alerts').setRequired(false)),
  
  async execute(interaction) {
    await interaction.reply('🔔 Task alerts: **Enabled**\n• Task assignments\n• Deadlines\n• Overdue reminders');
  }
};
