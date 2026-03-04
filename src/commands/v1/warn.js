const { ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCoolEmbed, createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user for rule violations')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning').setRequired(false))
    .addStringOption(opt => opt.setName('severity').setDescription('Warning severity').addChoices(
      { name: 'Low', value: 'low' },
      { name: 'Medium', value: 'medium' },
      { name: 'High', value: 'high' }
    ).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const severity = interaction.options.getString('severity') || 'medium';
      const staffSystem = client.systems.staff;

      const member = interaction.guild.members.cache.get(user.id);
      if (!member) {
        return interaction.editReply({ embeds: [createErrorEmbed('User not found in this server.')] });
      }

      if (!interaction.member.permissions.has('ModerateMembers')) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not have permission to moderate members.')] });
      }

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const result = await staffSystem.addWarning(user.id, interaction.guildId, reason, interaction.user.id, severity);

      const embed = await createCustomEmbed(interaction, {
        title: '⚠️ Disciplinary Action: Warning Issued',
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '👤 Target Subject', value: `**${user.username}** (\`${user.id}\`)`, inline: true },
          { name: '🛡️ Presiding Moderator', value: `**${interaction.user.username}**`, inline: true },
          { name: '⚠️ Severity Tier', value: `\`${severity.toUpperCase()}\``, inline: true },
          { name: '📉 Point Adjustment', value: `\`-${result.points}\``, inline: true },
          { name: '📝 Recorded Violation', value: reason, inline: false }
        ],
        color: 'warning'
      });

      let dmStatus = '✅ DM Alert: Delivered';
      try {
        const dmEmbed = await createCustomEmbed(interaction, {
          title: `⚠️ Disciplinary Alert: ${interaction.guild.name}`,
          description: `**Notification:** You have received a formal warning.\n**Violation:** ${reason}\n**Severity:** ${severity.toUpperCase()}\n\nPlease adhere strictly to server protocols moving forward.`,
          color: 'warning'
        });
        await user.send({ embeds: [dmEmbed] });
      } catch (e) {
        dmStatus = '❌ DM Alert: Delivery Blocked';
      }

      embed.setFooter({ text: `${dmStatus} • Operational Telemetry Logged` });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`quick_action_${user.id}`)
          .setPlaceholder('⚡ Quick Actions (Stack Punishment)')
          .addOptions([
            { label: 'Mute (10 Mins)', value: 'mute_10m', emoji: '🔇', description: 'Timeout user for 10 minutes' },
            { label: 'Mute (1 Hour)', value: 'mute_1h', emoji: '🔇', description: 'Timeout user for 1 hour' },
            { label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick user from the server' },
            { label: 'Ban', value: 'ban', emoji: '🔨', description: 'Permanently ban user' }
          ])
      );

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`warn_history_${user.id}`)
          .setLabel('📜 View History')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`warn_pardon_${user.id}`)
          .setLabel('🛡️ Rapid Case File')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({ embeds: [embed], components: [row, actionRow] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while warning the user.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleQuickAction(interaction, client) {
    try {
      if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply({ content: '❌ You don\'t have permission to perform moderation actions.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      const targetUserId = interaction.customId.replace('quick_action_', '');
      const actionRaw = interaction.values[0];
      const targetMember = interaction.guild.members.cache.get(targetUserId);

      if (!targetMember) {
        return interaction.editReply({ content: '❌ Target member is no longer in the server.' });
      }

      if (interaction.user.id === targetUserId) {
        return interaction.editReply({ content: '❌ You cannot punish yourself.' });
      }

      let actionDesc = '';

      if (actionRaw === 'mute_10m') {
        const ms = 10 * 60 * 1000;
        await targetMember.timeout(ms, 'Quick Action Mute');
        actionDesc = 'Muted (10m)';
      } else if (actionRaw === 'mute_1h') {
        const ms = 60 * 60 * 1000;
        await targetMember.timeout(ms, 'Quick Action Mute');
        actionDesc = 'Muted (1h)';
      } else if (actionRaw === 'kick') {
        await targetMember.kick('Quick Action Kick');
        actionDesc = 'Kicked';
      } else if (actionRaw === 'ban') {
        await targetMember.ban({ reason: 'Quick Action Ban' });
        actionDesc = 'Banned';
      }

      const embed = await createCustomEmbed(interaction, {
        title: '⚡ Dynamic Punishment Applied',
        description: `Successfully executed mandatory **${actionDesc}** protocol on <@${targetUserId}>.`,
        color: 'success'
      });

      await interaction.editReply({ embeds: [embed] });

      // Attempt to disable the menu so it can't be spammed
      try {
        await interaction.message.edit({ components: [] });
      } catch (e) { }

    } catch (error) {
      console.error('Quick Action execution error:', error);
      await interaction.editReply({ content: '❌ An error occurred executing the quick action. Ensure my role is higher than the target.' });
    }
  },

  async handleHistoryButton(interaction, client) {
    const { customId, guildId } = interaction;
    const targetUserId = customId.split('_').pop();
    const staffSystem = client.systems.staff;

    if (customId.startsWith('warn_history_')) {
      await interaction.deferReply({ ephemeral: true });
      const warnings = await staffSystem.getUserWarnings(targetUserId, guildId);

      if (!warnings?.history?.length) return interaction.editReply({ content: 'This user has no prior disciplinary records.' });

      const historyLines = warnings.history.slice(-5).map(w => {
        const date = `<t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:d>`;
        return `• **${date}**: ${w.reason} (\`${w.severity}\`)`;
      }).join('\n');

      const embed = await createCustomEmbed(interaction, {
        title: `📜 Disciplinary Archive: ${targetUserId}`,
        description: `Showing last 5 historical records:\n\n${historyLines}`,
        color: 'error'
      });
      await interaction.editReply({ embeds: [embed] });
    } else if (customId.startsWith('warn_pardon_')) {
      // Redirect to case file command logic
      const caseCmd = client.commands.get('case_file');
      if (caseCmd) {
        // Mock interaction for case_file
        interaction.options.getUser = () => ({ id: targetUserId });
        await caseCmd.execute(interaction, client);
      }
    }
  }
};


