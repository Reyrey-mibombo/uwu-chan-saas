const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

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
        .setThumbnail(user.displayAvatarURL())
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
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while warning the user.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
