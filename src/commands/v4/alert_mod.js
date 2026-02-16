const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('alert_mod').setDescription('Alert moderator'),
  async execute(interaction) { await interaction.reply('Moderator alerted!'); }
};
