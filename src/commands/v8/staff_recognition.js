const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_recognition').setDescription('Recognize staff'),
  async execute(interaction) { await interaction.reply({ content: 'Staff recognition shown' }); }
};
