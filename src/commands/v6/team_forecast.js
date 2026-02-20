const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_forecast')
    .setDescription('View team-level activity forecast for the next 7 days'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: fourteenDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('📊 Not enough team activity data for a forecast.');
    }

    const userActivity = {};
    activities.forEach(a => {
      userActivity[a.userId] = (userActivity[a.userId] || 0) + 1;
    });

    const activeCount = Object.keys(userActivity).length;
    const avgPerUser = activeCount > 0 ? (activities.length / activeCount).toFixed(1) : '0';

    // Weekly avg
    const halfWayPoint = activities.length / 2;
    const firstWeek = activities.filter(a => new Date(a.createdAt) < new Date(Date.now() - 7 * 86400000)).length;
    const secondWeek = activities.length - firstWeek;
    const trend = secondWeek - firstWeek;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekly = (secondWeek / 7);

    const lines = [];
    for (let i = 1; i <= 7; i++) {
      const day = new Date(now.getTime() + i * 86400000);
      const dayOfWeek = day.getDay();
      // Weekends slightly lower
      const multiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.15;
      const predicted = Math.max(0, Math.round((weekly + trend * 0.05 * i) * multiplier));
      const bar = '█'.repeat(Math.min(10, Math.round(predicted / Math.max(weekly * 2, 1) * 10)));
      lines.push(`${dayNames[dayOfWeek]} ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${bar.padEnd(10)} ~${predicted} events`);
    }

    const embed = new EmbedBuilder()
      .setTitle('👥 Team Activity Forecast — Next 7 Days')
      .setColor(0x2980b9)
      .setDescription(`\`\`\`${lines.join('\n')}\`\`\``)
      .addFields(
        { name: '👥 Active Team Members (14d)', value: activeCount.toString(), inline: true },
        { name: '📊 Avg Events/Member', value: avgPerUser, inline: true },
        { name: '📈 Trend', value: trend > 0 ? `+${trend} from last week` : `${trend} from last week`, inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Team Forecast` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
