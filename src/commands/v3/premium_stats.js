const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_stats')
    .setDescription('Review algorithmic premium integrations tied to this server.'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const guildId = interaction.guildId;
      const guild = await Guild.findOne({ guildId }).lean();

      if (!guild || !guild.premium?.isActive) {
        const embed = await createCustomEmbed(interaction, {
          title: '?? Subscription Metrics',
          description: `**${interaction.guild.name}** is currently operating on the \`Free\` tier.\nUpgrade your algorithmic boundaries by supporting uwu-chan!`,
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          fields: [
            { name: '?? Engine Parameter', value: 'Not Active', inline: true },
            { name: '??? Allowed Tiers', value: '`Free Tier Bounds`', inline: true }
          ]
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_premium_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }

      const daysRemaining = guild.premium.expiresAt
        ? Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : 'Unlimited / Lifetime';

      const embed = await createCustomEmbed(interaction, {
        title: '?? Subscription Vector Active',
        description: `**${interaction.guild.name}** is executing advanced parameters! Thank you for the support.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '?? Engine Parameter', value: '`Active & Tracking`', inline: true },
          { name: '??? Target Tier Output', value: `\`${guild.premium.tier.charAt(0).toUpperCase() + guild.premium.tier.slice(1)}\``, inline: true },
          { name: '?? Execution Start', value: guild.premium.activatedAt ? `\`${new Date(guild.premium.activatedAt).toDateString()}\`` : '`Unknown`', inline: true },
          { name: '?? Temporal Expiration', value: `\`${daysRemaining}\` Days Limit`, inline: true },
          { name: '?? Encryption Vector', value: `\`${guild.premium.licenseKey || 'N/A'}\``, inline: false }
        ]
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_premium_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Premium Stats Error:', error);
      const errEmbed = createErrorEmbed('A backend error occurred attempting to verify custom licensing tokens.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_premium_stats').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


