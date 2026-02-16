const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_tracker')
    .setDescription('Track your milestones and progress')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const points = user?.staff?.points || 0;
    const achievements = user?.staff?.achievements || [];
    const reputation = user?.staff?.reputation || 0;
    const consistency = user?.staff?.consistency || 100;

    const milestones = [
      { threshold: 10, name: 'First Steps', emoji: '🌱' },
      { threshold: 50, name: 'Getting Started', emoji: '⭐' },
      { threshold: 100, name: 'Century Club', emoji: '💯' },
      { threshold: 250, name: 'Rising Star', emoji: '🌟' },
      { threshold: 500, name: 'Half Grand', emoji: '🎯' },
      { threshold: 1000, name: 'Grand Achiever', emoji: '🏆' },
      { threshold: 2500, name: 'Elite Member', emoji: '👑' },
      { threshold: 5000, name: 'Legend', emoji: '🔥' },
      { threshold: 10000, name: 'Mythic', emoji: '💎' },
      { threshold: 25000, name: 'Immortal', emoji: '⚡' }
    ];

    const progress = milestones.map(m => {
      const achieved = points >= m.threshold;
      const progressPct = Math.min((points / m.threshold) * 100, 100);
      return { ...m, achieved, progress: achieved ? 100 : progressPct };
    });

    const achievedCount = progress.filter(m => m.achieved).length;

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Milestone Tracker - ${targetUser.username}`)
      .setColor(0x3498db)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Total Points', value: `${points}`, inline: true },
        { name: 'Milestones Achieved', value: `${achievedCount}/${milestones.length}`, inline: true },
        { name: 'Reputation', value: `${reputation}`, inline: true },
        { name: 'Consistency', value: `${consistency}%`, inline: true }
      );

    const milestoneDisplay = progress.map(m => {
      const status = m.achieved ? '✅' : '⬜';
      const bar = m.achieved ? '██████████' : '█'.repeat(Math.floor(m.progress / 10)) + '░'.repeat(10 - Math.floor(m.progress / 10));
      return `${status} ${m.emoji} ${m.name}: ${bar} ${m.threshold}pts`;
    }).join('\n');

    embed.addFields({ name: 'Milestone Progress', value: `\`\`\`\n${milestoneDisplay}\n\`\`\``, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
