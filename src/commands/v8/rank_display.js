const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('rank_display').setDescription('Display rank'),
  async execute(interaction) { await interaction.reply({ content: 'Rank display shown' }); }
};
