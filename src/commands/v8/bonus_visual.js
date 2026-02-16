const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('bonus_visual').setDescription('View bonus visuals'),
  async execute(interaction) { await interaction.reply({ content: 'Bonus visuals displayed' }); }
};
