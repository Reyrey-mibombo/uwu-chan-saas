const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('achievement_display').setDescription('Display achievements'),
  async execute(interaction) { await interaction.reply({ content: 'Achievement display shown' }); }
};
