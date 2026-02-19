const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_log')
    .setDescription('View recent activity log')
    .addIntegerOption(option => 
      option.setName('limit')
        .setDescription('Number of entries to show')
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const activities = await Activity.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (activities.length === 0) {
      return interaction.reply({ content: 'No activity recorded yet.', ephemeral: true });
    }

    const formatActivity = (a) => {
      const user = a.userId ? `<@${a.userId}>` : 'System';
      const timeAgo = getTimeAgo(a.createdAt);
      
      switch(a.type) {
        case 'shift':
          return a.data?.action === 'start' 
            ? `🟢 **Shift Started** by ${user} (${timeAgo})`
            : `🔴 **Shift Ended** by ${user} (${timeAgo})`;
        case 'warning':
          return `⚠️ **Warning** for ${user}: ${a.data?.reason || 'No reason'} (${timeAgo})`;
        case 'command':
          return `⚡ **Command** by ${user}: ${a.data?.action || 'Unknown'} (${timeAgo})`;
        case 'message':
          return `💬 **Message** by ${user} (${timeAgo})`;
        default:
          return `📝 **Activity** by ${user} (${timeAgo})`;
      }
    };

    const embed = new EmbedBuilder()
      .setTitle('📋 Recent Activity Log')
      .setColor(0x2ecc71)
      .setDescription(activities.map(formatActivity).join('\n'))
      .setFooter({ text: `Showing last ${activities.length} entries` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
