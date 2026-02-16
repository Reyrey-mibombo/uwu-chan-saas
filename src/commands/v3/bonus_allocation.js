const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('bonus_allocation').setDescription('Allocate bonus points'),
  async execute(interaction) { await interaction.reply('Bonus allocation configured!'); }
};
