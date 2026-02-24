const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild, Warning, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_suggestions')
    .setDescription('Get AI-driven automation suggestions based on server data'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [guild, warnings, stuckShifts] = await Promise.all([
      Guild.findOne({ guildId }).lean(),
      Warning.countDocuments({ guildId, createdAt: { $gte: thirtyDaysAgo } }),
      Shift.countDocuments({ guildId, endTime: null, startTime: { $lte: new Date(Date.now() - 4 * 3600000) } })
    ]);

    const settings = guild?.settings?.modules || {};
    const stats = guild?.stats || {};
    const suggestions = [];

    if (!settings.moderation && warnings > 5)
      suggestions.push({ name: '🛡️ Enable Auto-Moderation', value: 'You have 5+ warnings this month. Auto-moderation can handle repeated offenders automatically.' });
    if (!settings.automation)
      suggestions.push({ name: '⚙️ Enable Automation Module', value: 'Automation can handle shift reminders, rank-ups, and reward distributions without manual effort.' });
    if (stuckShifts > 0)
      suggestions.push({ name: '⏰ Set Shift Auto-End', value: `${stuckShifts} shift(s) are currently stuck. Consider auto-ending shifts after 8 hours of inactivity.` });
    if (!settings.tickets && stats.commandsUsed > 100)
      suggestions.push({ name: '🎫 Enable Ticket System', value: 'High command usage detected. A ticket system can reduce repetitive support interactions.' });
    if (suggestions.length === 0)
      suggestions.push({ name: '✅ Everything Looks Good!', value: 'Your server automation is well-configured. Keep monitoring your trends.' });

    const embed = new EmbedBuilder()
      .setTitle('🤖 Automation Suggestions')
      .setColor(0x3498db)
      .setDescription('Based on your server\'s data, here are the top recommendations:')
      .addFields(suggestions)
      .addFields(
        { name: '📊 Warnings (30d)', value: warnings.toString(), inline: true },
        { name: '🕐 Stuck Shifts', value: stuckShifts.toString(), inline: true },
        { name: '⚡ Commands Used', value: (stats.commandsUsed || 0).toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • AI Suggestions` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
