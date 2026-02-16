const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('achievement_tracker').setDescription('Track achievements'),
  async execute(interaction) { await interaction.reply({ content: 'Achievements: 5/10 unlocked' }); }
};
