const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('punishment_summary').setDescription('View punishment summary'),
  async execute(interaction) { await interaction.reply({ content: 'Punishment summary: 15 total' }); }
};
