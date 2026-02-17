const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_insights')
    .setDescription('View task-related insights')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to analyze').setMinValue(7).setMaxValue(90)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ 
      guildId, 
      createdAt: { $gte: startDate },
      type: { $in: ['command', 'shift', 'warning'] }
    });

    const taskByUser = {};
    const taskByType = {};
    
    activities.forEach(act => {
      taskByUser[act.userId] = (taskByUser[act.userId] || 0) + 1;
      taskByType[act.type] = (taskByType[act.type] || 0) + 1;
    });

    const topTaskPerformer = Object.entries(taskByUser).sort((a, b) => b[1] - a[1])[0];
    const totalTasks = activities.length;
    const avgTasksPerDay = totalTasks / days;
    const avgPerUser = Object.keys(taskByUser).length > 0 
      ? totalTasks / Object.keys(taskByUser).length 
      : 0;

    const embed = new EmbedBuilder()
      .setTitle('📝 Task Insights')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Total Tasks', value: totalTasks.toString(), inline: true },
        { name: 'Avg Tasks/Day', value: avgTasksPerDay.toFixed(1), inline: true },
        { name: 'Avg Tasks/User', value: avgPerUser.toFixed(1), inline: true },
        { name: 'Active Users', value: Object.keys(taskByUser).length.toString(), inline: true }
      )
      .setTimestamp();

    if (topTaskPerformer) {
      embed.addFields({ 
        name: 'Top Performer', 
        value: `<@${topTaskPerformer[0]}> (${topTaskPerformer[1]} tasks)`, 
        inline: false 
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
