const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { License, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activate')
    .setDescription('Activate a premium license key')
    .addStringOption(option =>
      option.setName('key')
        .setDescription('Your license key')
        .setRequired(true)),

  async execute(interaction, client) {
    const key = interaction.options.getString('key').toUpperCase();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const license = await License.findOne({ key });

    if (!license) {
      return interaction.reply({ 
        content: '❌ Invalid license key! Please check and try again.',
        ephemeral: true 
      });
    }

    if (license.status === 'active') {
      return interaction.reply({ 
        content: '⚠️ This license key is already activated!',
        ephemeral: true 
      });
    }

    if (license.status === 'expired') {
      return interaction.reply({ 
        content: '❌ This license key has expired!',
        ephemeral: true 
      });
    }

    license.status = 'active';
    license.activatedAt = new Date();
    license.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    license.guildId = guildId;
    license.userId = userId;
    await license.save();

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    guild.premium = {
      isActive: true,
      tier: license.tier,
      activatedAt: license.activatedAt,
      expiresAt: license.expiresAt,
      licenseKey: key,
      paymentProvider: 'manual'
    };
    await guild.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Premium Activated!')
      .setColor(0x2ecc71)
      .setDescription(`Welcome to ${license.tier === 'enterprise' ? 'Enterprise' : 'Premium'}!`)
      .addFields(
        { name: 'License Key', value: key, inline: true },
        { name: 'Tier', value: license.tier.toUpperCase(), inline: true },
        { name: 'Expires', value: new Date(license.expiresAt).toDateString(), inline: true }
      )
      .setFooter({ text: 'Thank you for your purchase!' });

    await interaction.reply({ embeds: [embed] });
  }
};
