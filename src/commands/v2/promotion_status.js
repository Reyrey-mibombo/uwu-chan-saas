const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_status')
    .setDescription('[Premium] Check promotion status and requirements')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const user = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const userData = await User.findOne({ userId: user.id });
    const guild = await Guild.findOne({ guildId });

    if (!userData?.staff) {
      return interaction.editReply({ content: '❌ User is not a staff member yet.' });
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
      const embed = createCoolEmbed()
        .setTitle(`👑 ${user.username} - Max Rank Reached!`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '🏆 Current Rank', value: currentRank.toUpperCase(), inline: true },
          { name: '⭐ Points', value: points.toString(), inline: true },
          { name: '📊 Status', value: '🎉 Maximum rank achieved!', inline: false }
        )
        
        ;

      return interaction.editReply({ embeds: [embed] });
    }

    const req = guild?.promotionRequirements?.[nextRank] || {};
    const reqPoints = req.points || 100;
    const reqShifts = req.shifts || 5;
    const reqConsistency = req.consistency || 70;
    const reqMaxWarnings = req.maxWarnings ?? 3;
    const reqAchievements = req.achievements || 0;
    const reqReputation = req.reputation || 0;

    const meetsPoints = points >= reqPoints;
    const meetsShifts = shiftCount >= reqShifts;
    const meetsConsistency = consistency >= reqConsistency;
    const meetsWarnings = warningCount <= reqMaxWarnings;
    const meetsAchievements = achievements >= reqAchievements;
    const meetsReputation = reputation >= reqReputation;

    const requirements = [
      { name: '⭐ Points', current: points, required: reqPoints, met: meetsPoints },
      { name: '🔄 Shifts', current: shiftCount, required: reqShifts, met: meetsShifts },
      { name: '📈 Consistency', current: `${consistency}%`, required: `${reqConsistency}%`, met: meetsConsistency },
      { name: '⚠️ Max Warnings', current: warningCount, required: reqMaxWarnings, met: meetsWarnings, reverse: true }
    ];

    if (reqAchievements > 0) {
      requirements.push({ name: '🏅 Achievements', current: achievements, required: reqAchievements, met: meetsAchievements });
    }
    if (reqReputation > 0) {
      requirements.push({ name: '💫 Reputation', current: reputation, required: reqReputation, met: meetsReputation });
    }

    const metCount = requirements.filter(r => r.met).length;
    const totalCount = requirements.length;
    const progress = Math.round((metCount / totalCount) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const reqList = requirements.map(r => {
      const emoji = r.met ? '✅' : '❌';
      return `${emoji} **${r.name}**: ${r.current} / ${r.required}${r.reverse ? ' (max)' : ''}`;
    }).join('\n');

    const embed = createCoolEmbed()
      .setTitle(`📈 ${user.username}'s Promotion Status`)
      .setThumbnail(user.displayAvatarURL())
      
      .addFields(
        { name: '🏆 Current Rank', value: currentRank.toUpperCase(), inline: true },
        { name: '⬆️ Next Rank', value: nextRank.toUpperCase(), inline: true },
        { name: '📊 Progress', value: `\`${progressBar}\` **${progress}%**\n${metCount}/${totalCount} requirements met`, inline: false },
        { name: '📋 Requirements', value: reqList, inline: false }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



