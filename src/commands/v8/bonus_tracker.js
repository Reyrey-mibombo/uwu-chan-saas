const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('bonus_tracker').setDescription('Track bonuses'),
  async execute(interaction) { await interaction.reply({ content: 'Bonus tracker: 500 points' }); }
};
