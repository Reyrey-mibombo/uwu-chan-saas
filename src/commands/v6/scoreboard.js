const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('scoreboard').setDescription('View scoreboard'),
  async execute(interaction) { await interaction.reply({ content: 'Scoreboard displayed' }); }
};
