const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your points balance'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('⭐ Points Balance')
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Current Points', value: '150', inline: true },
        { name: 'This Week', value: '+25', inline: true }
      )
      .setFooter({ text: 'Use /bonus_points for more earning opportunities!' });
    await interaction.reply({ embeds: [embed] });
  }
};
