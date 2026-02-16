const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('role_distribution').setDescription('View role distribution'),
  async execute(interaction) { await interaction.reply({ content: 'Role distribution displayed' }); }
};
