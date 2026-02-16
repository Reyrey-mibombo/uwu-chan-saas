const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('growth_visuals').setDescription('View growth visuals'),
  async execute(interaction) { await interaction.reply({ content: 'Growth visuals displayed' }); }
};
