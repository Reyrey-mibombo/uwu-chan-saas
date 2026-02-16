const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('weekly_bonus').setDescription('Claim weekly bonus'),
  async execute(interaction) { await interaction.reply({ content: 'Weekly bonus claimed! +200 points' }); }
};
