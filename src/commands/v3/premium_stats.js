const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_stats')
    .setDescription('Review algorithmic premium integrations tied to this server.'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const guild = await Guild.findOne({ guildId }).lean();

      if (!guild || !guild.premium?.isActive) {
        const embed = await createCustomEmbed(interaction, {
          title: '💎 Subscription Metrics',
          description: `**${interaction.guild.name}** is currently operating on the \`Free\` tier.\nUpgrade your algorithmic boundaries by supporting uwu-chan!`,
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          fields: [
            { name: '🌐 Engine Parameter', value: 'Not Active', inline: true },
            { name: '🎖️ Allowed Tiers', value: '`Free Tier Bounds`', inline: true }
          ]
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const daysRemaining = guild.premium.expiresAt
        ? Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : 'Unlimited / Lifetime';

      const embed = await createCustomEmbed(interaction, {
        title: '💎 Subscription Vector Active',
        description: `**${interaction.guild.name}** is executing advanced parameters! Thank you for the support.`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '🌐 Engine Parameter', value: '`Active & Tracking`', inline: true },
          { name: '🎖️ Target Tier Output', value: `\`${guild.premium.tier.charAt(0).toUpperCase() + guild.premium.tier.slice(1)}\``, inline: true },
          { name: '📅 Execution Start', value: guild.premium.activatedAt ? `\`${new Date(guild.premium.activatedAt).toDateString()}\`` : '`Unknown`', inline: true },
          { name: '⏱️ Temporal Expiration', value: `\`${daysRemaining}\` Days Limit`, inline: true },
          { name: '🔑 Encryption Vector', value: `\`${guild.premium.licenseKey || 'N/A'}\``, inline: false }
        ]
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Premium Stats Error:', error);
      const errEmbed = createErrorEmbed('A backend error occurred attempting to verify custom licensing tokens.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
