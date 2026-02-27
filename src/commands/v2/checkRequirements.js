const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_requirements')
    .setDescription('[Premium] Quick check if user can be promoted')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    const userData = await User.findOne({ userId: user.id });
    const guild = await Guild.findOne({ guildId });

    if (!userData?.staff) {
      return interaction.editReply({ content: '❌ User is not a staff member.' });
    }

    const currentRank = userData.staff.rank || 'member';
    const points = userData.staff.points || 0;
    const consistency = userData.staff.consistency || 0;
    const reputation = userData.staff.reputation || 0;
    const achievements = userData.staff.achievements?.length || 0;

    const shiftCount = await Shift.countDocuments({ userId: user.id, guildId, endTime: { $ne: null } });
    const warningCount = await Warning.countDocuments({ userId: user.id, guildId });

    const rankOrder = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
    const currentIndex = rankOrder.indexOf(currentRank);
    const nextRank = rankOrder[currentIndex + 1];

    if (!nextRank) {
      return interaction.editReply({ content: '🎉 User is at max rank!' });
    }

    const req = guild?.promotionRequirements?.[nextRank] || {};
    const reqPoints = req.points || 100;
    const reqShifts = req.shifts || 5;
    const reqConsistency = req.consistency || 70;
    const reqMaxWarnings = req.maxWarnings ?? 3;

    const canPromote = 
      points >= reqPoints &&
      shiftCount >= reqShifts &&
      consistency >= reqConsistency &&
      warningCount <= reqMaxWarnings;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(canPromote ? '✅ CAN BE PROMOTED!' : '❌ CANNOT BE PROMOTED')
      .setThumbnail(user.displayAvatarURL())
      
      .addFields(
        { name: '👤 User', value: user.tag, inline: true },
        { name: '🏆 Current Rank', value: currentRank.toUpperCase(), inline: true },
        { name: '⬆️ Next Rank', value: nextRank.toUpperCase(), inline: true }
      )
      .addFields(
        { name: '⭐ Points', value: `${points}/${reqPoints} ${points >= reqPoints ? '✅' : '❌'}`, inline: true },
        { name: '🔄 Shifts', value: `${shiftCount}/${reqShifts} ${shiftCount >= reqShifts ? '✅' : '❌'}`, inline: true },
        { name: '📈 Consistency', value: `${consistency}%/${reqConsistency}% ${consistency >= reqConsistency ? '✅' : '❌'}`, inline: true },
        { name: '⚠️ Warnings', value: `${warningCount}/${reqMaxWarnings} ${warningCount <= reqMaxWarnings ? '✅' : '❌'} (max)`, inline: true }
      );

    if (canPromote) {
      embed.setDescription(`🎉 **${user.username}** is ready for promotion to **${nextRank.toUpperCase()}**!`);
    } else {
      embed.setDescription(`💪 Keep going, **${user.username}**! You need to meet more requirements.`);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
