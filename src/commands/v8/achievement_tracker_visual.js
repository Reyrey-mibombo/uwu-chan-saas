const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('achievement_tracker_visual').setDescription('Visual achievement tracker'),
  async execute(interaction) { await interaction.reply({ content: 'Achievement tracker visual displayed' }); }
};
