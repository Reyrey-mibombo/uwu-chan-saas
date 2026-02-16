const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('link_blocker').setDescription('Configure link blocker'),
  async execute(interaction) { await interaction.reply('Link blocker configured!'); }
};
