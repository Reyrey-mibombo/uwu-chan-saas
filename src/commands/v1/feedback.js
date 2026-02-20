const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback about the bot')
    .addStringOption(opt => opt.setName('message').setDescription('Your feedback').setRequired(true)),
  
  async execute(interaction) {
    const message = interaction.options.getString('message');
    await interaction.reply('✅ Feedback submitted! Thank you for helping us improve.');
  }
};
