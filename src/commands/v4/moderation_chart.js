const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('moderation_chart').setDescription('View moderation chart'),
  async execute(interaction) { await interaction.reply({ content: 'Moderation chart displayed' }); }
};
