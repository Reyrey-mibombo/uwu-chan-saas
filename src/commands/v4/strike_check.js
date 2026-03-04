const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike_check')
    .setDescription('Check user strikes')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    const strikes = await Activity.find({
      guildId,
      userId: target.id,
      'data.action': 'strike'
    }).sort({ createdAt: -1 });

    const embed = createPremiumEmbed()
      .setTitle(`🛡️ Strike Check: ${target.username}`)
      .addFields(
        { name: 'Total Strikes', value: strikes.length.toString(), inline: true }
      );

    if (strikes.length > 0) {
      const recent = strikes.slice(0, 5).map((s, i) =>
        `${i + 1}. ${s.data?.reason || 'No reason'} - ${s.createdAt.toLocaleDateString()}`
      ).join('\n');
      embed.addFields({ name: 'Recent Strikes', value: recent, inline: false });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`strike_reset_${target.id}`)
        .setLabel('⚔️ Reset Strikes')
        .setStyle(ButtonStyle.Warning),
      new ButtonBuilder()
        .setCustomId(`strike_add_quick_${target.id}`)
        .setLabel('🚨 Add Strike')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('auto_v4_strike_check')
        .setLabel('🔄 Sync Live Data')
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleStrikeButtons(interaction, client) {
    const { customId, guildId, member } = interaction;
    const targetUserId = customId.split('_').pop();

    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You require `Moderate Members` permissions to manage strikes.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (customId.startsWith('strike_reset_')) {
      await Activity.deleteMany({ guildId, userId: targetUserId, 'data.action': 'strike' });
      const embed = createPremiumEmbed().setTitle('✅ Strikes Reset').setDescription(`All strikes for <@${targetUserId}> have been purged from the records.`);
      await interaction.editReply({ embeds: [embed] });
    } else if (customId.startsWith('strike_add_quick_')) {
      await Activity.create({
        guildId,
        userId: targetUserId,
        type: 'warning',
        data: { action: 'strike', reason: 'Quick Strike issued via Profile Check', moderatorId: interaction.user.id },
        createdAt: new Date()
      });
      const embed = createPremiumEmbed().setTitle('🚨 Strike Issued').setDescription(`A mandatory strike has been logged for <@${targetUserId}>.`);
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
