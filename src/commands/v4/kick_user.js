const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick_user')
    .setDescription('Kick a user from the server')
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
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guild = interaction.guild;

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'User is not in the server!', ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot kick yourself!', ephemeral: true });
    }

    if (target.id === guild.ownerId) {
      return interaction.reply({ content: 'You cannot kick the server owner!', ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: 'You cannot kick someone with equal or higher role!', ephemeral: true });
    }

    try {
      await member.kick(reason);

      const modSystem = client.systems.moderation;
      await modSystem.createCase(guild.id, target.id, 'kick', reason, interaction.user.id);

      const embed = createPremiumEmbed()
        .setTitle('👢 User Kicked')
        
        .addFields(
          { name: '👤 User', value: `${target.tag} (${target.id})`, inline: true },
          { name: '📋 Reason', value: reason, inline: true }
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
        await target.send(`👢 You have been kicked from **${guild.name}**\n📋 Reason: ${reason}`);
      } catch (e) {}

    } catch (error) {
      await interaction.reply({ content: `Failed to kick user: ${error.message}`, ephemeral: true });
    }
  }
};



