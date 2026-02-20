const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_chart')
    .setDescription('View achievement distribution across all staff'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 'staff.achievements': { $exists: true, $ne: [] } }).lean();

    if (!users.length) {
      return interaction.editReply('🏅 No achievements earned yet. Staff earn achievements through consistent performance!');
    }

    const achievementCounts = {};
    users.forEach(u => {
      (u.staff?.achievements || []).forEach(a => {
        achievementCounts[a] = (achievementCounts[a] || 0) + 1;
      });
    });

    const sorted = Object.entries(achievementCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = sorted.length ? sorted[0][1] : 1;

    const chart = sorted.length
      ? sorted.map(([name, count]) => {
        const bar = '▓'.repeat(Math.round((count / max) * 8)) + '░'.repeat(8 - Math.round((count / max) * 8));
        return `\`${bar}\` **${count}x** — ${name}`;
      }).join('\n')
      : 'No achievements recorded.';

    const totalAchievements = Object.values(achievementCounts).reduce((s, v) => s + v, 0);
    const avgPerStaff = users.length > 0 ? (totalAchievements / users.length).toFixed(1) : '0';

    const embed = new EmbedBuilder()
      .setTitle('🏅 Achievement Distribution Chart')
      .setColor(0xf1c40f)
      .addFields(
        { name: '🎖️ Total Achievements Earned', value: totalAchievements.toString(), inline: true },
        { name: '👥 Staff with Achievements', value: users.length.toString(), inline: true },
        { name: '📊 Avg per Staff', value: avgPerStaff, inline: true },
        { name: '📈 Top Achievements', value: chart }
      )
      .setFooter({ text: `${interaction.guild.name} • Achievement Chart` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
