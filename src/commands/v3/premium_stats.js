const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, License } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_stats')
    .setDescription('View premium statistics'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    if (!guild || !guild.premium?.isActive) {
      const embed = new EmbedBuilder()
        .setTitle('💎 Premium Statistics')
        .setColor(0x808080)
        .setDescription('This server does not have premium active.')
        .addFields(
          { name: 'Status', value: 'Not Active', inline: true },
          { name: 'Current Tier', value: 'Free', inline: true }
        )
        .setFooter({ text: 'Use /premium to upgrade!' });

      return interaction.reply({ embeds: [embed] });
    }

    const daysRemaining = guild.premium.expiresAt 
      ? Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
      : 'Unlimited';

    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Statistics')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Status', value: 'Active', inline: true },
        { name: 'Tier', value: guild.premium.tier.charAt(0).toUpperCase() + guild.premium.tier.slice(1), inline: true },
        { name: 'Activated', value: guild.premium.activatedAt ? new Date(guild.premium.activatedAt).toDateString() : 'Unknown', inline: true },
        { name: 'Days Remaining', value: daysRemaining.toString(), inline: true },
        { name: 'License Key', value: guild.premium.licenseKey || 'N/A', inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
