const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('daily_bonus').setDescription('Claim daily bonus'),
  async execute(interaction) { await interaction.reply({ content: 'Daily bonus claimed! +50 points' }); }
};
