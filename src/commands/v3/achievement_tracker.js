const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_tracker')
    .setDescription('Track and view your achievements')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check achievements for')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.username });
      await user.save();
    }

    const achievements = user.staff?.achievements || [];
    const achievementList = [
      { id: 'first_shift', name: 'First Shift', desc: 'Complete your first shift', icon: '🎯' },
      { id: 'week_streak', name: 'Week Warrior', desc: '7 day streak', icon: '🔥' },
      { id: 'point_100', name: 'Century', desc: 'Earn 100 points', icon: '💯' },
      { id: 'point_500', name: 'High Roller', desc: 'Earn 500 points', icon: '🎰' },
      { id: 'point_1000', name: 'Point Master', desc: 'Earn 1000 points', icon: '👑' },
      { id: 'mod_note_10', name: 'Note Taker', desc: 'Write 10 mod notes', icon: '📝' },
      { id: 'alert_5', name: 'Alert Expert', desc: 'Handle 5 alerts', icon: '⚠️' },
      { id: 'promoted', name: 'Rising Star', desc: 'Get promoted', icon: '⭐' },
      { id: 'perfect_week', name: 'Perfect Week', desc: '100% attendance for a week', icon: '💎' },
      { id: 'mentor', name: 'Mentor', desc: 'Help new staff members', icon: '🎓' }
    ];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`🏆 Achievement Tracker - ${targetUser.username}`)
      
      .setThumbnail(targetUser.displayAvatarURL());

    let unlockedCount = 0;
    const unlockedAchievements = [];
    const lockedAchievements = [];

    for (const achievement of achievementList) {
      const isUnlocked = achievements.includes(achievement.id);
      if (isUnlocked) {
        unlockedCount++;
        unlockedAchievements.push(`${achievement.icon} **${achievement.name}** - ${achievement.desc}`);
      } else {
        lockedAchievements.push(`${achievement.icon} ${achievement.name} - ${achievement.desc}`);
      }
    }

    embed.addFields(
      { name: 'Progress', value: `${unlockedCount}/${achievementList.length} Unlocked`, inline: true },
      { name: 'Points', value: (user.staff?.points || 0).toString(), inline: true }
    );

    if (unlockedAchievements.length > 0) {
      embed.addFields({ name: '✅ Unlocked', value: unlockedAchievements.join('\n') || 'None', inline: false });
    }

    if (lockedAchievements.length > 0) {
      embed.addFields({ name: '🔒 Locked', value: lockedAchievements.join('\n') || 'None', inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
