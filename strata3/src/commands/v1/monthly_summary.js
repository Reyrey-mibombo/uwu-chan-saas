const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_summary')
    .setDescription('View monthly activity summary'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: monthAgo }
    });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const uniqueUsers = new Set(activities.map(a => a.userId)).size;
    const staffCount = await User.countDocuments({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } });

    const newMembers = guild.members.cache.filter(m => 
      m.joinedAt && m.joinedAt >= monthAgo
    ).size;

    const embed = new EmbedBuilder()
      .setTitle('📊 Monthly Summary')
      .setColor(0x3498db)
      .setDescription(`Statistics for the last 30 days`)
      .addFields(
        { name: '💬 Messages', value: messages.toLocaleString(), inline: true },
        { name: '⚡ Commands', value: commands.toLocaleString(), inline: true },
        { name: '👥 Active Users', value: uniqueUsers.toString(), inline: true },
        { name: '👢 New Members', value: newMembers.toString(), inline: true },
        { name: '👤 Staff Members', value: staffCount.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
