const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('progress_tracker').setDescription('Track progress'),
  async execute(interaction) { await interaction.reply({ content: 'Progress: 75% complete' }); }
};
