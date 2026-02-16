const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('visual_rankings').setDescription('View visual rankings'),
  async execute(interaction) { await interaction.reply({ content: 'Visual rankings displayed' }); }
};
