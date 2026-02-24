const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_summary')
    .setDescription('View bonus points awarded to staff this month'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const bonusActivities = await Activity.find({
      guildId,
      type: 'promotion',
      createdAt: { $gte: thirtyDaysAgo }
    }).lean();

    if (!bonusActivities.length) {
      return interaction.editReply('📊 No bonus events recorded this month.');
    }

    const bonusByUser = {};
    bonusActivities.forEach(a => {
      bonusByUser[a.userId] = (bonusByUser[a.userId] || 0) + (a.data?.bonusPoints || 10);
    });

    const sorted = Object.entries(bonusByUser).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const totalBonus = Object.values(bonusByUser).reduce((s, v) => s + v, 0);

    const leaderboard = sorted.map(([uid, pts], i) =>
      `\`${String(i + 1).padStart(2)}\` <@${uid}> — **+${pts}** bonus pts`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🎁 Bonus Point Summary — This Month')
      .setColor(0x27ae60)
      .addFields(
        { name: '🎁 Total Bonus Events', value: bonusActivities.length.toString(), inline: true },
        { name: '⭐ Total Bonus Points', value: totalBonus.toString(), inline: true },
        { name: '👥 Recipients', value: sorted.length.toString(), inline: true },
        { name: '🏆 Bonus Leaderboard', value: leaderboard }
      )
      .setFooter({ text: `${interaction.guild.name} • Monthly Bonus Summary` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
