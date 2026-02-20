const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_announce')
    .setDescription('Announce rank upgrade')
    .addUserOption(opt => opt.setName('user').setDescription('User to announce').setRequired(true)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await interaction.reply(`🎉 Congratulations ${user.username} has been promoted to **Senior Staff**!`);
  }
};
