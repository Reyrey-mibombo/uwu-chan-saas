const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('role_efficiency').setDescription('View role efficiency'),
  async execute(interaction) { await interaction.reply({ content: 'Role efficiency: 88%' }); }
};
