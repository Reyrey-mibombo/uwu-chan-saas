const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild, License } = require('../../database/mongo');

const PLANS = {
  premium: {
    name: 'Premium',
    monthly: { price: 9.99, id: 'price_premium_monthly', label: '$9.99/mo' },
    yearly: { price: 99.99, id: 'price_premium_yearly', label: '$99.99/yr' },
    lifetime: { price: 199.99, id: 'price_premium_lifetime', label: '$199.99/lifetime' },
    color: 0x9b59b6
  },
  enterprise: {
    name: 'Enterprise',
    monthly: { price: 19.99, id: 'price_enterprise_monthly', label: '$19.99/mo' },
    yearly: { price: 199.99, id: 'price_enterprise_yearly', label: '$199.99/yr' },
    lifetime: { price: 399.99, id: 'price_enterprise_lifetime', label: '$399.99/lifetime' },
    color: 0xffd700
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('View and manage premium subscription'),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });
    const isPremium = guild?.premium?.isActive || false;
    const tier = guild?.premium?.tier || 'free';

    const existingTrial = await License.findOne({ 
      guildId: guildId,
      paymentProvider: 'trial'
    });
    const trialUsed = !!existingTrial;

    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();
    const row3 = new ActionRowBuilder();

    if (!isPremium) {
      // Premium buttons
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId('buy_premium_monthly')
          .setLabel('Premium $9.99/mo')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('buy_premium_yearly')
          .setLabel('Premium $99.99/yr')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('buy_premium_lifetime')
          .setLabel('Premium $199.99/life')
          .setStyle(ButtonStyle.Success)
      );

      // Enterprise buttons
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId('buy_enterprise_monthly')
          .setLabel('Enterprise $19.99/mo')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('buy_enterprise_yearly')
          .setLabel('Enterprise $199.99/yr')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('buy_enterprise_lifetime')
          .setLabel('Enterprise $399.99/life')
          .setStyle(ButtonStyle.Primary)
      );

      // Trial button
      if (!trialUsed) {
        row3.addComponents(
          new ButtonBuilder()
            .setCustomId('trial_start')
            .setLabel('🎁 Start Free Trial (7 days)')
            .setStyle(ButtonStyle.Secondary)
        );
      }
    } else {
      const plan = PLANS[tier] || PLANS.premium;
      const daysRemaining = guild.premium.expiresAt 
        ? Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : '∞';

      if (tier === 'premium') {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId('upgrade_enterprise_monthly')
            .setLabel('Upgrade to Enterprise $19.99/mo')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('upgrade_enterprise_yearly')
            .setLabel('Upgrade to Enterprise $199.99/yr')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('upgrade_enterprise_lifetime')
            .setLabel('Upgrade to Enterprise $399.99/life')
            .setStyle(ButtonStyle.Primary)
        );
      }

      row2.addComponents(
        new ButtonBuilder()
          .setCustomId('renew_premium')
          .setLabel('Renew Subscription')
          .setStyle(ButtonStyle.Success)
      );
    }

    const statusValue = isPremium ? `✅ ${PLANS[tier]?.name || 'Premium'}` : '❌ Free';
    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Subscription')
      .setColor(isPremium ? (PLANS[tier]?.color || 0x9b59b6) : 0xe74c3c)
      .setDescription('Unlock all premium features for your server!')
      .addFields(
        { name: 'Your Plan', value: statusValue, inline: true },
        { name: 'Status', value: isPremium ? 'Active' : 'Not Active', inline: true }
      );

    if (isPremium && guild.premium.expiresAt && guild.premium.tier !== 'lifetime') {
      embed.addFields({ name: 'Days Remaining', value: Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)).toString(), inline: true });
    }

    const pricingEmbed = new EmbedBuilder()
      .setTitle('💰 Pricing Plans')
      .setColor(0x3498db)
      .addFields(
        { name: '💎 Premium', value: '• $9.99/month\n• $99.99/year (Save 17%)\n• $199.99 lifetime\n\nv3, v4, v5 commands', inline: true },
        { name: '🌟 Enterprise', value: '• $19.99/month\n• $199.99/year (Save 17%)\n• $399.99 lifetime\n\nAll v3-v8 commands', inline: true },
        { name: '🎁 Trial', value: trialUsed ? '❌ Already Used' : '7 days FREE\n\nTry before you buy!', inline: true }
      )
      .setFooter({ text: 'Uwu-chan SaaS Bot' });

    const components = [];
    if (!isPremium) {
      components.push(row1, row2);
      if (row3.components.length > 0) components.push(row3);
    } else {
      if (row1.components.length > 0) components.push(row1);
      components.push(row2);
    }

    await interaction.reply({ 
      embeds: [embed, pricingEmbed], 
      components: components
    });
  }
};
