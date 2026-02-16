const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('elite_rewards').setDescription('View elite rewards'),
  async execute(interaction) { await interaction.reply({ content: 'Elite rewards: 3 available' }); }
};
