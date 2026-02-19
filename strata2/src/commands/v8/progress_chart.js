const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_chart')
    .setDescription('View progress chart over time')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)'))
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to show (default 7)').setMinValue(1).setMaxValue(30)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const days = interaction.options.getInteger('days') || 7;
    const guildId = interaction.guild.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = { guildId, type: { $in: ['command', 'message', 'shift'] }, createdAt: { $gte: startDate } };
    if (targetUser) query.userId = targetUser.id;

    const activities = await Activity.find(query).sort({ createdAt: 1 });

    const grouped = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      grouped[key] = { commands: 0, messages: 0, shifts: 0, total: 0 };
    }

    activities.forEach(a => {
      const key = a.createdAt.toISOString().split('T')[0];
      if (grouped[key]) {
        grouped[key][a.type === 'command' ? 'commands' : a.type === 'message' ? 'messages' : 'shifts']++;
        grouped[key].total++;
      }
    });

    const dataPoints = Object.entries(grouped);
    const maxVal = Math.max(...dataPoints.map(([, v]) => v.total), 1);
    const chartLines = dataPoints.map(([date, val]) => {
      const bar = '▓'.repeat(Math.ceil((val.total / maxVal) * 10));
      return `${date.slice(5)} | ${bar.padEnd(10)} cmds:${val.commands} msg:${val.messages}`;
    }).join('\n');

    const totals = { commands: 0, messages: 0, shifts: 0 };
    activities.forEach(a => {
      if (a.type === 'command') totals.commands++;
      else if (a.type === 'message') totals.messages++;
      else if (a.type === 'shift') totals.shifts++;
    });

    const embed = new EmbedBuilder()
      .setTitle('📊 Progress Chart')
      .setColor(0x2ecc71)
      .setDescription(`\`\`\`\n${chartLines}\n\`\`\``)
      .addFields(
        { name: 'Period', value: `Last ${days} days`, inline: true },
        { name: 'Commands', value: `${totals.commands}`, inline: true },
        { name: 'Messages', value: `${totals.messages}`, inline: true },
        { name: 'Shifts', value: `${totals.shifts}`, inline: true },
        { name: 'Total', value: `${activities.length}`, inline: true }
      );

    if (targetUser) {
      embed.setDescription(`Progress chart for: **${targetUser.username}**`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
