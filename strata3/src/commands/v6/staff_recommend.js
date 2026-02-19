const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_recommend')
    .setDescription('Get staff recommendations for promotion or recognition'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const users = await User.find({ 'guilds.guildId': guildId, 'staff.rank': { $ne: 'member' } });
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });
    
    const userActivity = {};
    activities.forEach(act => {
      if (act.userId) {
        userActivity[act.userId] = (userActivity[act.userId] || 0) + 1;
      }
    });

    const recommendations = users
      .map(u => {
        const activity = userActivity[u.userId] || 0;
        const score = (u.staff?.consistency || 0) * 0.4 + 
                      (u.staff?.points || 0) * 0.3 + 
                      Math.min(100, activity * 2) * 0.3;
        return { userId: u.userId, score, ...u.staff };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const embed = new EmbedBuilder()
      .setTitle('👥 Staff Recommendations')
      .setColor(0x3498db)
      .setTimestamp();

    if (recommendations.length > 0) {
      const recText = recommendations.map((r, i) => {
        const reason = r.consistency > 80 ? 'Consistency' : r.points > 100 ? 'Points' : 'Activity';
        return `${i + 1}. <@${r.userId}> - Score: ${Math.round(r.score)} (${reason})`;
      }).join('\n');
      
      embed.addFields({ name: 'Top Recommendations', value: recText, inline: false });
    } else {
      embed.addFields({ name: 'Recommendations', value: 'No staff data available', inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
