const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_bonus')
    .setDescription('See today\'s top earner and daily activity standings'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const todayActivity = await Activity.find({ guildId, createdAt: { $gte: todayStart } }).lean();

    if (!todayActivity.length) {
      return interaction.editReply('📊 No activity recorded today yet. Be the first to earn points!');
    }

    const userCounts = {};
    todayActivity.forEach(a => {
      userCounts[a.userId] = (userCounts[a.userId] || 0) + 1;
    });

    const sorted = Object.entries(userCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topUser = sorted[0];
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    const leaderboard = sorted.map(([uid, count], i) =>
      `${medals[i]} <@${uid}> — **${count}** actions today`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`🌟 Daily Activity Standings — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`)
      
      .addFields(
        { name: '🌟 Today\'s Top Earner', value: `<@${topUser[0]}> with **${topUser[1]}** actions`, inline: false },
        { name: '📊 Total Actions Today', value: todayActivity.length.toString(), inline: true },
        { name: '👥 Active Users', value: sorted.length.toString(), inline: true },
        { name: '🏆 Daily Standings', value: leaderboard }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
