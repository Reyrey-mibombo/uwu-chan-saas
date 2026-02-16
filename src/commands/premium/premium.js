const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('View premium subscription info'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Subscription')
      .setColor(0xe74c3c)
      .setDescription('Unlock all premium features!')
      .addFields(
        { name: 'Your Plan', value: 'Free Tier', inline: true },
        { name: 'Price', value: '$9.99/month', inline: true }
      )
      .setFooter({ text: 'Click here to upgrade: [Payment Link]' });
    await interaction.reply({ embeds: [embed] });
  }
};
