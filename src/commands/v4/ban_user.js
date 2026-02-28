const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban_user')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for ban')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to delete messages (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const deleteDays = interaction.options.getInteger('days') || 0;
    const guild = interaction.guild;

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot ban yourself!', ephemeral: true });
    }

    if (target.id === guild.ownerId) {
      return interaction.reply({ content: 'You cannot ban the server owner!', ephemeral: true });
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.user.id) {
        return interaction.reply({ content: 'You cannot ban someone with equal or higher role!', ephemeral: true });
      }
    }

    try {
      await guild.bans.create(target.id, { 
        reason: `${reason} | Banned by ${interaction.user.username}`,
        deleteMessageDays: deleteDays
      });

      const modSystem = client.systems.moderation;
      await modSystem.createCase(guild.id, target.id, 'ban', reason, interaction.user.id);

      const embed = createPremiumEmbed()
        .setTitle('🔨 User Banned')
        
        .addFields(
          { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
          { name: '📋 Reason', value: reason, inline: true },
          { name: '🗑️ Messages Deleted', value: `${deleteDays} days`, inline: true }
        )
        
        ;

      await interaction.reply({ embeds: [embed] });

      const logChannel = guild.channels.cache.find(c => 
        c.name.includes('mod') || c.name.includes('log')
      );
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

      try {
        await target.send(`🔨 You have been banned from **${guild.name}**\n📋 Reason: ${reason}`);
      } catch (e) {}

    } catch (error) {
      await interaction.reply({ content: `Failed to ban user: ${error.message}`, ephemeral: true });
    }
  }
};



