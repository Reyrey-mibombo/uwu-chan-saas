const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('promotion_flow').setDescription('View promotion flow'),
  async execute(interaction) { await interaction.reply({ content: 'Promotion flow displayed' }); }
};
