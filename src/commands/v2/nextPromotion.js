const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('next_promotion')
    .setDescription('[Premium] See who is next in line for promotion within this server'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const guild = await Guild.findOne({ guildId }).lean();

      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed('This server has not configured any promotion requirements.')] });
      }

      const users = await User.find({
        guildId: guildId,
        'staff.rank': { $ne: null }
      }).lean();

      const eligible = [];
      const rankOrder = Object.keys(guild.promotionRequirements);
      // Let's ensure "member" and "trial" are considered preliminary ranks before the formal track if they exist implicitly
      if (!rankOrder.includes('member')) rankOrder.unshift('member');
      if (!rankOrder.includes('trial')) rankOrder.splice(1, 0, 'trial');

      for (const user of users) {
        const currentRank = user.staff?.rank || 'member';
        const points = user.staff?.points || 0;
        const consistency = user.staff?.consistency || 0;

        const currentIndex = rankOrder.indexOf(currentRank);
        const nextRank = rankOrder[currentIndex + 1];

        if (!nextRank || !guild.promotionRequirements[nextRank]) continue;

        const shiftCount = await Shift.countDocuments({ userId: user.userId, guildId, endTime: { $ne: null } });
        const warningCount = await Warning.countDocuments({ userId: user.userId, guildId });

        const req = guild.promotionRequirements[nextRank];
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

          let username = user.username;
          if (!username) {
            const fetched = await interaction.client.users.fetch(user.userId).catch(() => null);
            username = fetched ? fetched.username : 'Unknown';
          }

          eligible.push({
            userId: user.userId,
            username: username,
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
        return interaction.editReply({ embeds: [createErrorEmbed('No staff members are currently eligible for promotion.')] });
      }

      const top5 = eligible.slice(0, 10);
      const list = top5.map((e, i) => {
        const medals = ['', '🥇', '🥈', '🥉'];
        const medal = medals[i + 1] || `${i + 1}.`;
        return `${medal} **${e.username}** → \`${e.nextRank.toUpperCase()}\`\n└ ⭐ \`${e.points}\` 🔄 \`${e.shiftCount}\` 📈 \`${e.consistency}%\``;
      }).join('\n\n');

      const embed = await createCustomEmbed(interaction, {
        title: '📋 Next Promotion Queue',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `**${eligible.length}** staff members are ready for promotion in this server!\n\n${list}`,
        footer: 'Automatically calculating dynamic server milestones'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Next Promotion Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while calculating the promotion queue.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
