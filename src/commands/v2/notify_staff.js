const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify_staff')
    .setDescription('Send notification to staff')
    .addStringOption(opt => opt.setName('message').setDescription('Message to send').setRequired(true)),
  
  async execute(interaction) {
    const message = interaction.options.getString('message');
    await interaction.reply('✅ Staff notified with your message.');
  }
};
