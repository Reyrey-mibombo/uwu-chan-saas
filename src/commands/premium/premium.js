const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild, License } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('View and manage premium subscription'),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });
    const isPremium = guild?.premium?.isActive || false;
    const tier = guild?.premium?.tier || 'free';

    const embed = new EmbedBuilder()
      .setTitle('💎 Premium Subscription')
      .setColor(0xe74c3c)
      .setDescription('Unlock all premium features for your server!');

    const row = new ActionRowBuilder();

    if (!isPremium) {
      embed.addFields(
        { name: 'Your Plan', value: 'Free Tier', inline: true },
        { name: 'Premium', value: '$9.99/month', inline: true },
        { name: 'Enterprise', value: '$24.99/month', inline: true }
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId('buy_premium')
          .setLabel('Buy Premium - $9.99')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('buy_enterprise')
          .setLabel('Buy Enterprise - $24.99')
          .setStyle(ButtonStyle.Primary)
      );
    } else {
      const daysRemaining = guild.premium.expiresAt 
        ? Math.ceil((new Date(guild.premium.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        : '∞';

      embed.addFields(
        { name: 'Your Plan', value: tier.toUpperCase(), inline: true },
        { name: 'Status', value: '✅ Active', inline: true },
        { name: 'Days Remaining', value: daysRemaining.toString(), inline: true }
      );

      if (tier !== 'enterprise') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('upgrade_enterprise')
            .setLabel('Upgrade to Enterprise')
            .setStyle(ButtonStyle.Primary)
        );
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId('renew_premium')
          .setLabel('Renew Subscription')
          .setStyle(ButtonStyle.Success)
      );
    }

    embed.setFooter({ text: 'Uwu-chan SaaS Bot' });
    
    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
