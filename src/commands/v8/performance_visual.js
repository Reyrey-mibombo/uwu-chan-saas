const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('performance_visual').setDescription('View performance visuals'),
  async execute(interaction) { await interaction.reply({ content: 'Performance visuals displayed' }); }
};
