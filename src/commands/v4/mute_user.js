const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute_user')
    .setDescription('Mute a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setMinValue(1)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const duration = interaction.options.getInteger('duration') || 60;
    const guild = interaction.guild;

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'User is not in the server!', ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot mute yourself!', ephemeral: true });
    }

    const guildData = await Guild.findOne({ guildId: guild.id });
    const mutedRoleId = guildData?.settings?.mutedRole;

    let mutedRole = mutedRoleId ? guild.roles.cache.get(mutedRoleId) : null;
    
    if (!mutedRole) {
      mutedRole = await guild.roles.create({
        name: 'Muted',
        color: '#808080',
        reason: 'Created muted role for moderation'
      });
      
      for (const channel of guild.channels.cache.values()) {
        try {
          await channel.permissionOverwrites.create(mutedRole, {
            SendMessages: false,
            Speak: false,
            AddReactions: false
          });
        } catch (e) {}
      }

      if (guildData) {
        guildData.settings.mutedRole = mutedRole.id;
        await guildData.save();
      }
    }

    try {
      await member.roles.add(mutedRole);

      const modSystem = client.systems.moderation;
      await modSystem.createCase(guild.id, target.id, 'mute', reason, interaction.user.id);

      const timeString = duration >= 60 ? `${duration / 60} hour(s)` : `${duration} minute(s)`;

      const embed = new EmbedBuilder()
        .setTitle('🔇 User Muted')
        .setColor(0x808080)
        .addFields(
          { name: '👤 User', value: target.tag, inline: true },
          { name: '📋 Reason', value: reason, inline: true },
          { name: '⏱️ Duration', value: timeString, inline: true }
        )
        .setFooter({ text: `Muted by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      try {
        await target.send(`🔇 You have been muted in **${guild.name}**\n📋 Reason: ${reason}\n⏱️ Duration: ${timeString}`);
      } catch (e) {}

      if (duration > 0) {
        setTimeout(async () => {
          try {
            if (member.roles.cache.has(mutedRole.id)) {
              await member.roles.remove(mutedRole);
              const logChannel = guild.channels.cache.find(c => c.name.includes('mod'));
              if (logChannel) {
                await logChannel.send(`🔊 ${target.tag} has been unmuted (timeout ended)`);
              }
            }
          } catch (e) {}
        }, duration * 60 * 1000);
      }

    } catch (error) {
      await interaction.reply({ content: `Failed to mute user: ${error.message}`, ephemeral: true });
    }
  }
};
