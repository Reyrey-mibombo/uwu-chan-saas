const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('next_promotion')
    .setDescription('[Premium] See who is next in line for promotion'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const users = await User.find({ 
      'guilds.guildId': guildId,
      'staff.rank': { $ne: null }
    }).lean();

    const eligible = [];

    for (const user of users) {
      const currentRank = user.staff?.rank || 'member';
      const points = user.staff?.points || 0;
      const consistency = user.staff?.consistency || 0;

      const rankOrder = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
      const currentIndex = rankOrder.indexOf(currentRank);
      const nextRank = rankOrder[currentIndex + 1];

      if (!nextRank) continue;

      const shiftCount = await Shift.countDocuments({ userId: user.userId, guildId, endTime: { $ne: null } });
      const warningCount = await Warning.countDocuments({ userId: user.userId, guildId });

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

      if (canPromote) {
        const progress = Math.round(((points / reqPoints) + (shiftCount / reqShifts) + (consistency / 100)) / 3 * 100);
        eligible.push({
          userId: user.userId,
          username: user.username,
          currentRank,
          nextRank,
          points,
          shiftCount,
          consistency,
          progress
        });
      }
    }

    eligible.sort((a, b) => b.progress - a.progress);

    if (!eligible.length) {
      const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
        .setTitle('📋 Next Promotion Queue')
        .setDescription('No one is currently eligible for promotion.')
        
        ;

      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📋 Next Promotion Queue')
      .setDescription(`**${eligible.length}** staff members ready for promotion!`)
      
      ;

    const top5 = eligible.slice(0, 10);
    const list = top5.map((e, i) => {
      const medals = ['', '🥇', '🥈', '🥉'];
      const medal = medals[i + 1] || `${i + 1}.`;
      return `${medal} **${e.username || 'Unknown'}** → ${e.nextRank.toUpperCase()}\n   ⭐${e.points} 🔄${e.shiftCount} 📈${e.consistency}%`;
    }).join('\n\n');

    embed.addFields({ name: '🎯 Ready for Promotion', value: list });

    const pending = users.filter(u => {
      const uRank = u.staff?.rank || 'member';
      return rankOrder.indexOf(uRank) < 5;
    }).length - eligible.length;

    embed;

    await interaction.editReply({ embeds: [embed] });
  }
};
