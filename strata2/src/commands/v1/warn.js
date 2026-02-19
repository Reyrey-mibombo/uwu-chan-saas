const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for warning')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('severity')
        .setDescription('Warning severity')
        .addChoices(
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' }
        )
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const severity = interaction.options.getString('severity') || 'medium';
    const guildId = interaction.guildId;

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot warn yourself!', ephemeral: true });
    }

    const staffSystem = client.systems.staffSystem;
    const result = await staffSystem.addWarning(
      target.id,
      guildId,
      reason,
      interaction.user.id,
      severity
    );

    if (result.success) {
      const user = await User.findOne({ userId: target.id });
      const warningCount = user?.staff?.warnings || 0;

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Warning Issued')
        .setColor(0xe74c3c)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: target.tag, inline: true },
          { name: '📋 Reason', value: reason, inline: true },
          { name: '⚡ Severity', value: severity.toUpperCase(), inline: true },
          { name: '📊 Total Warnings', value: warningCount.toString(), inline: true }
        )
        .setFooter({ text: `Moderator: ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      const logChannel = interaction.guild.channels.cache.find(c => 
        c.name.includes('mod') || c.name.includes('log')
      );
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      try {
        await target.send(`⚠️ You have been warned in **${interaction.guild.name}**\n📋 Reason: ${reason}\nSeverity: ${severity}`);
      } catch (e) {}
    } else {
      await interaction.reply({ content: 'Failed to issue warning.', ephemeral: true });
    }
  }
};
