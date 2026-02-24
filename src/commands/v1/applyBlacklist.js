const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_blacklist')
    .setDescription('Manage application blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => 
      sub.setName('add').setDescription('Blacklist a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to blacklist').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('remove').setDescription('Remove from blacklist')
        .addUserOption(opt => opt.setName('user').setDescription('User to unblacklist').setRequired(true)))
    .addSubcommand(sub => 
      sub.setName('list').setDescription('View blacklisted users')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guild = await Guild.findOne({ guildId: interaction.guildId });
    if (!guild.applicationConfig) guild.applicationConfig = {};
    if (!guild.applicationConfig.blacklist) guild.applicationConfig.blacklist = [];
    
    const sub = interaction.options.getSubcommand();
    
    if (sub === 'list') {
      const list = guild.applicationConfig.blacklist;
      if (list.length === 0) return interaction.editReply('✅ No users are blacklisted.');
      
      const embed = new EmbedBuilder()
        .setTitle('🚫 Application Blacklist')
        .setDescription(list.map((entry, i) => 
          `${i+1}. <@${entry.userId}> - ${entry.reason} (by ${entry.addedBy})`
        ).join('\n'))
        .setColor(0xe74c3c);
      return interaction.editReply({ embeds: [embed] });
    }
    
    const target = interaction.options.getUser('user');
    
    if (sub === 'remove') {
      guild.applicationConfig.blacklist = guild.applicationConfig.blacklist.filter(e => e.userId !== target.id);
      await guild.save();
      return interaction.editReply(`✅ ${target.tag} removed from blacklist.`);
    }
    
    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      if (guild.applicationConfig.blacklist.find(e => e.userId === target.id)) {
        return interaction.editReply('❌ User is already blacklisted!');
      }
      
      guild.applicationConfig.blacklist.push({
        userId: target.id,
        reason: reason,
        addedBy: interaction.user.tag,
        addedAt: new Date()
      });
      
      await guild.save();
      await interaction.editReply(`✅ ${target.tag} has been blacklisted.\n**Reason:** ${reason}`);
    }
  }
};