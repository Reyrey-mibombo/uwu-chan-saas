const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('notification_effect').setDescription('View notification effects'),
  async execute(interaction) { await interaction.reply({ content: 'Notification effects displayed' }); }
};
