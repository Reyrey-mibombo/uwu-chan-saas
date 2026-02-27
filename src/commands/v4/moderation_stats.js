const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation_stats')
    .setDescription('View moderation statistics')
    .addStringOption(option =>
      option.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
          { name: 'All Time', value: 'all' }
        ))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter by user')
        .setRequired(false)),

  async execute(interaction) {
    const period = interaction.options.getString('period') || 'week';
    const user = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date(0);
    }

    const query = {
      guildId,
      type: { $in: ['warning', 'command'] },
      createdAt: { $gte: startDate }
    };

    if (user) {
      query.userId = user.id;
    }

    const actions = await Activity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$data.action',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = { warn: 0, ban: 0, kick: 0, mute: 0, strike: 0 };
    actions.forEach(a => {
      if (stats.hasOwnProperty(a._id)) stats[a._id] = a.count;
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`📈 Moderation Stats${user ? `: ${user.username}` : ''}`)
      
      .addFields(
        { name: 'Warnings', value: stats.warn.toString(), inline: true },
        { name: 'Bans', value: stats.ban.toString(), inline: true },
        { name: 'Kicks', value: stats.kick.toString(), inline: true },
        { name: 'Mutes', value: stats.mute.toString(), inline: true },
        { name: 'Total Actions', value: total.toString(), inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
