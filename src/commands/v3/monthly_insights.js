const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('monthly_insights').setDescription('View monthly insights'),
  async execute(interaction) { await interaction.reply({ content: 'Monthly insights generated' }); }
};
