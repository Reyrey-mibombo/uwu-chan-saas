const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_productivity').setDescription('View staff productivity'),
  async execute(interaction) { await interaction.reply({ content: 'Staff productivity: 85%' }); }
};
