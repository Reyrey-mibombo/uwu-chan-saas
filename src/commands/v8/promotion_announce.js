const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_announce')
    .setDescription('Announce a promotion with visual effects'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Promotion Announcement!')
      .setColor(0xffd700)
      .setDescription('🎊 **Congratulations!** 🎊\n\nA staff member has been promoted!')
      .setImage('https://i.imgur.com/promotion.gif');
    await interaction.reply({ embeds: [embed] });
  }
};
