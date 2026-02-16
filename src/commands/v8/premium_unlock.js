const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_unlock')
    .setDescription('View premium unlock features'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const isPremium = guild?.premium?.isActive || false;

    const embed = new EmbedBuilder()
      .setTitle('🔓 Premium Unlock Features')
      .setColor(isPremium ? 0x2ecc71 : 0x808080)
      .setDescription(isPremium ? '✅ All features unlocked!' : '🔒 Features locked')
      .addFields(
        { name: 'Status', value: isPremium ? 'Premium Active' : 'Free Tier', inline: true },
        { name: 'v3 Commands', value: isPremium ? '✅' : '❌', inline: true },
        { name: 'v4 Commands', value: isPremium ? '✅' : '❌', inline: true },
        { name: 'v5 Commands', value: isPremium ? '✅' : '❌', inline: true },
        { name: 'v6 Commands', value: guild?.premium?.tier === 'enterprise' ? '✅' : '❌', inline: true },
        { name: 'v7 Commands', value: guild?.premium?.tier === 'enterprise' ? '✅' : '❌', inline: true },
        { name: 'v8 Commands', value: guild?.premium?.tier === 'enterprise' ? '✅' : '❌', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
