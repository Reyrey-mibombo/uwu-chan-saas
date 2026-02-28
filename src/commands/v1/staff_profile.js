const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View staff member profile')
    .addUserOption(opt => opt.setName('user').setDescription('The staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
    const staffSystem = client.systems.staff;

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
    const warningPenalty = Math.max(0, 100 - (warnings.total * 20));
    const activityScore = Math.min(100, points > 0 ? (points / 50) * 100 : 0);
    const xpScore = Math.min(100, (level / 10) * 100);

    const chartUrl = createRadarChart(
      ['Overall Score', 'Shift Activity', 'Behavior', 'Bot Engagement'],
      [score || 0, activityScore, warningPenalty, xpScore],
      'Staff Skills'
    );

    const embed = createCoolEmbed({
      title: `👤 ${user.username}'s Profile`,
      thumbnail: user.displayAvatarURL(),
      image: chartUrl,
      color: 'info'
    }).addFields(
      { name: '📛 Username', value: user.username, inline: true },
      { name: '🏷️ Nickname', value: member?.nickname || 'None', inline: true },
      { name: '📅 Joined Server', value: member?.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
      { name: '⭐ Points', value: `${points}`, inline: true },
      { name: '🏆 Rank', value: rank, inline: true },
      { name: '📈 Score', value: `${score}/100`, inline: true },
      { name: '⚠️ Warnings', value: `${warnings.total}`, inline: true },
      { name: '🎮 Bot Level', value: `Level ${level}\n*${xp} XP*`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  }
};
