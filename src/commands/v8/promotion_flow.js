const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_flow')
    .setDescription('Visual promotion flow showing rank progression path'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
    const THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
    const user = await User.findOne({ userId: interaction.user.id }).lean();
    const currentRank = user?.staff?.rank || 'trial';
    const pts = user?.staff?.points || 0;
    const rankEmojis = { trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑', owner: '🏆' };

    const flow = RANK_ORDER.map(rank => {
      const threshold = THRESHOLDS[rank];
      let status = '⬜';
      if (rank === currentRank) status = '🔵';
      else if (pts >= threshold && RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(currentRank)) status = '✅';
      else if (pts >= threshold) status = '🟢';
      return `${status} ${rankEmojis[rank]} **${rank.toUpperCase()}** (${threshold} pts)`;
    }).join('\n↓\n');

    const embed = new EmbedBuilder()
      .setTitle('⬆️ Promotion Flow')
      .setColor(0x9b59b6)
      .setDescription(flow)
      .addFields(
        { name: '⭐ Your Points', value: pts.toString(), inline: true },
        { name: '🎖️ Current Rank', value: currentRank.toUpperCase(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • 🔵 = Current | ✅ = Achieved | 🟢 = Unlocked` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
