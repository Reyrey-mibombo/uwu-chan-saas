const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { createPieChart } = require('../../utils/charts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_log')
    .setDescription('View a detailed visual log of recent server activity')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries (max 50)').setRequired(false))
    .addUserOption(opt => opt.setName('user').setDescription('Filter activity to a specific user').setRequired(false)),

  async execute(interaction, client) {
    try {
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

      if (!activities || activities.length === 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_activity_log').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('No activity recorded yet for these filters.')], components: [row] });
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
        let emoji = '📜';
        if (actionUpper.includes('MESSAGE')) emoji = '💬';
        else if (actionUpper.includes('JOIN')) emoji = '📥';
        else if (actionUpper.includes('SHIFT')) emoji = '⏱️';
        else if (actionUpper.includes('MOD') || actionUpper.includes('WARN')) emoji = '🛡️';
        else if (actionUpper.includes('COMMAND')) emoji = '⚙️';

        return `${emoji} **${action}** � ${userName} � <t:${Math.floor(new Date(a.createdAt).getTime() / 1000)}:R>`;
      }));

      // Generate Pie Chart
      const labels = Object.keys(typeCounts);
      const data = Object.values(typeCounts);
      const chartUrl = createPieChart(labels, data, 'Activity Partitioning');

      const embed = await createCustomEmbed(interaction, {
        title: targetUser ? `📖 User Dossier: ${targetUser.username}` : '📋 Operational Activity Log',
        description: activityList.join('\n'),
        image: chartUrl,
        author: {
          name: `${interaction.guild.name} Operations`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        },
        footer: `Displaying last ${activities.length} internal events`
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('activity_filter_all').setLabel('🌐 All Activity').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('activity_filter_staff').setLabel('👔 Staff Only').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('activity_filter_mod').setLabel('🛡️ Mod Only').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('auto_v1_activity_log').setLabel('🔄 Sync').setStyle(ButtonStyle.Secondary)
      );
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the activity log.');
      if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_activity_log').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleActivityFilters(interaction, client) {
    const { customId, guildId } = interaction;
    await interaction.deferUpdate();

    const Activity = require('../../database/mongo').Activity;
    let query = { guildId };

    if (customId === 'activity_filter_staff') {
      query.type = { $in: ['shift_start', 'shift_end', 'promotion', 'demote', 'points_add', 'points_remove'] };
    } else if (customId === 'activity_filter_mod') {
      query.type = { $in: ['warn', 'mute', 'kick', 'ban', 'unmute', 'unban'] };
    }

    const activities = await Activity.find(query).sort({ createdAt: -1 }).limit(10);

    // Using simple formatting for the refresh update
    const activityList = await Promise.all(activities.map(async (a) => {
      const user = await client.users.fetch(a.userId).catch(() => null);
      return `• **${a.type.toUpperCase()}**  ${user?.username || 'Unknown'}  <t:${Math.floor(new Date(a.createdAt).getTime() / 1000)}:R>`;
    }));

    const embed = await createCustomEmbed(interaction, {
      title: `📋 Filtered Activity: ${customId.split('_').pop().toUpperCase()}`,
      description: activityList.join('\n') || 'No activity found for this filter.',
      color: 'info'
    });

    await interaction.editReply({ embeds: [embed] });
  }
};


