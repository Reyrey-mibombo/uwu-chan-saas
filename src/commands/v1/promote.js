const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a staff member to a higher rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to promote').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('Rank to promote to').setRequired(true)
      .addChoices(
        { name: 'Staff', value: 'staff' },
        { name: 'Senior', value: 'senior' },
        { name: 'Manager', value: 'manager' },
        { name: 'Admin', value: 'admin' },
        { name: 'Owner', value: 'owner' }
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
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_promote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('User not found in this server.')], components: [row] });
      }

      const staffSystem = interaction.client.systems.staff;
      await staffSystem.getOrCreateUser(targetUser.id, guildId, targetUser.username);

      let user = await User.findOne({ userId: targetUser.id, 'guilds.guildId': guildId });

      if (!user.staff) user.staff = {};
      const oldRank = user.staff.rank || 'trial';
      
      if (oldRank === newRank) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_promote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed(`User is already at **${newRank.toUpperCase()}** rank.`)], components: [row] });
      }

      user.staff.rank = newRank;
      user.staff.lastPromotionDate = new Date();
      await user.save();

      const guild = await Guild.findOne({ guildId });
      const rankRole = guild?.rankRoles?.[newRank];

      let roleStatus = '⚪ No role configured';
      if (rankRole) {
        try {
          await member.roles.add(rankRole, `Promoted by ${interaction.user.tag}`);
          roleStatus = '🟢 Role assigned successfully';
        } catch (e) {
          roleStatus = '🔴 Role assignment failed';
        }
      }

      const rankEmojis = { trial: '🌱', staff: '⭐', senior: '🌟', manager: '💫', admin: '🔮', owner: '👑' };

      const embed = await createCustomEmbed(interaction, {
        title: '🎉 Staff Promoted!',
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `**${targetUser.username}** has been promoted!`,
        color: 'success',
        fields: [
          { name: '👤 User', value: `${targetUser}`, inline: true },
          { name: '📊 Old Rank', value: `${rankEmojis[oldRank] || '🌱'} \`${oldRank.toUpperCase()}\``, inline: true },
          { name: '⭐ New Rank', value: `${rankEmojis[newRank] || '👑'} \`${newRank.toUpperCase()}\``, inline: true },
          { name: '🎖️ Role Sync', value: roleStatus, inline: false },
          { name: '👮 Promoted By', value: `${interaction.user}`, inline: true },
          { name: '📅 Date', value: `<t:${Math.floor(Date.now()/1000)}:D>`, inline: true }
        ]
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_promote').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });

      try {
        const dmEmbed = await createCustomEmbed(interaction, {
          title: '🎉 Congratulations!',
          description: `You've been promoted to **${newRank.toUpperCase()}** in **${interaction.guild.name}**!`,
          color: 'success'
        });
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (e) {}
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while promoting the user.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_promote').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


