const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { createPieChart } = require('../../utils/charts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_log')
    .setDescription('View a detailed visual log of recent server activity')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries (max 50)').setRequired(false))
    .addUserOption(opt => opt.setName('user').setDescription('Filter activity to a specific user').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const limit = Math.min(interaction.options.getInteger('limit') || 10, 50);
    const targetUser = interaction.options.getUser('user');

    const Activity = require('../../database/mongo').Activity;

    // Construct query based on optional user filter
    const query = { guildId: interaction.guildId };
    if (targetUser) {
      query.userId = targetUser.id;
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    if (activities.length === 0) {
      return interaction.editReply({ content: 'No activity recorded yet for these filters.', ephemeral: true });
    }

    // Process types for pie chart
    const typeCounts = {};

    const activityList = await Promise.all(activities.map(async (a) => {
      const typeStr = a.type || 'unknown';
      typeCounts[typeStr] = (typeCounts[typeStr] || 0) + 1;

      const user = await interaction.client.users.fetch(a.userId).catch(() => null);
      const userName = user?.username || 'Unknown';
      let action = a.type || 'ACTIVITY';
      if (a.data?.action) action += ` (${a.data.action})`;

      // Select emoji based on type
      const actionUpper = action.toUpperCase();
      let emoji = '🔹';
      if (actionUpper.includes('MESSAGE')) emoji = '💬';
      else if (actionUpper.includes('JOIN')) emoji = '👋';
      else if (actionUpper.includes('SHIFT')) emoji = '⏱️';
      else if (actionUpper.includes('MOD') || actionUpper.includes('WARN')) emoji = '🛡️';
      else if (actionUpper.includes('COMMAND')) emoji = '🤖';

      return `${emoji} **${action}** • ${userName} • <t:${Math.floor(a.createdAt.getTime() / 1000)}:R>`;
    }));

    // Generate Pie Chart
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    const chartUrl = createPieChart(labels, data, 'Activity Distribution');

    const embed = createCoolEmbed({
      title: targetUser ? `📋 Activity Log: ${targetUser.username}` : '📋 Recent Activity Log',
      description: activityList.join('\n'),
      color: '#5865F2',
      image: chartUrl,
      author: {
        name: `${interaction.guild.name} Logs`,
        iconURL: interaction.guild.iconURL({ dynamic: true }) || null
      }
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
