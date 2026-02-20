const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_announce')
    .setDescription('Announce promotion with effects')
    .addUserOption(opt => opt.setName('user').setDescription('User to promote').setRequired(true)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await interaction.reply(`🎉🎊 ${user} has been promoted to **Senior Staff**! Congratulations! 🎊🎉`);
  }
};
