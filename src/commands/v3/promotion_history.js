const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('promotion_history').setDescription('View promotion history'),
  async execute(interaction) { await interaction.reply({ content: 'Promotion history view' }); }
};
