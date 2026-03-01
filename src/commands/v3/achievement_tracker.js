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

      const progress = Math.round((unlockedCount / achievementList.length) * 100);
      const filled = Math.floor(progress / 10);
      const progressBar = `\`${'■'.repeat(filled)}${'□'.repeat(10 - filled)}\` **${progress}%**`;

      const embed = await createCustomEmbed(interaction, {
        title: `🏆 Personnel Achievement Matrix: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Operational Milestone Registry\nReviewing unlocked achievements authenticated within sector **${interaction.guild.name}**. Cross-referencing personnel behavior logs.`,
        fields: [
          { name: '🔋 Unlocked Trajectory', value: progressBar, inline: true },
          { name: '⭐ Strategic Points', value: `\`${(user.staff.points || 0).toLocaleString()}\``, inline: true },
          { name: '✨ Level Clearance', value: `\`LVL ${user.staff.level || 1}\``, inline: true },
          { name: '✅ Operational Unlocks', value: unlockedAchievements.join('\n') || '*No authenticated milestones detected.*', inline: false },
          { name: '🔒 Classified Objectives', value: lockedAchievements.join('\n'), inline: false }
        ],
        footer: 'Continuous operational execution required for high-tier unlocks. • V3 Strategic',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Achievement Tracker Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Milestone Registry failure: Unable to decode personnel achievement arrays.')] });
    }
  }
};
