const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('task_alerts').setDescription('Configure task alerts'),
  async execute(interaction) { await interaction.reply('Task alerts configured!'); }
};
