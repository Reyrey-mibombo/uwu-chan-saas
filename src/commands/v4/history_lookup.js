const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('history_lookup').setDescription('Lookup user history'),
  async execute(interaction) { await interaction.reply({ content: 'User history displayed' }); }
};
