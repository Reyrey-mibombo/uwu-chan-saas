const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_behavior').setDescription('Analyze staff behavior'),
  async execute(interaction) { await interaction.reply({ content: 'Staff behavior analysis displayed' }); }
};
