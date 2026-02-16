const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_task').setDescription('Configure auto task'),
  async execute(interaction) { await interaction.reply('Auto task configured!'); }
};
