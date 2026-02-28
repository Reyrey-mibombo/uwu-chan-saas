const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_announce')
    .setDescription('Announce and log a staff promotion with visual effect')
    .addUserOption(opt => opt.setName('user').setDescription('Staff to promote').setRequired(true))
    .addStringOption(opt => opt.setName('new_rank').setDescription('New rank').setRequired(true)
      .addChoices({ name: 'Staff', value: 'staff' }, { name: 'Senior', value: 'senior' }, { name: 'Manager', value: 'manager' }, { name: 'Admin', value: 'admin' })),

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!interaction.member.permissions.has('ManageRoles')) return interaction.editReply('❌ Need Manage Roles permission.');
    const target = interaction.options.getUser('user');
    const newRank = interaction.options.getString('new_rank');
    await User.findOneAndUpdate({ userId: target.id }, { $set: { 'staff.rank': newRank, username: target.username } }, { upsert: true });
    await Activity.create({ guildId: interaction.guildId, userId: target.id, type: 'promotion', data: { newRank, promotedBy: interaction.user.id } });
    const rankEmojis = { staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };
    const embed = createEnterpriseEmbed()
      .setTitle('🎊 ★ PROMOTION ANNOUNCEMENT ★ 🎊')
      
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(`✨ **Congratulations** <@${target.id}>! ✨\n\nYou have been promoted to **${rankEmojis[newRank] || '⭐'} ${newRank.toUpperCase()}**!\n\nKeep up the amazing work! 🚀`)
      .addFields(
        { name: '👤 Staff', value: `<@${target.id}>`, inline: true },
        { name: '🎖️ New Rank', value: `${rankEmojis[newRank] || ''} ${newRank.toUpperCase()}`, inline: true },
        { name: '👮 Promoted By', value: `<@${interaction.user.id}>`, inline: true }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



