const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_rank_advanced').setDescription('Advanced staff rank view'),
  async execute(interaction) { await interaction.reply({ content: 'Advanced staff rank view' }); }
};
