const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task_reassign')
    .setDescription('Forcefully migrate backend operational task IDs between operator networks.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Internal MongoDB Log Record Hash Object ID')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('new_user')
        .setDescription('Hierarchy assignee target')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Context array mapping the explicit boundary shift')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const taskId = interaction.options.getString('task_id');
      const newUser = interaction.options.getUser('new_user');
      const reason = interaction.options.getString('reason') || 'Algorithmic Reassignment Matrix';
      const guildId = interaction.guildId;
      const moderatorId = interaction.user.id;

      // Sandboxed Query ensures no external cross-server tasks get mapped here securely
      const activity = await Activity.findOne({
        _id: taskId,
        guildId,
        type: { $in: ['command', 'message', 'task'] }
      }).catch(() => null);

      if (!activity) {
        return interaction.editReply({ embeds: [createErrorEmbed(`Invalid query target. Hash \`${taskId}\` doesn't trace back to a valid task mapped on this server.`)] });
      }

      const oldUserId = activity.userId;

      activity.userId = newUser.id;
      activity.data = activity.data || {};
      activity.data.reassignedBy = moderatorId;
      activity.data.reassignedAt = new Date();
      activity.data.reason = reason;
      activity.data.previousUserId = oldUserId;
      await activity.save();

      let newUserDoc = await User.findOne({ userId: newUser.id, guildId });
      if (!newUserDoc) {
        newUserDoc = new User({
          userId: newUser.id,
          username: newUser.username,
          guildId
        });
        await newUserDoc.save();
      }

      const logTrace = new Activity({
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
      await logTrace.save();

      const embed = await createCustomEmbed(interaction, {
        title: '✅ Reassignment Sequence Resolved',
        description: `Successfully overrode array tracking metrics moving workload dependencies.`,
        thumbnail: newUser.displayAvatarURL(),
        fields: [
          { name: '🌐 Global Trace ID', value: `\`${taskId}\``, inline: false },
          { name: '🔄 Old Node Target', value: `<@${oldUserId}>`, inline: true },
          { name: '🎯 Bound Node Target', value: `<@${newUser.id}>`, inline: true },
          { name: '⚙️ Commanding Author', value: `<@${moderatorId}>`, inline: true },
          { name: '📝 Action Reason context', value: `\`${reason}\``, inline: false }
        ],
        footer: 'The chronology log has explicitly mapped parameters permanently to database timeline trackers.'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Task Reassign Error:', error);
      if (error.kind === 'ObjectId') {
        const errEmbed = createErrorEmbed(`The Hash string provided doesn't structurally align against a 12-byte trace matrix. Verification blocked.`);
        if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [errEmbed] });
        else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        return;
      }

      const errEmbed = createErrorEmbed('A database tracking error abruptly halted executing array assignment models.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
