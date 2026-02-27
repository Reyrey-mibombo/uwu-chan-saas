const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_insights')
    .setDescription('View daily insights and statistics'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: today, $lt: tomorrow }
    }).lean();

    const shifts = await Shift.find({
      guildId,
      startTime: { $gte: today, $lt: tomorrow }
    }).lean();

    const commandCount = activities.filter(a => a.type === 'command').length;
    const messageCount = activities.filter(a => a.type === 'message').length;
    const warningCount = activities.filter(a => a.type === 'warning').length;

    const activeStaff = [...new Set(shifts.map(s => s.userId))];
    const totalShiftHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

    const users = await User.find({
      'guilds.guildId': guildId
    }).lean();

    const staffWithActivity = users.filter(u => {
      const todayActivity = activities.find(a => a.userId === u.userId);
      return todayActivity;
    });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Daily Insights')
      
      .setDescription(`Statistics for ${interaction.guild.name} - ${today.toDateString()}`)
      ;

    embed.addFields(
      { name: 'Commands Used', value: commandCount.toString(), inline: true },
      { name: 'Messages', value: messageCount.toString(), inline: true },
      { name: 'Warnings', value: warningCount.toString(), inline: true },
      { name: 'Active Staff', value: activeStaff.length.toString(), inline: true },
      { name: 'Total Shift Hours', value: totalShiftHours.toFixed(1), inline: true },
      { name: 'Staff with Activity', value: staffWithActivity.length.toString(), inline: true }
    );

    if (activeStaff.length > 0) {
      const staffList = await Promise.all(activeStaff.slice(0, 5).map(async userId => {
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        return user?.username || 'Unknown';
      }));
      embed.addFields({ name: 'Active Staff Members', value: staffList.join(', '), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
