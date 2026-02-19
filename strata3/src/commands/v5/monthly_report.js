const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_report')
    .setDescription('View monthly report')
    .addIntegerOption(opt => opt.setName('months').setDescription('Number of months back').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const months = interaction.options.getInteger('months') || 1;
    const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const shifts = activities.filter(a => a.type === 'shift').length;
    const warnings = activities.filter(a => a.type === 'warning').length;
    const uniqueUsers = new Set(activities.map(a => a.userId)).size;

    const monthlyData = {};
    activities.forEach(a => {
      const monthKey = a.createdAt.toISOString().slice(0, 7);
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    const sortedMonths = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0]));

    const embed = new EmbedBuilder()
      .setTitle('📅 Monthly Report')
      .setColor(0x3498db)
      .addFields(
        { name: 'Messages', value: messages.toLocaleString(), inline: true },
        { name: 'Commands', value: commands.toLocaleString(), inline: true },
        { name: 'Shifts', value: shifts.toString(), inline: true },
        { name: 'Warnings', value: warnings.toString(), inline: true },
        { name: 'Active Users', value: uniqueUsers.toString(), inline: true },
        { name: 'Period', value: `${months} month(s)`, inline: true }
      )
      .setDescription(sortedMonths.map(([month, count]) => `${month}: ${count} activities`).join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
