const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('task_reassign').setDescription('Reassign tasks'),
  async execute(interaction) { await interaction.reply('Task reassigned!'); }
};
