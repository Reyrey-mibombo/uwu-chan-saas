const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('detailed_profile')
    .setDescription('View detailed profile of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view profile for')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({
        userId: targetUser.id,
        username: targetUser.username,
        globalName: targetUser.globalName,
        guilds: [{ guildId, joinedAt: new Date() }]
      });
      await user.save();
    }

    const activities = await Activity.find({
      guildId,
      userId: targetUser.id
    }).sort({ createdAt: -1 }).limit(10).lean();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentShifts = await Shift.find({
      guildId,
      userId: targetUser.id,
      startTime: { $gte: thirtyDaysAgo }
    }).lean();

    const totalShifts = recentShifts.length;
    const completedShifts = recentShifts.filter(s => s.endTime).length;
    const totalHours = recentShifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`👤 ${targetUser.username}'s Detailed Profile`)
      
      .setThumbnail(targetUser.displayAvatarURL());

    const rank = user.staff?.rank || 'member';
    const points = user.staff?.points || 0;
    const warnings = user.staff?.warnings || 0;
    const consistency = user.staff?.consistency || 100;
    const reputation = user.staff?.reputation || 0;
    const achievements = user.staff?.achievements || [];

    embed.addFields(
      { name: 'User ID', value: targetUser.id, inline: true },
      { name: 'Joined Discord', value: targetUser.createdAt.toDateString(), inline: true }
    );

    embed.addFields(
      { name: 'Rank', value: rank.charAt(0).toUpperCase() + rank.slice(1), inline: true },
      { name: 'Points', value: points.toString(), inline: true },
      { name: 'Warnings', value: warnings.toString(), inline: true },
      { name: 'Consistency', value: `${consistency}%`, inline: true },
      { name: 'Reputation', value: reputation.toString(), inline: true },
      { name: 'Achievements', value: achievements.length.toString(), inline: true }
    );

    embed.addFields(
      { name: 'Shifts (30d)', value: totalShifts.toString(), inline: true },
      { name: 'Completed', value: completedShifts.toString(), inline: true },
      { name: 'Hours', value: totalHours.toFixed(1), inline: true }
    );

    if (activities.length > 0) {
      const recentActivity = activities.map(a => {
        const date = new Date(a.createdAt).toLocaleDateString();
        return `**${a.type}** - ${date}`;
      });
      embed.addFields({ name: 'Recent Activity', value: recentActivity.join('\n'), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
