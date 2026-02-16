const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('activity_alert').setDescription('Configure activity alerts'),
  async execute(interaction) { await interaction.reply('Activity alerts configured!'); }
};
