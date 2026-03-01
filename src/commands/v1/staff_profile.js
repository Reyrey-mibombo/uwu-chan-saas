const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View staff member profile')
    .addUserOption(opt => opt.setName('user').setDescription('The staff member').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const points = await staffSystem.getPoints(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);
      const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);
      const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);

      // Fetch global level/XP
      const { User } = require('../../database/mongo');
      const { createRadarChart } = require('../../utils/charts');

      const dbUser = await User.findOne({ userId: user.id });
      const xp = dbUser?.stats?.xp || 0;
      const level = dbUser?.stats?.level || 1;

      // Generate Visual Radar Chart
      const warningPenalty = Math.max(0, 100 - ((warnings?.total || 0) * 20));
      const activityScore = Math.min(100, points > 0 ? (points / 50) * 100 : 0);
      const xpScore = Math.min(100, (level / 10) * 100);

      const chartUrl = createRadarChart(
        ['Overall Score', 'Shift Activity', 'Behavior', 'Bot Engagement'],
        [score || 0, activityScore, warningPenalty, xpScore],
        'Staff Skills'
      );

      const embed = createCoolEmbed()
        .setTitle(`👤 ${user.username}'s Staff Profile`)
        .setThumbnail(user.displayAvatarURL())
        .setImage(chartUrl)
        .addFields(
          { name: '📛 Username', value: user.username, inline: true },
          { name: '🏷️ Nickname', value: member?.nickname || 'None', inline: true },
          { name: '📅 Joined Server', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
          { name: '⭐ Points', value: `${points}`, inline: true },
          { name: '🏆 Rank', value: rank, inline: true },
          { name: '📈 Score', value: `${score || 0}/100`, inline: true },
          { name: '⚠️ Warnings', value: `${warnings?.total || 0}`, inline: true },
          { name: '🎮 Global Level', value: `Level ${level}\n*(${xp} XP)*`, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the staff profile.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
