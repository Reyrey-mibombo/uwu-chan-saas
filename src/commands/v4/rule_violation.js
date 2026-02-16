const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('rule_violation').setDescription('Report rule violation'),
  async execute(interaction) { await interaction.reply('Rule violation reported!'); }
};
