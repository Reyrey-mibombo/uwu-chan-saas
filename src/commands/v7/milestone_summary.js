const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_summary')
    .setDescription('View your milestone progress')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    const user = await User.findOne({ userId: targetUser.id });
    const points = user?.staff?.points || 0;
    const achievements = user?.staff?.achievements || [];

    const milestones = [
      { points: 100, name: 'Rookie', achieved: points >= 100 },
      { points: 500, name: 'Regular', achieved: points >= 500 },
      { points: 1000, name: 'Veteran', achieved: points >= 1000 },
      { points: 2500, name: 'Elite', achieved: points >= 2500 },
      { points: 5000, name: 'Master', achieved: points >= 5000 },
      { points: 10000, name: 'Legend', achieved: points >= 10000 }
    ];

    const achievedMilestones = milestones.filter(m => m.achieved);
    const nextMilestone = milestones.find(m => !m.achieved);
    const progress = nextMilestone 
      ? Math.round((points / nextMilestone.points) * 100) 
      : 100;
    const bar = '█'.repeat(Math.min(Math.floor(progress / 10), 10)) + '░'.repeat(10 - Math.min(Math.floor(progress / 10), 10));

    const embed = new EmbedBuilder()
      .setTitle('🎯 Milestone Summary')
      .setColor(0x3498db)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Current Points', value: `${points}`, inline: true },
        { name: 'Rank', value: achievedMilestones.length > 0 ? achievedMilestones[achievedMilestones.length - 1].name : 'Newcomer', inline: true },
        { name: 'Next Milestone', value: nextMilestone ? `${nextMilestone.name} (${nextMilestone.points})` : 'Max Rank!', inline: true },
        { name: 'Progress', value: `\`${bar}\` ${progress}%`, inline: false },
        { name: 'Achievements', value: `${achievements.length}`, inline: true }
      );

    if (achievedMilestones.length > 0) {
      embed.addFields({ name: 'Earned Ranks', value: achievedMilestones.map(m => m.name).join(', ') });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
