const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_reassign')
    .setDescription('Reassign a task to another user')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('ID of the task to reassign')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('new_user')
        .setDescription('User to reassign the task to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for reassignment')
        .setRequired(false)),

  async execute(interaction) {
    const taskId = interaction.options.getString('task_id');
    const newUser = interaction.options.getUser('new_user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = interaction.guildId;
    const moderatorId = interaction.user.id;

    const activity = await Activity.findOne({
      _id: taskId,
      guildId,
      type: { $in: ['command', 'message', 'task'] }
    });

    if (!activity) {
      return interaction.reply({ content: 'Task not found.', ephemeral: true });
    }

    const oldUserId = activity.userId;

    activity.userId = newUser.id;
    activity.data = activity.data || {};
    activity.data.reassignedBy = moderatorId;
    activity.data.reassignedAt = new Date();
    activity.data.reason = reason;
    activity.data.previousUserId = oldUserId;
    await activity.save();

    let newUserDoc = await User.findOne({ userId: newUser.id });
    if (!newUserDoc) {
      newUserDoc = new User({
        userId: newUser.id,
        username: newUser.username,
        guilds: [{ guildId, joinedAt: new Date() }]
      });
      await newUserDoc.save();
    }

    await Activity.create({
      guildId,
      userId: newUser.id,
      type: 'command',
      data: {
        command: 'task_reassign',
        taskId,
        previousUserId: oldUserId,
        reason,
        reassignedBy: moderatorId
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Task Reassigned')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Task ID', value: taskId, inline: true },
        { name: 'New Assignee', value: newUser.username, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
