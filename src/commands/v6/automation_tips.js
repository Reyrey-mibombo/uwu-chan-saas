const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('automation_tips').setDescription('Get automation tips'),
  async execute(interaction) { await interaction.reply({ content: 'Automation tips: 3 suggestions' }); }
};
