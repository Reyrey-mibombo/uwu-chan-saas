const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('interactive_dashboard').setDescription('View interactive dashboard'),
  async execute(interaction) { await interaction.reply({ content: 'Interactive dashboard opened' }); }
};
