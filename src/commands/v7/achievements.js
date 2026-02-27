const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('[Enterprise] View achievements and badges')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userData = await User.findOne({ userId: user.id });

    const achievements = userData?.staff?.achievements || [];
    const points = userData?.staff?.points || 0;

    const allAchievements = [
      { name: '🌟 First Shift', desc: 'Complete your first shift', req: 1 },
      { name: '⏰ Night Owl', desc: 'Work 50 hours', req: 180000 },
      { name: '🎯 Dedicated', desc: 'Earn 100 points', req: 100 },
      { name: '👑 Top Performer', desc: 'Reach 500 points', req: 500 },
      { name: '🏆 Champion', desc: 'Reach 1000 points', req: 1000 }
    ];

    const earned = allAchievements.filter(a => {
      if (a.req <= 1) return achievements.includes(a.name);
      return points >= a.req;
    });

    const list = allAchievements.map(a => {
      const isEarned = earned.some(e => e.name === a.name);
      return `${isEarned ? '✅' : '❌'} **${a.name}** - ${a.desc}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`🏅 Achievements - ${user.username}`)
      .setDescription(list)
      .addFields(
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '🏆 Earned', value: `${earned.length}/${allAchievements.length}`, inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
