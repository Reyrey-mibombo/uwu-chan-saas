const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_effects')
    .setDescription('View milestone effects and rewards')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const achievements = user?.staff?.achievements || [];
    const points = user?.staff?.points || 0;

    const milestoneTiers = [
      { threshold: 100, name: 'Bronze Milestone', reward: 'Bronze Badge' },
      { threshold: 500, name: 'Silver Milestone', reward: 'Silver Badge' },
      { threshold: 1000, name: 'Gold Milestone', reward: 'Gold Badge' },
      { threshold: 5000, name: 'Platinum Milestone', reward: 'Platinum Badge' },
      { threshold: 10000, name: 'Diamond Milestone', reward: 'Diamond Badge' }
    ];

    const earnedMilestones = milestoneTiers.filter(m => points >= m.threshold);
    const nextMilestone = milestoneTiers.find(m => m.threshold > points);
    const progress = nextMilestone ? Math.min((points / nextMilestone.threshold) * 100, 100).toFixed(1) : 100;

    const embed = new EmbedBuilder()
      .setTitle(`🎆 Milestone Effects - ${targetUser.username}`)
      .setColor(0xff6b6b)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Current Points', value: `${points}`, inline: true },
        { name: 'Milestones Earned', value: `${earnedMilestones.length}`, inline: true },
        { name: 'Progress to Next', value: `${progress}%`, inline: true }
      );

    if (earnedMilestones.length > 0) {
      const earnedList = earnedMilestones.map(m => `✅ ${m.name} - ${m.reward}`).join('\n');
      embed.addFields({ name: 'Earned Milestones', value: earnedList, inline: false });
    }

    if (nextMilestone) {
      const remaining = nextMilestone.threshold - points;
      embed.addFields({ name: 'Next Milestone', value: `${nextMilestone.name} (${remaining} pts away)`, inline: false });
    } else {
      embed.addFields({ name: 'Next Milestone', value: '🎉 All milestones achieved!', inline: false });
    }

    if (achievements.length > 0) {
      embed.addFields({ name: 'Achievements', value: achievements.join(', '), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
