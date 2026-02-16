const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_showcase').setDescription('Showcase staff'),
  async execute(interaction) { await interaction.reply({ content: 'Staff showcase displayed' }); }
};
