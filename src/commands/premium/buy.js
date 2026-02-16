const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild, License } = require('../../database/mongo');
const axios = require('axios');

const PLANS = {
  premium_monthly: { tier: 'premium', name: 'Premium Monthly', price: 9.99, period: 'month', duration: 30 },
  premium_yearly: { tier: 'premium', name: 'Premium Yearly', price: 99.99, period: 'year', duration: 365 },
  premium_lifetime: { tier: 'premium', name: 'Premium Lifetime', price: 199.99, period: 'lifetime', duration: 3650 },
  enterprise_monthly: { tier: 'enterprise', name: 'Enterprise Monthly', price: 19.99, period: 'month', duration: 30 },
  enterprise_yearly: { tier: 'enterprise', name: 'Enterprise Yearly', price: 199.99, period: 'year', duration: 365 },
  enterprise_lifetime: { tier: 'enterprise', name: 'Enterprise Lifetime', price: 399.99, period: 'lifetime', duration: 3650 },
  trial: { tier: 'premium', name: 'Free Trial', price: 0, period: '7 days', duration: 7 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy premium subscription')
    .addStringOption(option =>
      option.setName('plan')
        .setDescription('Select a plan')
        .addChoices(
          { name: 'Premium - $9.99/month', value: 'premium_monthly' },
          { name: 'Premium - $99.99/year', value: 'premium_yearly' },
          { name: 'Premium - $199.99/lifetime', value: 'premium_lifetime' },
          { name: 'Enterprise - $19.99/month', value: 'enterprise_monthly' },
          { name: 'Enterprise - $199.99/year', value: 'enterprise_yearly' },
          { name: 'Enterprise - $399.99/lifetime', value: 'enterprise_lifetime' },
          { name: 'Free Trial - 7 days', value: 'trial' }
        )
        .setRequired(true)),

  async execute(interaction, client) {
    const planKey = interaction.options.getString('plan');
    const plan = PLANS[planKey];
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (planKey === 'trial') {
      const licenseSystem = client.systems.license;
      const licenseKey = licenseSystem.generateLicenseKey();

      await License.create({
        key: licenseKey,
        userId: userId,
        guildId: guildId,
        tier: 'premium',
        status: 'active',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
        paymentProvider: 'trial'
      });

      let guild = await Guild.findOne({ guildId });
      if (!guild) {
        guild = new Guild({ guildId, name: interaction.guild.name });
      }
      guild.premium = {
        isActive: true,
        tier: 'premium',
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
        licenseKey: licenseKey,
        paymentProvider: 'trial'
      };
      await guild.save();

      const embed = new EmbedBuilder()
        .setTitle('🎉 Free Trial Activated!')
        .setColor(0x2ecc71)
        .setDescription('You now have 7 days of Premium free!')
        .addFields(
          { name: 'License Key', value: licenseKey, inline: true },
          { name: 'Duration', value: '7 days', inline: true },
          { name: 'Expires', value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toDateString(), inline: true }
        )
        .setFooter({ text: 'Enjoy your trial!' });

      return interaction.reply({ embeds: [embed] });
    }

    const licenseSystem = client.systems.license;
    const licenseKey = licenseSystem.generateLicenseKey();

    await License.create({
      key: licenseKey,
      userId: userId,
      guildId: guildId,
      tier: plan.tier,
      status: 'pending',
      createdAt: new Date(),
      metadata: { price: plan.price, period: plan.period }
    });

    const embed = new EmbedBuilder()
      .setTitle(`💎 Purchase ${plan.name}`)
      .setColor(0xe74c3c)
      .setDescription(`**Order Summary**`)
      .addFields(
        { name: 'Plan', value: plan.name, inline: true },
        { name: 'Billing', value: plan.period, inline: true },
        { name: 'Price', value: `$${plan.price}`, inline: true },
        { name: 'License Key', value: `\`${licenseKey}\``, inline: false },
        { name: 'Server', value: interaction.guild.name, inline: true }
      )
      .setFooter({ text: 'Complete payment to activate your license' });

    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    const stripeCheckoutUrl = process.env.STRIPE_CHECKOUT_URL;
    const paypalCheckoutUrl = process.env.PAYPAL_CHECKOUT_URL;

    if (stripeCheckoutUrl) {
      row1.addComponents(
        new ButtonBuilder()
          .setURL(`${stripeCheckoutUrl}?plan=${planKey}&key=${licenseKey}&guild=${guildId}&user=${userId}`)
          .setLabel('Pay with Stripe 💳')
          .setStyle(ButtonStyle.Link)
      );
    }

    if (paypalCheckoutUrl) {
      row1.addComponents(
        new ButtonBuilder()
          .setURL(`${paypalCheckoutUrl}?plan=${planKey}&key=${licenseKey}&guild=${guildId}&user=${userId}`)
          .setLabel('Pay with PayPal 🅿️')
          .setStyle(ButtonStyle.Link)
      );
    }

    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_payment_${licenseKey}`)
        .setLabel('I Have Paid ✅')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ 
      embeds: [embed], 
      components: [row1, row2].filter(r => r.components.length > 0) 
    });
  }
};
