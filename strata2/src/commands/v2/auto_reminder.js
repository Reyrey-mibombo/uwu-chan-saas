const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift, User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_reminder')
    .setDescription('Configure or view auto-reminders')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'View Upcoming Shifts', value: 'view' },
          { name: 'Check Reminders', value: 'reminders' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const action = interaction.options.getString('action') || 'view';

    if (action === 'view') {
      const upcomingShifts = await Shift.find({
        guildId,
        startTime: { $gte: new Date() }
      })
        .sort({ startTime: 1 })
        .limit(10);

      if (upcomingShifts.length === 0) {
        return interaction.reply({ 
          content: 'No upcoming shifts scheduled.',
          ephemeral: true 
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 Upcoming Shifts')
        .setColor(0x3498db)
        .setDescription('Scheduled shifts in the next 7 days');

      const shiftList = upcomingShifts.map(shift => {
        const date = new Date(shift.startTime).toLocaleString();
        return `⏰ <@${shift.userId}> - ${date}`;
      });

      embed.addFields({ name: 'Shifts', value: shiftList.join('\n') });
      embed.setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activeShifts = await Shift.countDocuments({
      guildId,
      endTime: null
    });

    const completedShifts = await Shift.countDocuments({
      guildId,
      endTime: { $gte: weekAgo }
    });

    const reminderStats = await Activity.countDocuments({
      guildId,
      type: 'shift',
      'data.reminder': true,
      createdAt: { $gte: weekAgo }
    });

    const staffWithShifts = await User.countDocuments({
      'guilds.guildId': guildId,
      'staff.shiftTime': { $gt: 0 }
    });

    const embed = new EmbedBuilder()
      .setTitle('🔔 Auto-Reminder Status')
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Active Shifts', value: activeShifts.toString(), inline: true },
        { name: 'Completed (7d)', value: completedShifts.toString(), inline: true },
        { name: 'Reminders Sent', value: reminderStats.toString(), inline: true },
        { name: 'Active Staff', value: staffWithShifts.toString(), inline: true }
      )
      .setDescription('Auto-reminders are enabled for shift start/end times.')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
