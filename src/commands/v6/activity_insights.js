const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_insights').setDescription('View activity insights'),
  async execute(interaction) { await interaction.reply({ content: 'Activity insights displayed' }); }
};
