const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('visual_summary').setDescription('View visual summary'),
  async execute(interaction) { await interaction.reply({ content: 'Visual summary displayed' }); }
};
