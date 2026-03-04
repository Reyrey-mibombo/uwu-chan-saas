const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history_lookup')
    .setDescription('Lookup user moderation history')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to lookup')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of records')
        .setMinValue(5)
        .setMaxValue(50)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;
    const guildId = interaction.guildId;

    const history = await Activity.find({
      guildId,
      userId: target.id,
      type: { $in: ['warning', 'command'] }
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (history.length === 0) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('auto_v4_history_lookup').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary)
      );
      return interaction.editReply({ embeds: [createPremiumEmbed().setTitle(`🔍 History: ${target.username}`).setDescription(`No moderation history found for ${target.tag}.`)], components: [row] });
    }

    const formatEntry = (entry) => {
      const action = entry.data?.action || entry.type || 'unknown';
      const reason = entry.data?.reason || 'No reason';
      const mod = entry.data?.moderatorId ? `<@${entry.data.moderatorId}>` : 'System';
      const time = entry.createdAt.toLocaleString();
      return `**${action.toUpperCase()}** | ${mod} | ${reason} | ${time}`;
    };

    const embed = createPremiumEmbed()
      .setTitle(`📜 History: ${target.username}`)
      .setDescription(history.map(formatEntry).join('\n'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`history_clear_recent_${target.id}`)
        .setLabel('🗑️ Clear Recent (3)')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`history_case_file_${target.id}`)
        .setLabel('📂 Full Case File')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('auto_v4_history_lookup')
        .setLabel('🔄 Sync Live Data')
        .setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleHistoryButtons(interaction, client) {
    const { customId, guildId, member } = interaction;
    const targetUserId = customId.split('_').pop();

    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ You require `Moderate Members` permissions to manage history.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (customId.startsWith('history_clear_recent_')) {
      // Find the last 3 records to delete
      const records = await Activity.find({
        guildId,
        userId: targetUserId,
        type: { $in: ['warning', 'command'] }
      })
        .sort({ createdAt: -1 })
        .limit(3);

      const recordIds = records.map(r => r._id);
      await Activity.deleteMany({ _id: { $in: recordIds } });

      const embed = createPremiumEmbed().setTitle('✅ History Pruned').setDescription(`Successfully removed the last **${recordIds.length}** disciplinary entries for <@${targetUserId}>.`);
      await interaction.editReply({ embeds: [embed] });
    } else if (customId.startsWith('history_case_file_')) {
      const caseCmd = client.commands.get('case_file');
      if (caseCmd) {
        interaction.options.getUser = () => ({ id: targetUserId, username: 'Target User' });
        await caseCmd.execute(interaction, client);
      } else {
        await interaction.editReply({ content: '❌ Case File module is currently offline.' });
      }
    }
  }
};
