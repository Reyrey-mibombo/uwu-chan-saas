const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user for rule violations')
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for warning').setRequired(false)),
  
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);
    
    if (!member) {
      return interaction.reply({ content: '❌ User not found in server', ephemeral: true });
    }
    
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: '❌ You dont have permission to warn users', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
      .setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Warned by:** ${interaction.user.tag}`)
      .setColor('#e74c3c')
      .setTimestamp();
    
    try {
      await user.send({ embeds: [new EmbedBuilder().setTitle('⚠️ You have been warned').setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}`).setColor('#e74c3c')] }).catch(() => {});
    } catch (e) {}
    
    await interaction.reply({ embeds: [embed] });
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildData) {
      if (!guildData.warnings) guildData.warnings = [];
      guildData.warnings.push({ userId: user.id, reason, warnedBy: interaction.user.id, timestamp: new Date() });
      await guildData.save();
    }
  }
};
