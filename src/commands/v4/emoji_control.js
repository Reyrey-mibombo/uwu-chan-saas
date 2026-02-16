const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('emoji_control').setDescription('Control emoji usage'),
  async execute(interaction) { await interaction.reply('Emoji control configured!'); }
};
