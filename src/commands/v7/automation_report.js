const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_report')
    .setDescription('View a summary of all automated actions taken this month'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [activities, warnings] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
      Warning.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean()
    ]);

    const promotions = activities.filter(a => a.type === 'promotion').length;
    const shifts = activities.filter(a => a.type === 'shift').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const autoWarnings = warnings.filter(w => w.moderatorId === 'auto').length;

    // Simulated: group by week
    const weeks = [0, 0, 0, 0];
    activities.forEach(a => {
      const daysAgo = (Date.now() - new Date(a.createdAt).getTime()) / 86400000;
      const weekIdx = Math.min(3, Math.floor(daysAgo / 7));
      weeks[weekIdx]++;
    });
    const weekText = weeks.map((c, i) => `Week ${4 - i}: **${c}** events`).reverse().join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📋 Automation Report — Last 30 Days')
      .setColor(0x9b59b6)
      .addFields(
        { name: '⬆️ Promotions', value: promotions.toString(), inline: true },
        { name: '🔄 Shifts Tracked', value: shifts.toString(), inline: true },
        { name: '⚡ Commands Executed', value: commands.toString(), inline: true },
        { name: '🤖 Auto-Warnings', value: autoWarnings.toString(), inline: true },
        { name: '⚠️ Manual Warnings', value: (warnings.length - autoWarnings).toString(), inline: true },
        { name: '📊 Total Events', value: activities.length.toString(), inline: true },
        { name: '📅 Weekly Breakdown', value: weekText }
      )
      .setFooter({ text: `${interaction.guild.name} • Monthly Automation Report` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
