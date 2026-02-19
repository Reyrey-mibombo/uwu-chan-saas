const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_summary')
    .setDescription('Get daily activity summary'),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const guild = interaction.guild;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activities = await Activity.find({
      guildId,
      createdAt: { $gte: today }
    });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const shifts = activities.filter(a => a.type === 'shift' && a.data?.action === 'start').length;
    
    const uniqueUsers = new Set(activities.map(a => a.userId)).size;
    const staffCount = await User.countDocuments({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } });

    const newMembers = guild.members.cache.filter(m => 
      m.joinedAt && m.joinedAt >= today
    ).size;

    const embed = new EmbedBuilder()
      .setTitle('📊 Daily Summary')
      .setColor(0x3498db)
      .setDescription(`Statistics for ${today.toDateString()}`)
      .addFields(
        { name: '💬 Messages', value: messages.toString(), inline: true },
        { name: '⚡ Commands', value: commands.toString(), inline: true },
        { name: '👥 Active Users', value: uniqueUsers.toString(), inline: true },
        { name: '👢 New Members', value: newMembers.toString(), inline: true },
        { name: '⏱️ Shifts Started', value: shifts.toString(), inline: true },
        { name: '👤 Staff Members', value: staffCount.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
