const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('notification_log').setDescription('View notification log'),
  async execute(interaction) { await interaction.reply({ content: 'Notification log displayed' }); }
};
