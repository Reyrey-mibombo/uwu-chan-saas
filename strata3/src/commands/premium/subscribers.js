const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, License } = require('../../database/mongo');

const OWNER_ID = '1357317173470564433';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribers')
    .setDescription('View all premium subscribers (Owner only)'),

  async execute(interaction, client) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ This command is only for the bot owner!', ephemeral: true });
    }

    await interaction.deferReply();

    const allLicenses = await License.find({});
    const allGuilds = await Guild.find({});

    const premiumGuilds = allLicenses.filter(l => l.tier === 'premium' && l.paymentProvider !== 'trial');
    const enterpriseGuilds = allLicenses.filter(l => l.tier === 'enterprise');
    const trialGuilds = allLicenses.filter(l => l.paymentProvider === 'trial');

    const premiumList = [];
    const enterpriseList = [];
    const trialList = [];

    for (const license of premiumGuilds.slice(0, 10)) {
      const guild = allGuilds.find(g => g.guildId === license.guildId);
      premiumList.push(`• Guild: ${license.guildId}\n  Tier: ${license.tier}\n  Expires: ${license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Lifetime'}`);
    }

    for (const license of enterpriseGuilds.slice(0, 10)) {
      enterpriseList.push(`• Guild: ${license.guildId}\n  Tier: ${license.tier}\n  Expires: ${license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Lifetime'}`);
    }

    for (const license of trialGuilds.slice(0, 10)) {
      trialList.push(`• Guild: ${license.guildId}\n  Expires: ${license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Unknown'}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Premium Subscribers')
      .setColor(0x9b59b6)
      .addFields(
        { 
          name: `💎 Premium Subscribers (${premiumGuilds.length})`, 
          value: premiumList.length > 0 ? premiumList.join('\n\n') : 'No premium subscribers',
          inline: false 
        },
        { 
          name: `🌟 Enterprise Subscribers (${enterpriseGuilds.length})`, 
          value: enterpriseList.length > 0 ? enterpriseList.join('\n\n') : 'No enterprise subscribers',
          inline: false 
        },
        { 
          name: `🎁 Free Trials Used (${trialGuilds.length})`, 
          value: trialList.length > 0 ? trialList.join('\n\n') : 'No trials used',
          inline: false 
        },
        { name: '📈 Summary', value: `Total Premium: ${premiumGuilds.length}\nTotal Enterprise: ${enterpriseGuilds.length}\nTotal Trials: ${trialGuilds.length}`, inline: false }
      )
      .setFooter({ text: 'Uwu-chan Bot' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
