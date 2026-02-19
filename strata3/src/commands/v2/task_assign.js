const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_assign')
    .setDescription('Assign a task to staff')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to assign task to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('task')
        .setDescription('Task description')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('points')
        .setDescription('Points reward')
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(500)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const task = interaction.options.getString('task');
    const points = interaction.options.getInteger('points') || 50;
    const guildId = interaction.guildId;

    const assignee = await User.findOne({ userId: target.id });

    if (!assignee) {
      return interaction.reply({ 
        content: `User not found in database.`,
        ephemeral: true 
      });
    }

    const activity = new Activity({
      guildId,
      userId: target.id,
      type: 'command',
      data: {
        task,
        points,
        assignedBy: interaction.user.id,
        assignedAt: new Date(),
        status: 'assigned'
      }
    });

    await activity.save();

    const embed = new EmbedBuilder()
      .setTitle('✅ Task Assigned')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Assigned To', value: `<@${target.id}>`, inline: true },
        { name: 'Task', value: task, inline: true },
        { name: 'Points Reward', value: points.toString(), inline: true },
        { name: 'Assigned By', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
