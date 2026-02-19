const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time_tracking')
    .setDescription('Track time spent on duties')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const user = await User.findOne({ userId: target.id });

    const weekShifts = await Shift.find({
      guildId,
      userId: target.id,
      startTime: { $gte: weekAgo }
    });

    const monthShifts = await Shift.find({
      guildId,
      userId: target.id,
      startTime: { $gte: monthAgo }
    });

    const weekMinutes = weekShifts.reduce((sum, s) => {
      if (s.duration) return sum + s.duration;
      if (!s.endTime) {
        const ongoing = Math.round((Date.now() - new Date(s.startTime).getTime()) / 60000);
        return sum + ongoing;
      }
      return sum;
    }, 0);

    const monthMinutes = monthShifts.reduce((sum, s) => {
      if (s.duration) return sum + s.duration;
      if (!s.endTime) {
        const ongoing = Math.round((Date.now() - new Date(s.startTime).getTime()) / 60000);
        return sum + ongoing;
      }
      return sum;
    }, 0);

    const totalMinutes = user?.staff?.shiftTime || 0;

    const embed = new EmbedBuilder()
      .setTitle(`⏱️ Time Tracking: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: 'This Week', value: `${Math.round(weekMinutes)} min`, inline: true },
        { name: 'This Month', value: `${Math.round(monthMinutes)} min`, inline: true },
        { name: 'All Time', value: `${Math.round(totalMinutes)} min`, inline: true },
        { name: 'Hours (Week)', value: `${(weekMinutes / 60).toFixed(1)} hrs`, inline: true },
        { name: 'Hours (Month)', value: `${(monthMinutes / 60).toFixed(1)} hrs`, inline: true },
        { name: 'Shifts (Week)', value: weekShifts.length.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
