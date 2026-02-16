const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('rank_announce').setDescription('Announce rank changes'),
  async execute(interaction) { await interaction.reply('Rank announcement sent!'); }
};
