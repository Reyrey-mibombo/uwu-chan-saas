const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_achievement')
    .setDescription('[Premium] Add an achievement to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('User')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('achievement')
        .setDescription('Achievement title')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Achievement category')
        .addChoices(
          { name: '🏆 Monthly Award', value: 'MONTHLY' },
          { name: '🛡 Moderation', value: 'MOD' },
          { name: '🎫 Support', value: 'SUPPORT' },
          { name: '🚀 Activity', value: 'ACTIVITY' },
          { name: '👑 Leadership', value: 'LEADERSHIP' },
          { name: '💎 Special', value: 'SPECIAL' }
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const title = interaction.options.getString('achievement').trim();
      const category = interaction.options.getString('category');

      const formattedAchievement = `[${category}] ${title}`;

      let user = await User.findOne({ userId: targetUser.id });

      if (!user) {
        user = new User({
          userId: targetUser.id,
          username: targetUser.tag,
          staff: { achievements: [] }
        });
      }

      if (!user.staff) user.staff = {};
      if (!user.staff.achievements) user.staff.achievements = [];

      if (user.staff.achievements.includes(formattedAchievement)) {
        return interaction.reply({
          content: `⚠️ User already has this achievement.`,
          ephemeral: true
        });
      }

      user.staff.achievements.push(formattedAchievement);
      await user.save();

      const embed = new EmbedBuilder()
        .setColor('#f1c40f')
        .setTitle('🏆 Staff Award Granted')
        .addFields(
          { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
          { name: '🏅 Award', value: formattedAchievement, inline: false },
          { name: '📊 Total Awards', value: `${user.staff.achievements.length}`, inline: true }
        )
        .setFooter({ text: `Granted by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ Error adding achievement.', ephemeral: true });
    }
  }
};