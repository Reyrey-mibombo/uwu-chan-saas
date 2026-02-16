const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild, License } = require('../../database/mongo');

const PLANS = {
  premium: {
    name: 'Premium',
    monthly: 9.99,
    yearly: 99.99,
    lifetime: 199.99,
    color: 0x9b59b6
  },
  enterprise: {
    name: 'Enterprise',
    monthly: 19.99,
    yearly: 199.99,
    lifetime: 399.99,
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

    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Subscription')
      .setColor(0xe74c3c)
      .setDescription('Unlock all premium features for your server!');

    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    if (!isPremium) {
      embed.addFields(
        { name: 'Your Plan', value: '❌ Free', inline: true },
        { name: 'Status', value: 'Not Active', inline: true }
      );

      if (!trialUsed) {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId('trial_start')
            .setLabel('Start Free Trial')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      row1.addComponents(
        new ButtonBuilder()
          .setCustomId('buy_premium_monthly')
          .setLabel('Premium - $9.99/mo')
          .setStyle(ButtonStyle.Success)
      );

      row2.addComponents(
        new ButtonBuilder()
          .setCustomId('buy_enterprise_monthly')
          .setLabel('Enterprise - $19.99/mo')
          .setStyle(ButtonStyle.Primary)
      );
    } else {
      const plan = PLANS[tier] || PLANS.premium;
      const daysRemaining = guild.premium.expiresAt 
        ? Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : '∞';

      embed.setColor(plan.color)
        .addFields(
          { name: 'Your Plan', value: `✅ ${plan.name}`, inline: true },
          { name: 'Status', value: 'Active', inline: true },
          { name: 'Days Remaining', value: daysRemaining.toString(), inline: true }
        );

      if (tier === 'premium') {
        row1.addComponents(
          new ButtonBuilder()
            .setCustomId('upgrade_enterprise')
            .setLabel('Upgrade to Enterprise')
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

    const pricingEmbed = new EmbedBuilder()
      .setTitle('💰 Pricing')
      .setColor(0x3498db)
      .addFields(
        { name: 'Premium', value: '$9.99/month\n$99.99/year\n$199.99 lifetime', inline: true },
        { name: 'Enterprise', value: '$19.99/month\n$199.99/year\n$399.99 lifetime', inline: true },
        { name: 'Free Trial', value: trialUsed ? '❌ Already Used' : '7 days FREE', inline: true }
      )
      .setFooter({ text: 'Uwu-chan SaaS Bot' });

    await interaction.reply({ 
      embeds: [embed, pricingEmbed], 
      components: isPremium ? [row2] : [row1, row2].filter(r => r.components.length > 0) 
    });
  }
};
