const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_highlight').setDescription('Highlight staff'),
  async execute(interaction) { await interaction.reply({ content: 'Staff highlight shown' }); }
};
