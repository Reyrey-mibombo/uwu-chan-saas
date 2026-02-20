const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_recognition')
    .setDescription('Recognize staff members')
    .addUserOption(opt => opt.setName('user').setDescription('Staff to recognize').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    await interaction.reply(`🌟 **Staff Recognition** 🌟\nThank you ${user} for your amazing contribution! You\'re awesome!`);
  }
};
