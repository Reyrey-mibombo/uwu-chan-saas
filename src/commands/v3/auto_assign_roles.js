const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('auto_assign_roles').setDescription('Auto assign roles'),
  async execute(interaction) { await interaction.reply('Auto role assign configured!'); }
};
