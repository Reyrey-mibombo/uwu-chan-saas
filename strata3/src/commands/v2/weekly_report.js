const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_report')
    .setDescription('View weekly activity report'),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: weekAgo }
    });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const shifts = activities.filter(a => a.type === 'shift').length;
    const uniqueUsers = new Set(activities.map(a => a.userId)).size;
    const staffCount = await User.countDocuments({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } });

    const topStaff = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(3);

    const embed = new EmbedBuilder()
      .setTitle('📈 Weekly Report')
      .setColor(0x9b59b6)
      .addFields(
        { name: '💬 Messages', value: messages.toLocaleString(), inline: true },
        { name: '⚡ Commands', value: commands.toLocaleString(), inline: true },
        { name: '⏱️ Shifts', value: shifts.toString(), inline: true },
        { name: '👥 Active Users', value: uniqueUsers.toString(), inline: true },
        { name: '👤 Staff', value: staffCount.toString(), inline: true }
      );

    if (topStaff.length > 0) {
      const topList = topStaff.map((u, i) => `${i+1}. <@${u.userId}> - ${u.staff.points} pts`).join('\n');
      embed.addFields({ name: '🏆 Top Staff', value: topList, inline: false });
    }

    embed.setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
