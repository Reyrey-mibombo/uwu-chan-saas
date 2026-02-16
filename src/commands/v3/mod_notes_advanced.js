const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('mod_notes_advanced').setDescription('View advanced mod notes'),
  async execute(interaction) { await interaction.reply({ content: 'Advanced mod notes' }); }
};
