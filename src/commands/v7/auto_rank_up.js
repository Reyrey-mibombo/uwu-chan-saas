const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
const RANK_THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rank_up')
    .setDescription('Show all staff who qualify for an automatic rank-up'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();

    if (!users.length) {
      return interaction.editReply('📊 No staff data available yet.');
    }

    const eligible = users
      .map(u => {
        const currentRank = u.staff?.rank || 'trial';
        const points = u.staff?.points || 0;
        const currentIdx = RANK_ORDER.indexOf(currentRank);
        const nextRank = RANK_ORDER[currentIdx + 1];
        if (!nextRank) return null;
        const threshold = RANK_THRESHOLDS[nextRank];
        if (points >= threshold) return { userId: u.userId, username: u.username || 'Unknown', currentRank, nextRank, points, threshold };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.points - a.points);

    if (!eligible.length) {
      return interaction.editReply('📊 No staff currently qualify for an automatic rank-up. Keep earning points!');
    }

    const listText = eligible.map((e, i) =>
      `\`${String(i + 1).padStart(2)}\` **${e.username}** — ${e.currentRank} → **${e.nextRank}** (${e.points}/${e.threshold} pts ✅)`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('⬆️ Automatic Rank-Up Eligible Staff')
      .setColor(0x2ecc71)
      .setDescription(listText)
      .addFields(
        { name: '✅ Eligible Count', value: eligible.length.toString(), inline: true },
        { name: '📌 Next Step', value: 'Use `/rank_announce` to officially promote them', inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Rank-Up System` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
