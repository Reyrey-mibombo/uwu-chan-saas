const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rule_violation')
    .setDescription('⚠️ Operational Disciplinary Notice: Traceable Rule Violation Logging')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Subject of the violation')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rule')
        .setDescription('Specific rule identifier or description')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('details')
        .setDescription('Macroscopic context of the violation')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
      }

      const target = interaction.options.getUser('user');
      const rule = interaction.options.getString('rule');
      const details = interaction.options.getString('details');

      const embed = await createCustomEmbed(interaction, {
        title: '⚠️ Rule Violation: Disciplinary Notice',
        description: `### 🚨 Behavioral Infraction Detected\nSubject **${target.tag}** has been cited for a spectroscopic rule violation in sector **${interaction.guild.name}**.\n\n**💎 Enterprise FORGE ALERT**`,
        fields: [
          { name: '👤 Subject', value: `${target.tag} (\`${target.id}\`)`, inline: true },
          { name: '📜 Cited Rule', value: `\`${rule}\``, inline: true },
          { name: '👮 Issuing Officer', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📄 Context', value: details || '`No supplementary details provided.`', inline: false }
        ],
        footer: 'Disciplinary Notice • V4 Guardian Suite',
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`violation_log_${target.id}_${rule.replace(/\s+/g, '-')}`)
          .setLabel('Log Infraction')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚨'),
        new ButtonBuilder()
          .setCustomId(`violation_history_${target.id}`)
          .setLabel('View Subject History')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📜'),
        new ButtonBuilder()
          .setCustomId('auto_v4_rule_violation')
          .setLabel('Relay Sync')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );

      await interaction.editReply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });

    } catch (error) {
      console.error('[rule_violation] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Dispatch failure: Unable to synchronize disciplinary notice.')] });
    }
  },

  async handleViolationButtons(interaction, client) {
    const { customId, member, guildId } = interaction;
    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Authority level insufficient for disciplinary logging.', ephemeral: true });
    }

    const parts = customId.split('_');
    const action = parts[1];
    const targetId = parts[2];

    if (action === 'history') {
      const historyCmd = client.commands.get('history_lookup');
      if (historyCmd) {
        await interaction.deferReply({ ephemeral: true });
        return await historyCmd.renderHistory(interaction, targetId);
      }
      return interaction.reply({ content: '❌ History subsystem offline.', ephemeral: true });
    }

    if (action === 'log') {
      const ruleIdentifier = parts[3];
      await interaction.deferReply({ ephemeral: true });

      await Activity.create({
        guildId,
        userId: targetId,
        type: 'warning',
        data: {
          action: 'strike',
          reason: `Rule Violation: ${ruleIdentifier}`,
          moderatorId: interaction.user.id
        }
      });

      await interaction.editReply({ embeds: [createSuccessEmbed('🚨 Infraction Logged', `Violation for rule \`${ruleIdentifier}\` has been successfully synchronized to the subject's historical record.`)] });

      // Update original message
      await interaction.message.edit({
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('logged_placeholder').setLabel('Infraction Logged').setStyle(ButtonStyle.Success).setDisabled(true)
        )]
      });
    }
  }
};
