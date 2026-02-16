const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('detailed_profile').setDescription('View detailed profile'),
  async execute(interaction) { await interaction.reply({ content: 'Detailed profile view' }); }
};
