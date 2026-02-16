const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('notify_mods').setDescription('Notify moderators'),
  async execute(interaction) { await interaction.reply('Moderators notified!'); }
};
