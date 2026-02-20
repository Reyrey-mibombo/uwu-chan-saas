const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification_effect')
    .setDescription('View notification effects'),
  
  async execute(interaction) {
    await interaction.reply('🔔 *Notification Sound*\n✨ You have a new achievement!');
  }
};
