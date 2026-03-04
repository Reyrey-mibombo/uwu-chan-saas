const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick_user')
    .setDescription('👢 Kick a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for kick')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    try {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const guild = interaction.guild;

      const member = await guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply({ embeds: [createErrorEmbed('User is not in the server!')] });

      if (target.id === interaction.user.id) return interaction.editReply({ embeds: [createErrorEmbed('You cannot kick yourself!')] });
      if (target.id === guild.ownerId) return interaction.editReply({ embeds: [createErrorEmbed('You cannot kick the server owner!')] });

      if (member.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.user.id) {
        return interaction.editReply({ embeds: [createErrorEmbed('You cannot kick someone with equal or higher role!')] });
      }

      let dmStatus = '✅ DM Sent';
      try {
        await target.send(`👢 You have been kicked from **${guild.name}**\n📝 Reason: ${reason}`);
      } catch (e) { dmStatus = '❌ DMs closed'; }

      await member.kick(reason);

      // Log to moderation system if available
      if (client.systems.moderation) {
        await client.systems.moderation.createCase(guild.id, target.id, 'kick', reason, interaction.user.id);
      }

      const embed = createPremiumEmbed()
        .setTitle('👢 User Kicked')
        .addFields(
          { name: '👤 User', value: `**${target.username}** (\`${target.id}\`)`, inline: true },
          { name: '🛡️ Moderator', value: `**${interaction.user.username}**`, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '🔔 DM Status', value: `\`${dmStatus}\``, inline: true }
        )
        .setColor('warning');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`kick_history_${target.id}`)
          .setLabel('📜 View History')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`kick_ban_${target.id}`)
          .setLabel('⛔ Ban Permanent')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('auto_v4_kick_user')
          .setLabel('🔄 Sync Live Data')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('[kick_user] Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed(`Failed to kick user: ${error.message}`)] });
    }
  },

  async handleKickButtons(interaction, client) {
    const { customId, member } = interaction;
    const targetUserId = customId.split('_').pop();

    if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({ content: '❌ You require `Kick Members` permissions to use these controls.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    if (customId.startsWith('kick_history_')) {
      const historyCmd = client.commands.get('history_lookup');
      if (historyCmd) {
        interaction.options.getUser = () => ({ id: targetUserId, username: 'Target User' });
        await historyCmd.execute(interaction, client);
      } else {
        await interaction.editReply({ content: '❌ History module is offline.' });
      }
    } else if (customId.startsWith('kick_ban_')) {
      const banCmd = client.commands.get('ban_user');
      if (banCmd) {
        interaction.options.getUser = () => ({ id: targetUserId, username: 'Target User' });
        interaction.options.getString = (name) => name === 'reason' ? 'Immediate escalation from kick pulse' : null;
        interaction.options.getInteger = () => 0;
        await banCmd.execute(interaction, client);
      } else {
        await interaction.editReply({ content: '❌ Ban module is offline.' });
      }
    }
  }
};
