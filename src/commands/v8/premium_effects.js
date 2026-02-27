const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_effects')
    .setDescription('View your premium tier benefits and effects'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const tier = guild?.premium?.tier || 'free';
    const expiresAt = guild?.premium?.expiresAt;
    const expiryText = expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>` : 'Never (Lifetime)';

    const tierEffects = {
      free: ['✅ v1 & v2 commands (50 commands)', '✅ Basic staff tracking', '✅ Shift management'],
      premium: ['✅ All free features', '✅ v3, v4, v5 commands (75 commands total)', '✅ Advanced moderation', '✅ Performance analytics'],
      enterprise: ['✅ All premium features', '✅ v6, v7, v8 commands (175 commands total)', '✅ AI-powered insights', '✅ Visual dashboards', '✅ Automation ecosystem', '✅ Elite badges & rewards']
    };

    const benefits = (tierEffects[tier] || tierEffects.free).join('\n');
    const colors = { free: 0x95a5a6, premium: 0x3498db, enterprise: 0xf1c40f };

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('💎 Premium Effects & Benefits')
      
      .addFields(
        { name: '🎖️ Current Tier', value: tier.toUpperCase(), inline: true },
        { name: '⏰ Expires', value: tier === 'free' ? 'N/A' : expiryText, inline: true },
        { name: '✨ Your Benefits', value: benefits }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
