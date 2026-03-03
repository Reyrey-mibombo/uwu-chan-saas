const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Guild, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute_user')
    .setDescription('Unmute a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unmute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Unmuted';
    const guild = interaction.guild;

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ content: 'User is not in the server!', ephemeral: true });
    }

    const guildData = await Guild.findOne({ guildId: guild.id });
    const mutedRoleId = guildData?.settings?.mutedRole;
    const mutedRole = mutedRoleId ? guild.roles.cache.get(mutedRoleId) : null;

    if (!mutedRole || !member.roles.cache.has(mutedRole.id)) {
      return interaction.editReply({ content: 'User is not muted!', ephemeral: true });
    }

    try {
            await interaction.deferReply({ fetchReply: true });
      await member.roles.remove(mutedRole);

      await Activity.create({
        guildId: guild.id,
        userId: target.id,
        type: 'warning',
        data: {
          action: 'unmute',
          reason,
          moderatorId: interaction.user.id
        }
      });

      const embed = createPremiumEmbed()
        .setTitle('?? User Unmuted')
        
        .addFields(
          { name: 'User', value: target.tag, inline: true },
          { name: 'Reason', value: reason, inline: true }
        )
        
        ;

      await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_unmute_user').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

      try {
            await interaction.deferReply({ fetchReply: true });
        await target.send(`?? You have been unmuted in **${guild.name}**\n?? Reason: ${reason}`);
      } catch (e) {}

    } catch (error) {
      await interaction.editReply({ content: `Failed to unmute user: ${error.message}`, ephemeral: true });
    }
  }
};




