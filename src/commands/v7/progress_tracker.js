const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_tracker')
    .setDescription('Track your progress')
    .addUserOption(opt => opt.setName('user').setDescription('User to track (optional)'))
    .addStringOption(opt => opt.setName('period').setDescription('Time period').addChoices(
      { name: 'Week', value: 'week' },
      { name: 'Month', value: 'month' },
      { name: 'All Time', value: 'all' }
    )),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const period = interaction.options.getString('period') || 'week';

    let days = 7;
    if (period === 'month') days = 30;
    if (period === 'all') days = 365 * 10;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const user = await User.findOne({ userId: targetUser.id });
    const activities = await Activity.find({
      userId: targetUser.id,
      guildId: interaction.guild.id,
      createdAt: { $gte: since }
    });

    const commands = activities.filter(a => a.type === 'command').length;
    const messages = activities.filter(a => a.type === 'message').length;
    const shifts = activities.filter(a => a.type === 'shift').length;
    const points = user?.staff?.points || 0;

    const progress = Math.min(100, Math.round((activities.length / 100) * 100));
    const bar = '█'.repeat(Math.min(Math.floor(progress / 10), 10)) + '░'.repeat(10 - Math.min(Math.floor(progress / 10), 10));

    const embed = new EmbedBuilder()
      .setTitle('📈 Progress Tracker')
      .setColor(0x1abc9c)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Period', value: period.charAt(0).toUpperCase() + period.slice(1), inline: true },
        { name: 'Commands Used', value: `${commands}`, inline: true },
        { name: 'Messages', value: `${messages}`, inline: true },
        { name: 'Shifts', value: `${shifts}`, inline: true },
        { name: 'Total Points', value: `${points}`, inline: true },
        { name: 'Activity Progress', value: `\`${bar}\` ${progress}%`, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
