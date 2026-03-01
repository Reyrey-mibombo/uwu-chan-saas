const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_tracker')
    .setDescription('Track and view custom staff achievements securely mapped to this server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check achievements for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      let user = await User.findOne({ userId: targetUser.id, guildId: guildId }).lean();
      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff records exist for <@${targetUser.id}> in this server.`)] });
      }

      const achievements = user.staff.achievements || [];
      const achievementList = [
        { id: 'first_shift', name: 'First Shift', desc: 'Completed the first shift', icon: '🎯' },
        { id: 'week_streak', name: 'Week Warrior', desc: 'Secured a rolling 7-Day streak', icon: '🔥' },
        { id: 'point_100', name: 'Century', desc: 'Accumulated 100 timeline points', icon: '💯' },
        { id: 'point_500', name: 'High Roller', desc: 'Accumulated 500 timeline points', icon: '🎰' },
        { id: 'point_1000', name: 'Point Master', desc: 'Accumulated 1000 timeline points', icon: '👑' },
        { id: 'mod_note_10', name: 'Note Taker', desc: 'Penned 10 authentic mod notes', icon: '📝' },
        { id: 'alert_5', name: 'Alert Expert', desc: 'Processed 5 background alerts', icon: '⚠️' },
        { id: 'promoted', name: 'Rising Star', desc: 'Achieved an initial promotion step', icon: '⭐' },
        { id: 'perfect_week', name: 'Perfect Week', desc: '100% attendance retention', icon: '💎' },
        { id: 'mentor', name: 'Mentor', desc: 'Aided an onboarding prospect', icon: '🎓' }
      ];

      let unlockedCount = 0;
      const unlockedAchievements = [];
      const lockedAchievements = [];

      for (const achievement of achievementList) {
        const isUnlocked = achievements.includes(achievement.id) || achievements.includes(achievement.name);
        if (isUnlocked) {
          unlockedCount++;
          unlockedAchievements.push(`${achievement.icon} **${achievement.name}** - \`${achievement.desc}\``);
        } else {
          lockedAchievements.push(`${achievement.icon} ${achievement.name} - *${achievement.desc}*`);
        }
      }

      const embed = await createCustomEmbed(interaction, {
        title: `🏆 Achievement Tracker: ${targetUser.username}`,
        description: `Reviewing unlocked milestones authenticated within **${interaction.guild.name}**.`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: '📊 Timeline Progress', value: `\`${unlockedCount}/${achievementList.length}\` Unlocked`, inline: true },
          { name: '⭐ Validated Points', value: `\`${user.staff.points || 0}\` Acquired`, inline: true },
          { name: '✅ Server Unlocks', value: unlockedAchievements.join('\n') || '*None yet.*', inline: false },
          { name: '🔒 Hidden Objectives', value: lockedAchievements.join('\n'), inline: false }
        ],
        footer: 'Keep executing shifts to unlock more tiers.'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Achievement Tracker Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while fetching the achievement arrays.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
