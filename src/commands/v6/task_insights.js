const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('task_insights').setDescription('View task insights'),
  async execute(interaction) { await interaction.reply({ content: 'Task insights displayed' }); }
};
