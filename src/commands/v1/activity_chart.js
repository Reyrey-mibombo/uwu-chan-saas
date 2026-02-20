const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_chart')
    .setDescription('View activity chart'),

  async execute(interaction) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activities = await Activity.find({ 
      guildId: interaction.guildId, 
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyActivity = {};
    
    activities.forEach(a => {
      const day = days[a.createdAt.getDay()];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });
    
    const maxActivity = Math.max(...Object.values(dailyActivity), 1);
    const chart = days.slice(1, 6).map(day => {
      const count = dailyActivity[day] || 0;
      const bars = Math.round((count / maxActivity) * 10);
      const barStr = '█'.repeat(bars) + '░'.repeat(10 - bars);
      return `${day}: ${barStr} ${count}`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setTitle('📈 Activity Chart (Last 5 Days)')
      .setDescription(`\`\`\`\n${chart}\n\`\`\``)
      .setColor('#2ecc71');

    await interaction.reply({ embeds: [embed] });
  }
};
