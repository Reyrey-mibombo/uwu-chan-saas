const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('moderation_stats').setDescription('View moderation stats'),
  async execute(interaction) { await interaction.reply({ content: 'Moderation stats: 15 warns, 5 bans this week' }); }
};
