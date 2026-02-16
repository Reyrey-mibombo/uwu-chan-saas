const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_animation')
    .setDescription('View rank promotion animation'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Rank Up!')
      .setColor(0xffd700)
      .setDescription('Congratulations on your promotion! 🎊');
    await interaction.reply({ embeds: [embed] });
  }
};
