const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notification_effect')
    .setDescription('View notification effects and history')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to look back (default 7)').setMinValue(1).setMaxValue(30)),
  async execute(interaction) {
    const days = interaction.options.getInteger('days') || 7;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await Activity.find({
      guildId,
      type: { $in: ['notification', 'reminder', 'alert'] },
      createdAt: { $gte: startDate }
    }).sort({ createdAt -1 });

    const notificationCounts = {};
    const userNotifications = {};
    activities.forEach(a => {
      const notifType = a.data?.notificationType || 'general';
      notificationCounts[notifType] = (notificationCounts[notifType] || 0) + 1;
      userNotifications[a.userId] = (userNotifications[a.userId] || 0) + 1;
    });

    const totalNotifications = activities.length;
    const uniqueRecipients = Object.keys(userNotifications).length;

    const topRecipients = Object.entries(userNotifications)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const embed = new EmbedBuilder()
      .setTitle('🔔 Notification Effects')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Total Sent', value: `${totalNotifications}`, inline: true },
        { name: 'Unique Recipients', value: `${uniqueRecipients}`, inline: true },
        { name: 'Avg Per User', value: uniqueRecipients > 0 ? `${(totalNotifications / uniqueRecipients).toFixed(1)}` : '0', inline: true }
      );

    if (Object.keys(notificationCounts).length > 0) {
      const typeList = Object.entries(notificationCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `${type}: ${count}`)
        .join('\n');
      embed.addFields({ name: 'By Type', value: typeList, inline: false });
    }

    if (topRecipients.length > 0) {
      const recipientList = await Promise.all(
        topRecipients.map(async ([userId, count]) => {
          const user = await interaction.client.users.fetch(userId).catch(() => null);
          const name = user ? user.username : `User ${userId}`;
          return `${name}: ${count}`;
        })
      );
      embed.addFields({ name: 'Top Recipients', value: recipientList.join('\n'), inline: false });
    }

    if (totalNotifications === 0) {
      embed.setDescription('No notifications sent in this period.');
    }

    await interaction.reply({ embeds: [embed] });
  }
};
