const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

const RANK_THRESHOLDS = {
  trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_prediction')
    .setDescription('Predict which staff members are close to a rank promotion'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();

    if (!users.length) {
      return interaction.editReply('📊 No staff data found yet.');
    }

    const rankOrder = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];

    const predictions = users
      .map(u => {
        const currentRank = u.staff?.rank || 'trial';
        const points = u.staff?.points || 0;
        const currentIdx = rankOrder.indexOf(currentRank);
        const nextRank = rankOrder[currentIdx + 1];
        if (!nextRank) return null;
        const threshold = RANK_THRESHOLDS[nextRank] || 9999;
        const progress = Math.min(100, Math.round((points / threshold) * 100));
        const needed = Math.max(0, threshold - points);
        return { username: u.username || 'Unknown', userId: u.userId, currentRank, nextRank, points, threshold, progress, needed };
      })
      .filter(Boolean)
      .filter(p => p.progress >= 50) // Only show those >= 50% of the way
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 8);

    if (!predictions.length) {
      return interaction.editReply('📊 No staff are currently close to a promotion (need 50%+ progress).');
    }

    const fields = predictions.map(p => {
      const bar = '▓'.repeat(Math.round(p.progress / 10)) + '░'.repeat(10 - Math.round(p.progress / 10));
      return {
        name: `${p.username} (${p.currentRank} → ${p.nextRank})`,
        value: `\`${bar}\` **${p.progress}%** | ${p.points}/${p.threshold} pts | Need **${p.needed}** more`,
        inline: false
      };
    });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🔮 Staff Promotion Predictions')
      
      .setDescription('Staff members close to their next rank promotion:')
      .addFields(fields)
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
