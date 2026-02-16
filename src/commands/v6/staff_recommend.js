const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('staff_recommend').setDescription('Get staff recommendations'),
  async execute(interaction) { await interaction.reply({ content: 'Staff recommendations: 5 suggestions' }); }
};
