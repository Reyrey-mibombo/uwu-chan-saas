const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('reward_display').setDescription('Display rewards'),
  async execute(interaction) { await interaction.reply({ content: 'Reward display shown' }); }
};
