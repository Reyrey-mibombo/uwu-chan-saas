const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('premium_effects').setDescription('View premium effects'),
  async execute(interaction) { await interaction.reply({ content: 'Premium effects displayed' }); }
};
