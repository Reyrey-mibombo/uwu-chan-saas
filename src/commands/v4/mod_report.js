const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createPremiumEmbed, createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_report')
    .setDescription('🚩 Submit a high-priority report to the macroscopic sector staff')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Subject of the report')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Nature of the infraction')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Supporting links or documentation')
        .setRequired(false)),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const evidence = interaction.options.getString('evidence');
      const guildId = interaction.guildId;

      const reportId = Math.random().toString(36).substring(2, 8).toUpperCase();

      await Activity.create({
        guildId,
        userId: target.id,
        type: 'command',
        data: {
          action: 'mod_report',
          reportId,
          reason,
          evidence,
          reportedBy: interaction.user.id,
          status: 'pending'
        }
      });

      const staffEmbed = await createCustomEmbed(interaction, {
        title: `🚩 High-Priority Report: [${reportId}]`,
        description: `### 🚨 Disciplinary Triage Initiated\nA new report has been logged for sector **${interaction.guild.name}**. Rapid neutralization protocols available.\n\n**💎 Enterprise FORGE EXCLUSIVE**`,
        fields: [
          { name: '👤 Reported Subject', value: `${target.tag} (\`${target.id}\`)`, inline: true },
          { name: '🚩 Category', value: `\`${reason}\``, inline: true },
          { name: '🕵️ Reporter', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📄 Evidence', value: evidence || '`No supplementary data`', inline: false }
        ],
        footer: `Dispatch ID: ${reportId} • Enterprise Guard`,
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`report_ban_${target.id}_${reportId}`)
          .setLabel('Neutralize (Ban)')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔨'),
        new ButtonBuilder()
          .setCustomId(`report_kick_${target.id}_${reportId}`)
          .setLabel('Extract (Kick)')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('👢'),
        new ButtonBuilder()
          .setCustomId(`report_dismiss_${reportId}`)
          .setLabel('Dismiss')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
      );

      const modChannel = interaction.guild.channels.cache.find(c =>
        c.name.includes('mod') || c.name.includes('report') || c.name.includes('staff')
      );

      if (modChannel) {
        await modChannel.send({ embeds: [staffEmbed], components: [row] });
      }

      await interaction.editReply({ embeds: [createSuccessEmbed('🚩 Signal Transmitted', `Your report [${reportId}] has been broadcast to sector staff for macroscopic triage.`)] });

    } catch (error) {
      console.error('[mod_report] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Dispatch failure: Unable to synchronize report telemetry.')] });
    }
  },

  async handleReportButtons(interaction, client) {
    const { customId, member, guild, guildId } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Authority level insufficient for sector triage.', ephemeral: true });
    }

    const parts = customId.split('_');
    const action = parts[1];
    const targetId = parts[2];
    const reportId = parts[parts.length - 1];

    if (action === 'dismiss') {
      await interaction.update({ content: `✅ Report [${reportId}] dismissed by <@${interaction.user.id}>.`, embeds: [], components: [] });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const target = await client.users.fetch(targetId).catch(() => null);

    try {
      if (action === 'ban') {
        await guild.members.ban(targetId, { reason: `Operational Neutralization (Report ${reportId})` });
        await interaction.editReply({ content: `🔨 Subject ${target?.tag || targetId} neutralized (Banned).` });
      } else if (action === 'kick') {
        const memberToKick = await guild.members.fetch(targetId).catch(() => null);
        if (memberToKick) {
          await memberToKick.kick(`Operational Extraction (Report ${reportId})`);
          await interaction.editReply({ content: `👢 Subject ${target?.tag || targetId} extracted (Kicked).` });
        } else {
          await interaction.editReply({ content: '❌ Subject not found in sector grid.' });
        }
      }

      // Update the original message to show it was handled
      await interaction.message.edit({
        content: `✅ Report [${reportId}] handled via **${action.toUpperCase()}** by <@${interaction.user.id}>.`,
        embeds: interaction.message.embeds,
        components: []
      });

    } catch (e) {
      await interaction.editReply({ content: `❌ Protocol failure: ${e.message}` });
    }
  }
};
