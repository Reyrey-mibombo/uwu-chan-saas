const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('event_visuals').setDescription('View event visuals'),
  async execute(interaction) { await interaction.reply({ content: 'Event visuals displayed' }); }
};
