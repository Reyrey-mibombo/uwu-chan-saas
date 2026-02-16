const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('bonus_summary').setDescription('View bonus summary'),
  async execute(interaction) { await interaction.reply({ content: 'Bonus summary: 500 points earned' }); }
};
