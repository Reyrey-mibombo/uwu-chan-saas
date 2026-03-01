const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_assign')
    .setDescription('Assign and manage trackable tasks for your staff members')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a new trackable task')
      .addUserOption(opt => opt.setName('user').setDescription('Assign to').setRequired(true))
      .addStringOption(opt => opt.setName('task').setDescription('Task description').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all pending tasks within this server'))
    .addSubcommand(sub => sub.setName('complete').setDescription('Mark an assigned task as complete')
      .addIntegerOption(opt => opt.setName('task_id').setDescription('Task ID').setRequired(true))),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const subcommand = interaction.options.getSubcommand();
      const guildId = interaction.guildId;

      let guildData = await Guild.findOne({ guildId });
      if (!guildData) {
        guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
      }

      if (!guildData.tasks) guildData.tasks = [];

      if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        const taskText = interaction.options.getString('task');

        // Unique incremental ID fallback if length shifts
        const taskId = guildData.tasks.length > 0 ? Math.max(...guildData.tasks.map(t => t.id)) + 1 : 1;

        guildData.tasks.push({
          id: taskId,
          userId: user.id,
          task: taskText,
          createdBy: interaction.user.id,
          status: 'pending',
          createdAt: new Date()
        });

        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '📋 Secure Task Assigned',
          description: `Successfully generated assignment **#${taskId}**!`,
          fields: [
            { name: '👤 Officer', value: `<@${user.id}>`, inline: true },
            { name: '🛡️ Enforcer', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🎯 Objective', value: `\`${taskText}\``, inline: false }
          ]
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'list') {
        const tasks = guildData.tasks.filter(t => t.status === 'pending');

        if (tasks.length === 0) {
          return interaction.editReply({ embeds: [createErrorEmbed('No pending tasks are currently recorded on this server.')] });
        }

        // Group tasks by mapping user chunks
        const taskMap = tasks.map(t => `> **#${t.id}** \`${t.task}\` ➔ <@${t.userId}>`);

        const embed = await createCustomEmbed(interaction, {
          title: '📋 Pending Tasks Registry',
          description: `Active operations queued across the server hierarchy:\n\n${taskMap.join('\n')}`,
          thumbnail: interaction.guild.iconURL({ dynamic: true })
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'complete') {
        const taskId = interaction.options.getInteger('task_id');
        const task = guildData.tasks.find(t => t.id === taskId);

        if (!task) {
          return interaction.editReply({ embeds: [createErrorEmbed(`Task **#${taskId}** not found in the server database.`)] });
        }

        if (task.status === 'completed') {
          return interaction.editReply({ embeds: [createErrorEmbed(`Task **#${taskId}** has already been marked completed.`)] });
        }

        task.status = 'completed';
        task.completedAt = new Date();
        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '✅ Objective Cleared',
          description: `Registry updated. Task **#${taskId}** (\`${task.task}\`) assigned to <@${task.userId}> is now completed!`
        });

        return interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Task Assign Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while modifying the assignment logs.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
