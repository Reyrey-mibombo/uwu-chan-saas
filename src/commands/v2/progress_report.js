const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_report')
    .setDescription('View an authentic rolling 7-day progress report')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Fetch Real Data over the last 7 days
      const [userData, recentShifts, recentActivities] = await Promise.all([
        User.findOne({ userId: targetUser.id, guildId: guildId }).lean(),
        Shift.find({ userId: targetUser.id, guildId: guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Activity.find({ userId: targetUser.id, guildId: guildId, createdAt: { $gte: sevenDaysAgo } }).lean()
      ]);

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No data profile found for <@${targetUser.id}> in this server.`)] });
      }

      // Aggregate true task metrics from Activities
      const commandTasks = recentActivities.filter(a => a.type === 'command').length;
      const ptsGainedLast7Days = recentActivities
        .filter(a => a.type === 'promotion' || a.type === 'task')
        .reduce((acc, curr) => acc + (curr.data?.amount || 0), 0);

      const embed = await createCustomEmbed(interaction, {
        title: `📈 Performance Yield: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `Rolling 7-Day operational breakdown for <@${targetUser.id}>.`,
        fields: [
          { name: '✅ Commands/Tasks', value: `\`${commandTasks}\` Completed`, inline: true },
          { name: '🔄 Shifts Delivered', value: `\`${recentShifts.length}\` Logged`, inline: true },
          { name: '⭐ Points Yield', value: `\`+${ptsGainedLast7Days}\` Points`, inline: true }
        ],
        footer: 'This report replaces legacy static strings with real aggregated math.'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Progress Report Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while querying the performance report.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
