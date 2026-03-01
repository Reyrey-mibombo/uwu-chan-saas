const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

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

      const embed = createCoolEmbed()
        .setTitle('⚠️ User Warned')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '👤 User', value: `${user.tag} (<@${user.id}>)`, inline: true },
          { name: '🛡️ Moderator', value: interaction.user.tag, inline: true },
          { name: '⚠️ Severity', value: severity.toUpperCase(), inline: true },
          { name: '📉 Points Deducted', value: `\`${result.points}\``, inline: true },
          { name: '📝 Reason', value: reason, inline: false }
        )
        .setColor('warning');

      let dmStatus = '✅ DM sent to user.';
      try {
        await user.send({
          embeds: [new EmbedBuilder()
            .setColor('#faa61a')
            .setTimestamp()
            .setTitle('⚠️ You have received a warning')
            .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Severity:** ${severity.toUpperCase()}`)
          ]
        });
      } catch (e) {
        dmStatus = '❌ Could not send DM to user.';
      }

      embed.setFooter({ text: dmStatus });

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

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while warning the user.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleQuickAction(interaction, client) {
    try {
      if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ content: '❌ You don\'t have permission to perform moderation actions.', ephemeral: true });
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
        actionDesc = 'Muted for 10 minutes';
      } else if (actionRaw === 'mute_1h') {
        const ms = 60 * 60 * 1000;
        await targetMember.timeout(ms, 'Quick Action Mute');
        actionDesc = 'Muted for 1 hour';
      } else if (actionRaw === 'kick') {
        await targetMember.kick('Quick Action Kick');
        actionDesc = 'Kicked from server';
      } else if (actionRaw === 'ban') {
        await targetMember.ban({ reason: 'Quick Action Ban' });
        actionDesc = 'Banned from server';
      }

      const embed = createCoolEmbed()
        .setTitle('⚡ Quick Action Executed')
        .setDescription(`Successfully executed **${actionDesc}** on <@${targetUserId}>`)
        .setColor('success');

      await interaction.editReply({ embeds: [embed] });

      // Attempt to disable the menu so it can't be spammed
      try {
        await interaction.message.edit({ components: [] });
      } catch (e) { }

    } catch (error) {
      console.error('Quick Action execution error:', error);
      await interaction.editReply({ content: '❌ An error occurred executing the quick action. Ensure my role is higher than the target.' });
    }
  }
};
