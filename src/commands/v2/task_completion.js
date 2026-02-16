const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_completion')
    .setDescription('View task completion stats')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const assignedTasks = await Activity.find({
      guildId,
      userId: target.id,
      'data.task': { $exists: true }
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const completedTasks = assignedTasks.filter(t => t.data?.status === 'completed').length;
    const totalTasks = assignedTasks.length;
    const weekTasks = await Activity.countDocuments({
      guildId,
      userId: target.id,
      'data.task': { $exists: true },
      createdAt: { $gte: weekAgo }
    });

    const user = await User.findOne({ userId: target.id });
    const totalPoints = user?.staff?.points || 0;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`✅ Task Completion: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Total Tasks', value: totalTasks.toString(), inline: true },
        { name: 'Completed', value: completedTasks.toString(), inline: true },
        { name: 'This Week', value: weekTasks.toString(), inline: true },
        { name: 'Completion Rate', value: `${completionRate}%`, inline: true },
        { name: 'Total Points from Tasks', value: totalPoints.toString(), inline: true }
      );

    if (assignedTasks.length > 0) {
      const taskList = assignedTasks.slice(0, 5).map(t => {
        const status = t.data?.status === 'completed' ? '✓' : '⏳';
        const task = t.data?.task || 'Unknown task';
        return `${status} ${task.substring(0, 40)}`;
      });
      embed.addFields({ name: 'Recent Tasks', value: taskList.join('\n'), inline: false });
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
