const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_effects')
    .setDescription('View premium effects for this server')
    .addUserOption(opt => opt.setName('user').setDescription('View effects for a specific user (optional)')),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const targetUser = interaction.options.getUser('user');

    const guild = await Guild.findOne({ guildId });
    const premium = guild?.premium || { isActive: false, tier: 'free' };
    const effects = [];

    if (premium.isActive || premium.tier !== 'free') {
      effects.push('✨ Golden border on embeds');
      effects.push('🎆 Animated progress bars');
      effects.push('💎 Premium badge display');
      effects.push('🔮 Advanced prediction graphs');
      effects.push('📊 Enhanced analytics');
      
      if (premium.tier === 'enterprise') {
        effects.push('🚀 Custom rank animations');
        effects.push('💰 All rewards doubled');
        effects.push('🎯 Priority support access');
      }
    } else {
      effects.push('❌ No premium effects active');
      effects.push('💎 Upgrade to premium for effects!');
    }

    const embed = new EmbedBuilder()
      .setTitle('✨ Premium Effects')
      .setColor(premium.tier === 'enterprise' ? 0xffd700 : premium.tier === 'premium' ? 0x9b59b6 : 0x808080)
      .addFields(
        { name: 'Current Tier', value: premium.tier.toUpperCase(), inline: true },
        { name: 'Status', value: premium.isActive ? '✅ Active' : '❌ Inactive', inline: true }
      )
      .addFields({ name: 'Available Effects', value: effects.join('\n'), inline: false });

    if (premium.expiresAt) {
      embed.addFields({ name: 'Expires', value: new Date(premium.expiresAt).toLocaleDateString(), inline: true });
    }

    if (targetUser) {
      embed.setDescription(`Viewing effects for: **${targetUser.username}**`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
