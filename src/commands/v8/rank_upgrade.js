const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('rank_upgrade').setDescription('Upgrade rank'),
  async execute(interaction) { await interaction.reply({ content: 'Rank upgrade initiated!' }); }
};
