const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PermissionFlagsBits } = require('discord.js');

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
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const severity = interaction.options.getString('severity') || 'medium';
    const staffSystem = client.systems.staff;
    
    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: '❌ User not found in server', ephemeral: true });
    }
    
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ You dont have permission', ephemeral: true });
    }
    
    const result = await staffSystem.addWarning(user.id, interaction.guildId, reason, interaction.user.id, severity);
    
    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
      .addFields(
        { name: 'User', value: `${user.tag}`, inline: true },
        { name: 'Severity', value: severity, inline: true },
        { name: 'Points Deducted', value: `${result.points}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setColor('#e74c3c')
      .setTimestamp();

    try {
      await user.send({ 
        embeds: [new EmbedBuilder()
          .setTitle('⚠️ You have been warned')
          .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Severity:** ${severity}`)
          .setColor('#e74c3c')
        ] 
      }).catch(() => {});
    } catch (e) {}
    
    await interaction.reply({ embeds: [embed] });
  }
};
