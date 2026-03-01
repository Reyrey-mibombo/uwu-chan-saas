const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('analytics_dashboard')
    .setDescription('Unified Executive Command Center for macroscopic analytics'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const guild = interaction.guild;

      const guildDoc = await Guild.findOne({ guildId }).lean();
      const isPremium = guildDoc?.premium?.isActive || true; // Overriding check for development as requested

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [weekActivities, monthActivities, totalUsers] = await Promise.all([
        Activity.find({ guildId, createdAt: { $gte: weekAgo } }).lean(),
        Activity.find({ guildId, createdAt: { $gte: monthAgo } }).lean(),
        User.countDocuments({ guildId })
      ]);

      const processStats = (activities) => ({
        messages: activities.filter(a => a.type === 'message').length,
        commands: activities.filter(a => a.type === 'command').length,
        active: new Set(activities.map(a => a.userId)).size
      });

      const weekStats = processStats(weekActivities);
      const monthStats = processStats(monthActivities);

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Unified Executive Command Center',
        thumbnail: guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Intelligence Hub\nUnified data orchestration for the **${guild.name}** sector. Synchronizing multi-vector analytics for authorized executives.`,
        fields: [
          { name: '📅 7-Day Trailing Footprint', value: `\`📡 Signals: ${weekStats.messages.toLocaleString()}\` | \`✅ Pings: ${weekStats.commands.toLocaleString()}\` | \`👥 Active: ${weekStats.active}\``, inline: false },
          { name: '⏳ 30-Day Periodic Yield', value: `\`📡 Signals: ${monthStats.messages.toLocaleString()}\` | \`✅ Pings: ${monthStats.commands.toLocaleString()}\``, inline: false },
          { name: '🌐 Global Node Density', value: `\`Total Mapped: ${totalUsers}\``, inline: true },
          { name: '⚖️ Intelligence Tier', value: '`V5 EXECUTIVE (PLATINUM)`', inline: true }
        ],
        footer: 'Executive Data Orchestration • V5 Executive Suite',
        color: 'enterprise'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Analytics Dashboard Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Executive Hub failure: Unable to synchronize macroscopic data streams.')] });
    }
  }
};
