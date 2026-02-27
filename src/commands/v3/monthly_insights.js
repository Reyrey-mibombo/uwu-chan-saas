const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_insights')
    .setDescription('View monthly insights and statistics'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: firstOfMonth }
    }).lean();

    const shifts = await Shift.find({
      guildId,
      startTime: { $gte: firstOfMonth }
    }).lean();

    const commandCount = activities.filter(a => a.type === 'command').length;
    const messageCount = activities.filter(a => a.type === 'message').length;
    const warningCount = activities.filter(a => a.type === 'warning').length;
    const promotionCount = activities.filter(a => a.type === 'promotion').length;

    const activeStaff = [...new Set(shifts.map(s => s.userId))];
    const totalShiftHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 60;

    const users = await User.find({
      'guilds.guildId': guildId
    }).lean();

    const totalStaff = users.length;
    const activeThisMonth = users.filter(u => {
      const userActivity = activities.find(a => a.userId === u.userId);
      return userActivity;
    });

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthActivities = await Activity.find({
      guildId,
      createdAt: { $gte: lastMonth, $lt: firstOfMonth }
    }).lean();

    const commandChange = lastMonthActivities.length > 0 
      ? ((commandCount - lastMonthActivities.filter(a => a.type === 'command').length) / lastMonthActivities.filter(a => a.type === 'command').length * 100).toFixed(1)
      : 0;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Monthly Insights')
      
      .setDescription(`Statistics for ${interaction.guild.name} - ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`)
      ;

    embed.addFields(
      { name: 'Commands Used', value: commandCount.toString(), inline: true },
      { name: 'Messages', value: messageCount.toString(), inline: true },
      { name: 'Warnings', value: warningCount.toString(), inline: true },
      { name: 'Promotions', value: promotionCount.toString(), inline: true }
    );

    embed.addFields(
      { name: 'Total Staff', value: totalStaff.toString(), inline: true },
      { name: 'Active This Month', value: activeThisMonth.length.toString(), inline: true },
      { name: 'Shift Hours', value: totalShiftHours.toFixed(1), inline: true }
    );

    embed.addFields(
      { name: 'Command Change', value: `${commandChange > 0 ? '📈' : '📉'} ${Math.abs(commandChange)}%`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  }
};
