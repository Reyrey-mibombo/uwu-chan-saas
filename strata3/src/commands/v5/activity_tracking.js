const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_tracking')
    .setDescription('Track activity for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({ guildId, userId, createdAt: { $gte: thirtyDaysAgo } });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const shifts = activities.filter(a => a.type === 'shift').length;

    const user = await User.findOne({ userId });
    const staffData = user?.staff || { points: 0, warnings: 0, shiftTime: 0 };

    const embed = new EmbedBuilder()
      .setTitle(`📈 Activity Tracking: ${targetUser.username}`)
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Messages (30d)', value: messages.toString(), inline: true },
        { name: 'Commands (30d)', value: commands.toString(), inline: true },
        { name: 'Shifts (30d)', value: shifts.toString(), inline: true },
        { name: 'Staff Points', value: staffData.points.toString(), inline: true },
        { name: 'Warnings', value: staffData.warnings.toString(), inline: true },
        { name: 'Total Shift Time', value: `${Math.round(staffData.shiftTime / 60)}h`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
