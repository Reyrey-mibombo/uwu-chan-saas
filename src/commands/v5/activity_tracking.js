const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_tracking').setDescription('Track activity'),
  async execute(interaction) { await interaction.reply({ content: 'Activity tracking enabled' }); }
};
