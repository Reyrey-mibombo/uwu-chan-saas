const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('interactive_summary').setDescription('View interactive summary'),
  async execute(interaction) { await interaction.reply({ content: 'Interactive summary displayed' }); }
};
