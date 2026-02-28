const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
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
      if (list.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp().setTitle('✅ Blacklist Clean').setDescription('No users are currently blacklisted from applying.')]
        });
      }

      const embed = createCoolEmbed()
        .setTitle('🚫 Application Blacklist')
        .setDescription(list.map((entry, i) =>
          `**${i + 1}.** <@${entry.userId}> - ${entry.reason}\n└ Added by ${entry.addedBy} on <t:${Math.floor(new Date(entry.addedAt).getTime() / 1000)}:d>`
        ).join('\n\n'))
        
        
        ;
      return interaction.editReply({ embeds: [embed] });
    }

    const target = interaction.options.getUser('user');

    if (sub === 'remove') {
      guild.applicationConfig.blacklist = guild.applicationConfig.blacklist.filter(e => e.userId !== target.id);
      guild.markModified('applicationConfig');
      await guild.save();

      const embed = createCoolEmbed()
        .setTitle('✅ User Unblacklisted')
        .setDescription(`<@${target.id}> (\`${target.tag}\`) has been removed from the application blacklist.`)
        ;
      return interaction.editReply({ embeds: [embed] });
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

      guild.markModified('applicationConfig');
      await guild.save();

      const embed = createCoolEmbed()
        .setTitle('🚫 User Blacklisted')
        .setDescription(`<@${target.id}> (\`${target.tag}\`) has been blacklisted from applying.`)
        .addFields({ name: 'Reason', value: reason })
        
        ;

      await interaction.editReply({ embeds: [embed] });
    }
  }
};


