const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_dashboard')
    .setDescription('View analytics dashboard'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    const guildDoc = await Guild.findOne({ guildId });
    const isPremium = guildDoc?.premium?.isActive;

    if (!isPremium) {
      await interaction.reply({ content: 'Analytics dashboard requires Premium subscription.' });
      return;
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [weekActivities, monthActivities, totalUsers] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: weekAgo } }),
      Activity.find({ guildId, createdAt: { $gte: monthAgo } }),
      User.countDocuments({ 'guilds.guildId': guildId })
    ]);

    const weekMessages = weekActivities.filter(a => a.type === 'message').length;
    const weekCommands = weekActivities.filter(a => a.type === 'command').length;
    const weekActiveUsers = new Set(weekActivities.map(a => a.userId)).size;

    const monthMessages = monthActivities.filter(a => a.type === 'message').length;
    const monthCommands = monthActivities.filter(a => a.type === 'command').length;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Analytics Dashboard')
      
      .addFields(
        { name: 'This Week', value: '---', inline: false },
        { name: 'Messages', value: weekMessages.toLocaleString(), inline: true },
        { name: 'Commands', value: weekCommands.toLocaleString(), inline: true },
        { name: 'Active Users', value: weekActiveUsers.toString(), inline: true },
        { name: 'This Month', value: '---', inline: false },
        { name: 'Messages', value: monthMessages.toLocaleString(), inline: true },
        { name: 'Commands', value: monthCommands.toLocaleString(), inline: true },
        { name: 'Total Users', value: totalUsers.toString(), inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
