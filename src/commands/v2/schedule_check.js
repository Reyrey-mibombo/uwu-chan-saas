const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule_check')
    .setDescription('Check your schedule')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const scheduledShifts = await Shift.find({
      guildId,
      userId: target.id,
      startTime: { $gte: new Date(), $lte: weekFromNow }
    })
      .sort({ startTime: 1 });

    const pastShifts = await Shift.find({
      guildId,
      userId: target.id,
      endTime: { $exists: true }
    })
      .sort({ startTime: -1 })
      .limit(5);

    const user = await User.findOne({ userId: target.id });
    const totalShifts = user?.staff?.shiftTime ? Math.round(user.staff.shiftTime / 60) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`📅 Schedule: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: 'Total Hours', value: `${totalShifts} hrs`, inline: true },
        { name: 'Upcoming Shifts', value: scheduledShifts.length.toString(), inline: true }
      );

    if (scheduledShifts.length > 0) {
      const upcomingList = scheduledShifts.map(shift => {
        const date = new Date(shift.startTime).toLocaleString();
        return `⏰ ${date}`;
      });
      embed.addFields({ name: 'Upcoming (7 days)', value: upcomingList.join('\n'), inline: false });
    } else {
      embed.addFields({ name: 'Upcoming (7 days)', value: 'No shifts scheduled', inline: false });
    }

    if (pastShifts.length > 0) {
      const pastList = pastShifts.map(shift => {
        const date = new Date(shift.startTime).toLocaleDateString();
        const duration = shift.duration ? `${Math.round(shift.duration / 60)}h` : 'N/A';
        return `✓ ${date} - ${duration}`;
      });
      embed.addFields({ name: 'Recent Shifts', value: pastList.join('\n'), inline: false });
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
