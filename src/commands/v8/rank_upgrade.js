const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_upgrade')
    .setDescription('Upgrade a staff member\'s rank with celebration effect')
    .addUserOption(opt => opt.setName('user').setDescription('User to upgrade').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('New rank').setRequired(true)
      .addChoices({ name: 'Staff', value: 'staff' }, { name: 'Senior', value: 'senior' }, { name: 'Manager', value: 'manager' }, { name: 'Admin', value: 'admin' })),

  async execute(interaction, client) {
    await interaction.deferReply();
    if (!interaction.member.permissions.has('ManageRoles')) return interaction.editReply('❌ Need Manage Roles.');
    const target = interaction.options.getUser('user');
    const newRank = interaction.options.getString('rank');
    await User.findOneAndUpdate({ userId: target.id }, { $set: { 'staff.rank': newRank, username: target.username } }, { upsert: true });
    await Activity.create({ guildId: interaction.guildId, userId: target.id, type: 'promotion', data: { newRank, promotedBy: interaction.user.id } });
    const rankEmojis = { staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };
    const embed = new EmbedBuilder()
      .setTitle('🚀 RANK UPGRADE!')
      .setColor(0x2ecc71)
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`🎊 **${target.username}** has been upgraded to **${rankEmojis[newRank] || '⭐'} ${newRank.toUpperCase()}**! 🎊\n\n*Keep up the outstanding work!* 💪`)
      .addFields(
        { name: '👤 Staff', value: `<@${target.id}>`, inline: true },
        { name: '🆙 New Rank', value: `${rankEmojis[newRank] || ''} ${newRank.toUpperCase()}`, inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Rank Upgraded by ${interaction.user.username}` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
