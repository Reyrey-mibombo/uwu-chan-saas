const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a staff member to a lower rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to demote').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('Rank to demote to').setRequired(true)
      .addChoices(
        { name: 'Trial', value: 'trial' },
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' }
      ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const newRank = interaction.options.getString('rank');
      const guildId = interaction.guildId;

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_demote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('User not found in this server.')], components: [row] });
      }

      let user = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId });
      if (!user || !user.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_demote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('This user is not registered as staff in this server.')], components: [row] });
      }

      const oldRank = user.staff.rank || 'trial';
      
      if (oldRank === newRank) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_demote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed(`User is already at **${newRank.toUpperCase()}** rank.`)], components: [row] });
      }

      user.staff.rank = newRank;
      await user.save();

      const guild = await Guild.findOne({ guildId });
      const newRankRole = guild?.rankRoles?.[newRank];
      const oldRankRole = guild?.rankRoles?.[oldRank];

      let roleStatus = '⚪ No roles configured';
      if (member) {
        try {
          if (oldRankRole) await member.roles.remove(oldRankRole, `Demoted by ${interaction.user.tag}`);
          if (newRankRole) await member.roles.add(newRankRole, `Demoted by ${interaction.user.tag}`);
          roleStatus = '🟢 Roles updated successfully';
        } catch (e) {
          roleStatus = '🔴 Role update failed';
        }
      }

      const rankEmojis = { trial: '🌱', staff: '⭐', senior: '🌟', manager: '💫', admin: '🔮' };

      const embed = await createCustomEmbed(interaction, {
        title: '📉 Staff Demoted',
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `**${targetUser.username}** has been demoted.`,
        color: 'warning',
        fields: [
          { name: '👤 User', value: `${targetUser}`, inline: true },
          { name: '⬇️ Previous Rank', value: `${rankEmojis[oldRank] || '🌱'} \`${oldRank.toUpperCase()}\``, inline: true },
          { name: '⬅️ New Rank', value: `${rankEmojis[newRank] || '🌱'} \`${newRank.toUpperCase()}\``, inline: true },
          { name: '🎭 Role Sync', value: roleStatus, inline: false },
          { name: '👮 Demoted By', value: `${interaction.user}`, inline: true },
          { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:D>`, inline: true }
        ]
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_demote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while demoting the user.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_demote').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


