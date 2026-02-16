const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('mod_report').setDescription('Report to moderators'),
  async execute(interaction) { await interaction.reply('Report submitted!'); }
};
