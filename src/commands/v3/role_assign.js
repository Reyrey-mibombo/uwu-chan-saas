const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('role_assign').setDescription('Assign roles'),
  async execute(interaction) { await interaction.reply('Role assigned!'); }
};
