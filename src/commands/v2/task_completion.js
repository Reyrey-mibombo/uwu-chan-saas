const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_completion')
    .setDescription('View task completion stats'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Task completion: 15/20 this week' });
  }
};
