const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_assign')
    .setDescription('Assign a task to staff'),
  async execute(interaction) {
    await interaction.reply('Task assigned!');
  }
};
